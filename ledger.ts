import type { EconEvent } from "./types";

export type LedgerInsert = {
  id: string;
  date: string;
  description: string;
  amount: number;
  source?: string;
  rawEvent?: unknown;
};

export type LedgerRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  source: string;
  raw_event: string | null;
};

export type ActionRow = {
  id: string;
  type: string;
  payload: string;
  status: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
};

export type ActionQueueItem = {
  id: string;
  type: string;
  status: string;
  ledgerId: string | null;
  decisionAction: string | null;
  executionAction: string | null;
  category: string | null;
  amount: number | null;
  destination: string | null;
  state: string | null;
};

export type ActionQueueSummary = {
  queued: number;
  done: number;
  failed: number;
  unimplemented: number;
};

export type ProcessedEventRow = {
  event_id: string;
  ledger_id: string;
  processed_at: string;
};

export type EconEventRow = {
  id: string;
  timestamp: string;
  payload: string;
};

export type BalanceRow = {
  category: string;
  currency: string;
  net_amount: number;
  inflow_amount: number;
  outflow_amount: number;
  event_count: number;
  updated_at: string;
};

export type CashflowRow = {
  period: string;
  currency: string;
  inflow_amount: number;
  outflow_amount: number;
  net_amount: number;
  event_count: number;
  updated_at: string;
};

export type ReplayRunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  event_count: number;
  status: string;
};

export type WaitlistSignupRow = {
  id: string;
  email: string;
  locale: string;
  source_path: string;
  user_agent: string | null;
  created_at: string;
};

export async function insertLedgerEntry(db: D1Database, entry: LedgerInsert): Promise<LedgerRow> {
  const source = entry.source ?? "manual";
  const rawEvent = entry.rawEvent ? JSON.stringify(entry.rawEvent) : null;

  await db
    .prepare(
      `INSERT INTO ledger (id, date, description, amount, category, source, raw_event)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`,
    )
    .bind(entry.id, entry.date, entry.description, entry.amount, source, rawEvent)
    .run();

  return {
    id: entry.id,
    date: entry.date,
    description: entry.description,
    amount: entry.amount,
    category: null,
    source,
    raw_event: rawEvent,
  };
}

export async function insertEconEvent(db: D1Database, event: EconEvent): Promise<void> {
  await db
    .prepare(
      `INSERT INTO econ_event (
         id, schema_version, event_version, timestamp, source, type, event_class, amount, currency,
         actor, counterparty, description, tags, related_event_ids, causation_id, correlation_id,
         metadata, payload
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      event.id,
      event.schemaVersion,
      event.eventVersion,
      event.timestamp,
      event.source,
      event.type,
      event.eventClass,
      event.amount ?? null,
      event.currency ?? null,
      event.actor ?? null,
      event.counterparty ?? null,
      event.description ?? null,
      JSON.stringify(event.tags),
      JSON.stringify(event.relatedEventIds ?? []),
      event.causationId ?? null,
      event.correlationId ?? null,
      JSON.stringify(event.metadata),
      JSON.stringify(event),
    )
    .run();
}

export async function listEconEvents(
  db: D1Database,
  options: { fromTimestamp?: string } = {},
): Promise<EconEvent[]> {
  const fromTimestamp = options.fromTimestamp;
  const statement = fromTimestamp
    ? db
        .prepare(
          `SELECT id, timestamp, payload
           FROM econ_event
           WHERE timestamp >= ?
           ORDER BY timestamp ASC, id ASC`,
        )
        .bind(fromTimestamp)
    : db.prepare(
        `SELECT id, timestamp, payload
         FROM econ_event
         ORDER BY timestamp ASC, id ASC`,
      );

  const result = fromTimestamp
    ? await statement.all<EconEventRow>()
    : await statement.all<EconEventRow>();

  return result.results.map((row) => JSON.parse(row.payload) as EconEvent);
}

export async function getLedgerEntry(db: D1Database, ledgerId: string): Promise<LedgerRow | null> {
  const result = await db
    .prepare("SELECT id, date, description, amount, category, source, raw_event FROM ledger WHERE id = ?")
    .bind(ledgerId)
    .first<LedgerRow>();

  return result ?? null;
}

export async function updateLedgerCategory(
  db: D1Database,
  ledgerId: string,
  category: string,
): Promise<void> {
  await db.prepare("UPDATE ledger SET category = ? WHERE id = ?").bind(category, ledgerId).run();
}

export async function createAction(
  db: D1Database,
  action: {
    id: string;
    type: string;
    payload: unknown;
    status: string;
    retryCount: number;
    maxRetries: number;
    nextRetryAt: string | null;
  },
): Promise<ActionRow> {
  const payload = JSON.stringify(action.payload);

  await db
    .prepare(
      "INSERT INTO actions (id, type, payload, status, retry_count, max_retries, next_retry_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      action.id,
      action.type,
      payload,
      action.status,
      action.retryCount,
      action.maxRetries,
      action.nextRetryAt,
    )
    .run();

  return {
    id: action.id,
    type: action.type,
    payload,
    status: action.status,
    retry_count: action.retryCount,
    max_retries: action.maxRetries,
    next_retry_at: action.nextRetryAt,
  };
}

export async function updateActionStatus(
  db: D1Database,
  actionId: string,
  status: string,
): Promise<void> {
  await db.prepare("UPDATE actions SET status = ? WHERE id = ?").bind(status, actionId).run();
}

export async function listRecentLedger(db: D1Database, limit = 50): Promise<LedgerRow[]> {
  const { results } = await db
    .prepare(
      "SELECT id, date, description, amount, category, source, raw_event FROM ledger ORDER BY date DESC LIMIT ?",
    )
    .bind(limit)
    .all<LedgerRow>();

  return results;
}

export async function listRecentActions(db: D1Database, limit = 50): Promise<ActionRow[]> {
  const { results } = await db
    .prepare(
      "SELECT id, type, payload, status, retry_count, max_retries, next_retry_at FROM actions ORDER BY rowid DESC LIMIT ?",
    )
    .bind(limit)
    .all<ActionRow>();

  return results;
}

export async function listActionQueue(db: D1Database, limit = 50): Promise<ActionQueueItem[]> {
  const { results } = await db
    .prepare(
      "SELECT id, type, payload, status, retry_count, max_retries, next_retry_at FROM actions ORDER BY rowid DESC LIMIT ?",
    )
    .bind(limit)
    .all<ActionRow>();

  return results.map((row) => {
    const payload = safeParseJson(row.payload);

    return {
      id: row.id,
      type: row.type,
      status: row.status,
      ledgerId: stringOrNull(payload.ledgerId),
      decisionAction: stringOrNull(payload.decisionAction),
      executionAction: stringOrNull(payload.executionAction),
      category: stringOrNull(payload.category),
      amount: numberOrNull(payload.amount),
      destination: stringOrNull(payload.executor?.destination),
      state: stringOrNull(payload.executor?.state),
    };
  });
}

export async function getActionQueueSummary(db: D1Database): Promise<ActionQueueSummary> {
  const { results } = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
         SUM(CASE WHEN status = 'unimplemented' THEN 1 ELSE 0 END) AS unimplemented
       FROM actions`,
    )
    .all<Partial<ActionQueueSummary>>();

  const row = results[0] ?? {};
  return {
    queued: Number(row.queued ?? 0),
    done: Number(row.done ?? 0),
    failed: Number(row.failed ?? 0),
    unimplemented: Number(row.unimplemented ?? 0),
  };
}

export async function listBalances(db: D1Database, limit = 100): Promise<BalanceRow[]> {
  const { results } = await db
    .prepare(
      `SELECT category, currency, net_amount, inflow_amount, outflow_amount, event_count, updated_at
       FROM balances
       ORDER BY ABS(net_amount) DESC, category ASC
       LIMIT ?`,
    )
    .bind(limit)
    .all<BalanceRow>();

  return results;
}

export async function listCashflow(db: D1Database, limit = 24): Promise<CashflowRow[]> {
  const { results } = await db
    .prepare(
      `SELECT period, currency, inflow_amount, outflow_amount, net_amount, event_count, updated_at
       FROM cashflow
       ORDER BY period DESC, currency ASC
       LIMIT ?`,
    )
    .bind(limit)
    .all<CashflowRow>();

  return results;
}

export async function replaceBalances(
  db: D1Database,
  rows: Array<Omit<BalanceRow, "updated_at"> & { updated_at?: string }>,
): Promise<void> {
  await db.prepare("DELETE FROM balances").run();

  for (const row of rows) {
    await db
      .prepare(
        `INSERT INTO balances (category, currency, net_amount, inflow_amount, outflow_amount, event_count, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        row.category,
        row.currency,
        row.net_amount,
        row.inflow_amount,
        row.outflow_amount,
        row.event_count,
        row.updated_at ?? new Date().toISOString(),
      )
      .run();
  }
}

export async function replaceCashflow(
  db: D1Database,
  rows: Array<Omit<CashflowRow, "updated_at"> & { updated_at?: string }>,
): Promise<void> {
  await db.prepare("DELETE FROM cashflow").run();

  for (const row of rows) {
    await db
      .prepare(
        `INSERT INTO cashflow (period, currency, inflow_amount, outflow_amount, net_amount, event_count, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        row.period,
        row.currency,
        row.inflow_amount,
        row.outflow_amount,
        row.net_amount,
        row.event_count,
        row.updated_at ?? new Date().toISOString(),
      )
      .run();
  }
}

export async function listRunnableActions(db: D1Database, limit = 20): Promise<ActionRow[]> {
  const now = new Date().toISOString();
  const { results } = await db
    .prepare(
      `SELECT id, type, payload, status, retry_count, max_retries, next_retry_at
       FROM actions
       WHERE status = 'queued' AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY rowid ASC
       LIMIT ?`,
    )
    .bind(now, limit)
    .all<ActionRow>();

  return results;
}

export async function markActionProcessing(db: D1Database, actionId: string): Promise<void> {
  await db.prepare("UPDATE actions SET status = 'processing' WHERE id = ?").bind(actionId).run();
}

export async function markActionDone(
  db: D1Database,
  actionId: string,
  status: "done" | "ignored",
): Promise<void> {
  await db.prepare("UPDATE actions SET status = ?, next_retry_at = NULL WHERE id = ?").bind(status, actionId).run();
}

export async function markActionFailed(db: D1Database, actionId: string): Promise<void> {
  await db.prepare("UPDATE actions SET status = 'failed' WHERE id = ?").bind(actionId).run();
}

export async function scheduleActionRetry(
  db: D1Database,
  actionId: string,
  retryCount: number,
  maxRetries: number,
): Promise<void> {
  if (retryCount >= maxRetries) {
    await markActionFailed(db, actionId);
    return;
  }

  const nextRetryAt = new Date(Date.now() + retryCount * 60_000).toISOString();
  await db
    .prepare("UPDATE actions SET status = 'queued', retry_count = ?, next_retry_at = ? WHERE id = ?")
    .bind(retryCount, nextRetryAt, actionId)
    .run();
}

export async function getProcessedEvent(
  db: D1Database,
  eventId: string,
): Promise<ProcessedEventRow | null> {
  const result = await db
    .prepare("SELECT event_id, ledger_id, processed_at FROM processed_events WHERE event_id = ?")
    .bind(eventId)
    .first<ProcessedEventRow>();

  return result ?? null;
}

export async function recordProcessedEvent(
  db: D1Database,
  processedEvent: { eventId: string; ledgerId: string; processedAt?: string },
): Promise<void> {
  await db
    .prepare("INSERT INTO processed_events (event_id, ledger_id, processed_at) VALUES (?, ?, ?)")
    .bind(
      processedEvent.eventId,
      processedEvent.ledgerId,
      processedEvent.processedAt ?? new Date().toISOString(),
    )
    .run();
}

export async function beginReplayRun(
  db: D1Database,
  replayRun: { id: string; startedAt: string; status: string },
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO replay_runs (id, started_at, finished_at, event_count, status) VALUES (?, ?, NULL, 0, ?)",
    )
    .bind(replayRun.id, replayRun.startedAt, replayRun.status)
    .run();
}

export async function finishReplayRun(
  db: D1Database,
  replayRun: { id: string; finishedAt: string; eventCount: number; status: string },
): Promise<void> {
  await db
    .prepare(
      "UPDATE replay_runs SET finished_at = ?, event_count = ?, status = ? WHERE id = ?",
    )
    .bind(replayRun.finishedAt, replayRun.eventCount, replayRun.status, replayRun.id)
    .run();
}

export async function listReplayRuns(db: D1Database, limit = 20): Promise<ReplayRunRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, started_at, finished_at, event_count, status
       FROM replay_runs
       ORDER BY started_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<ReplayRunRow>();

  return results;
}

export async function insertWaitlistSignup(
  db: D1Database,
  signup: {
    id: string;
    email: string;
    locale: string;
    sourcePath: string;
    userAgent: string | null;
    createdAt?: string;
  },
): Promise<WaitlistSignupRow> {
  const createdAt = signup.createdAt ?? new Date().toISOString();
  await ensureWaitlistSchema(db);

  await db
    .prepare(
      `INSERT INTO waitlist_signups (id, email, locale, source_path, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(signup.id, signup.email, signup.locale, signup.sourcePath, signup.userAgent, createdAt)
    .run();

  return {
    id: signup.id,
    email: signup.email,
    locale: signup.locale,
    source_path: signup.sourcePath,
    user_agent: signup.userAgent,
    created_at: createdAt,
  };
}

async function ensureWaitlistSchema(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS waitlist_signups (
         id TEXT PRIMARY KEY,
         email TEXT NOT NULL UNIQUE,
         locale TEXT NOT NULL,
         source_path TEXT NOT NULL,
         user_agent TEXT,
         created_at TEXT NOT NULL
       )`,
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created_at ON waitlist_signups(created_at DESC)",
    ),
  ]);
}

export async function resetProjections(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM processed_events"),
    db.prepare("DELETE FROM actions"),
    db.prepare("DELETE FROM ledger"),
    db.prepare("DELETE FROM balances"),
    db.prepare("DELETE FROM cashflow"),
  ]);
}

function safeParseJson(value: string): Record<string, any> {
  try {
    return JSON.parse(value) as Record<string, any>;
  } catch {
    return {};
  }
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}
