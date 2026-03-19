import { processAI, type AiDecision } from "./ai";
import { executeAction } from "./actions";
import { econEventToLedgerInsert } from "./event";
import {
  beginReplayRun,
  finishReplayRun,
  insertLedgerEntry,
  listEconEvents,
  recordProcessedEvent,
  replaceBalances,
  replaceCashflow,
  resetProjections,
  updateLedgerCategory,
  type LedgerRow,
} from "./ledger";
import { applyRuleLayer, type RuleMatch } from "./rules";
import type { EconEvent } from "./types";

type ReplayEnv = {
  DB: D1Database;
  AI?: Ai;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  SLACK_WEBHOOK_URL?: string;
  INTERNAL_ACTION_WEBHOOK?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  TAX_RESERVE_RATE?: string;
  INFRA_ALERT_THRESHOLD?: string;
};

type ReplayOptions = {
  fromTimestamp?: string;
  dryRun: boolean;
};

type ProjectedEvent = {
  event: EconEvent;
  ledger: LedgerRow;
  decision: AiDecision;
  ruleMatch: RuleMatch | null;
};

export type ReplayResult = {
  replayRunId: string | null;
  dryRun: boolean;
  fromTimestamp: string | null;
  eventCount: number;
  progress: string[];
  projections: {
    ledger: number;
    actions: number;
    balances: number;
    cashflow: number;
  };
};

export async function runReplay(env: ReplayEnv, options: ReplayOptions): Promise<ReplayResult> {
  const progress: string[] = [];
  const replayRunId = options.dryRun ? null : crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const fromTimestamp = options.fromTimestamp ?? null;

  if (replayRunId) {
    await beginReplayRun(env.DB, {
      id: replayRunId,
      startedAt,
      status: "running",
    });
  }

  try {
    const events = await listEconEvents(env.DB, { fromTimestamp: options.fromTimestamp });
    progress.push(`loaded ${events.length} econ_event rows`);

    const projectedEvents = await buildProjectedEvents(env, events);
    progress.push(`built ${projectedEvents.length} deterministic decisions`);

    if (!options.dryRun) {
      await resetProjections(env.DB);
      progress.push("reset projections");
    } else {
      progress.push("dry run: projections not reset");
    }

    const ledgerCount = await rebuildLedger(env, projectedEvents, options);
    progress.push(`rebuildLedger applied ${ledgerCount} rows`);

    const actionCount = await rebuildActions(env, projectedEvents, options);
    progress.push(`rebuildActions applied ${actionCount} rows`);

    const balanceCount = await rebuildBalances(env, projectedEvents, options);
    progress.push(`rebuildBalances applied ${balanceCount} rows`);

    const cashflowCount = await rebuildCashflow(env, projectedEvents, options);
    progress.push(`rebuildCashflow applied ${cashflowCount} rows`);

    if (replayRunId) {
      await finishReplayRun(env.DB, {
        id: replayRunId,
        finishedAt: new Date().toISOString(),
        eventCount: events.length,
        status: "completed",
      });
    }

    return {
      replayRunId,
      dryRun: options.dryRun,
      fromTimestamp,
      eventCount: events.length,
      progress,
      projections: {
        ledger: ledgerCount,
        actions: actionCount,
        balances: balanceCount,
        cashflow: cashflowCount,
      },
    };
  } catch (error) {
    if (replayRunId) {
      await finishReplayRun(env.DB, {
        id: replayRunId,
        finishedAt: new Date().toISOString(),
        eventCount: 0,
        status: "failed",
      });
    }
    throw error;
  }
}

export async function refreshReadModels(env: ReplayEnv): Promise<{
  balances: number;
  cashflow: number;
}> {
  const events = await listEconEvents(env.DB);
  const projectedEvents = await buildProjectedEvents(env, events);
  const balances = await rebuildBalances(env, projectedEvents, { dryRun: false });
  const cashflow = await rebuildCashflow(env, projectedEvents, { dryRun: false });
  return { balances, cashflow };
}

export async function rebuildLedger(
  env: ReplayEnv,
  projectedEvents: ProjectedEvent[],
  options: ReplayOptions,
): Promise<number> {
  if (options.dryRun) {
    return projectedEvents.length;
  }

  for (const projected of projectedEvents) {
    await insertLedgerEntry(env.DB, {
      id: projected.ledger.id,
      date: projected.ledger.date,
      description: projected.ledger.description,
      amount: projected.ledger.amount,
      source: projected.ledger.source,
      rawEvent: projected.event,
    });
    await updateLedgerCategory(env.DB, projected.ledger.id, projected.decision.category);
    await recordProcessedEvent(env.DB, {
      eventId: projected.event.id,
      ledgerId: projected.ledger.id,
      processedAt: projected.event.timestamp,
    });
  }

  return projectedEvents.length;
}

export async function rebuildActions(
  env: ReplayEnv,
  projectedEvents: ProjectedEvent[],
  options: ReplayOptions,
): Promise<number> {
  let count = 0;

  for (const projected of projectedEvents) {
    if (projected.decision.decisionAction === "none") {
      continue;
    }

    count += 1;
    if (!options.dryRun) {
      await executeAction(env, projected.ledger, projected.decision);
    }
  }

  return count;
}

export async function rebuildBalances(
  env: ReplayEnv,
  projectedEvents: ProjectedEvent[],
  options: ReplayOptions,
): Promise<number> {
  const rows = new Map<
    string,
    {
      category: string;
      currency: string;
      net_amount: number;
      inflow_amount: number;
      outflow_amount: number;
      event_count: number;
    }
  >();

  for (const projected of projectedEvents) {
    if (!Number.isFinite(projected.ledger.amount)) {
      continue;
    }

    const currency = projected.event.currency ?? "UNKNOWN";
    const category = projected.decision.category;
    const key = `${category}:${currency}`;
    const existing =
      rows.get(key) ?? {
        category,
        currency,
        net_amount: 0,
        inflow_amount: 0,
        outflow_amount: 0,
        event_count: 0,
      };

    existing.net_amount += projected.ledger.amount;
    if (projected.ledger.amount >= 0) {
      existing.inflow_amount += projected.ledger.amount;
    } else {
      existing.outflow_amount += Math.abs(projected.ledger.amount);
    }
    existing.event_count += 1;
    rows.set(key, existing);
  }

  const payload = [...rows.values()];
  if (!options.dryRun) {
    await replaceBalances(env.DB, payload);
  }

  return payload.length;
}

export async function rebuildCashflow(
  env: ReplayEnv,
  projectedEvents: ProjectedEvent[],
  options: ReplayOptions,
): Promise<number> {
  const rows = new Map<
    string,
    {
      period: string;
      currency: string;
      inflow_amount: number;
      outflow_amount: number;
      net_amount: number;
      event_count: number;
    }
  >();

  for (const projected of projectedEvents) {
    if (!Number.isFinite(projected.ledger.amount)) {
      continue;
    }

    const period = projected.event.timestamp.slice(0, 7);
    const currency = projected.event.currency ?? "UNKNOWN";
    const key = `${period}:${currency}`;
    const existing =
      rows.get(key) ?? {
        period,
        currency,
        inflow_amount: 0,
        outflow_amount: 0,
        net_amount: 0,
        event_count: 0,
      };

    existing.net_amount += projected.ledger.amount;
    if (projected.ledger.amount >= 0) {
      existing.inflow_amount += projected.ledger.amount;
    } else {
      existing.outflow_amount += Math.abs(projected.ledger.amount);
    }
    existing.event_count += 1;
    rows.set(key, existing);
  }

  const payload = [...rows.values()];
  if (!options.dryRun) {
    await replaceCashflow(env.DB, payload);
  }

  return payload.length;
}

async function buildProjectedEvents(env: ReplayEnv, events: EconEvent[]): Promise<ProjectedEvent[]> {
  const projectedEvents: ProjectedEvent[] = [];

  for (const event of events) {
    const ledgerInsert = econEventToLedgerInsert(event);
    const ledger: LedgerRow = {
      id: ledgerInsert.id,
      date: ledgerInsert.date,
      description: ledgerInsert.description,
      amount: ledgerInsert.amount,
      category: null,
      source: ledgerInsert.source ?? "manual",
      raw_event: JSON.stringify(event),
    };
    const ruleMatch = applyRuleLayer(ledger);
    const decision = ruleMatch?.decision ?? (await processAI(env, ledger, { deterministic: true }));
    projectedEvents.push({
      event,
      ledger: {
        ...ledger,
        category: decision.category,
      },
      decision,
      ruleMatch: ruleMatch ?? null,
    });
  }

  return projectedEvents;
}
