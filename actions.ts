import type { AiDecision, DecisionAction } from "./ai";
import {
  createAction,
  listRunnableActions,
  markActionDone,
  markActionFailed,
  markActionProcessing,
  scheduleActionRetry,
  type ActionRow,
  type LedgerRow,
} from "./ledger";

export type ActionType =
  | "invoice"
  | "reserve_tax"
  | "alert_cost_increase"
  | "alert_cash_outflow"
  | "notify_slack";

export type ExecutionActionType =
  | "invoice.create"
  | "treasury.reserve_tax"
  | "alert.cost_increase.record"
  | "alert.cash_outflow.record"
  | "notify.slack.send";

export type ExecutorDestination = "internal_webhook" | "slack_webhook" | "action_queue";
export type ExecutorState = "implemented" | "stub" | "unimplemented";
export type ExecutorStatus = "done" | "queued" | "processing" | "ignored" | "failed" | "unimplemented";

type EnvLike = {
  DB: D1Database;
  SLACK_WEBHOOK_URL?: string;
  INTERNAL_ACTION_WEBHOOK?: string;
  TAX_RESERVE_RATE?: string;
};

type ExecutorPayload = {
  ledgerId: string;
  category: string;
  decisionAction: Exclude<DecisionAction, "none">;
  executionAction: ExecutionActionType;
  description: string;
  amount: number;
  reason: string | null;
  executor: {
    destination: ExecutorDestination;
    state: ExecutorState;
    unimplemented: string[];
  };
};

type ExecutorContext = {
  env: EnvLike;
  tx: LedgerRow | null;
  payload: ExecutorPayload;
  actionId: string;
};

export type ActionExecutorDefinition = {
  decisionAction: Exclude<DecisionAction, "none">;
  executionAction: ExecutionActionType;
  destination: ExecutorDestination;
  state: ExecutorState;
  summary: string;
  requires?: string[];
  unimplemented?: string[];
  run: (context: ExecutorContext) => Promise<ExecutorStatus>;
};

const actionExecutors: Record<ActionType, ActionExecutorDefinition> = {
  invoice: {
    decisionAction: "invoice",
    executionAction: "invoice.create",
    destination: "internal_webhook",
    state: "stub",
    summary: "Forward invoice creation requests to an internal executor webhook.",
    requires: ["INTERNAL_ACTION_WEBHOOK"],
    unimplemented: [
      "Direct invoice system integration is not implemented.",
      "Delivery confirmation from the downstream billing tool is not persisted.",
    ],
    run: ({ env, payload, tx, actionId }) => sendInvoice(env, payload, tx, actionId),
  },
  reserve_tax: {
    decisionAction: "reserve_tax",
    executionAction: "treasury.reserve_tax",
    destination: "internal_webhook",
    state: "stub",
    summary: "Compute reserve amount and optionally forward it to an internal executor webhook.",
    requires: ["TAX_RESERVE_RATE"],
    unimplemented: [
      "Actual fund movement is not implemented.",
      "Reserve ledger booking is not implemented.",
    ],
    run: ({ env, payload, actionId }) => reserveTax(env, payload, actionId),
  },
  alert_cost_increase: {
    decisionAction: "alert_cost_increase",
    executionAction: "alert.cost_increase.record",
    destination: "action_queue",
    state: "implemented",
    summary: "Persist cost increase alerts to the actions queue and optionally fan out to Slack.",
    requires: ["SLACK_WEBHOOK_URL"],
    unimplemented: ["No secondary escalation channel beyond Slack/action queue."],
    run: ({ env, payload, actionId }) => sendSlack(env, payload, actionId),
  },
  alert_cash_outflow: {
    decisionAction: "alert_cash_outflow",
    executionAction: "alert.cash_outflow.record",
    destination: "action_queue",
    state: "implemented",
    summary: "Persist cash outflow alerts to the actions queue and optionally fan out to Slack.",
    requires: ["SLACK_WEBHOOK_URL"],
    unimplemented: ["No treasury approval flow is implemented."],
    run: ({ env, payload, actionId }) => sendSlack(env, payload, actionId),
  },
  notify_slack: {
    decisionAction: "notify_slack",
    executionAction: "notify.slack.send",
    destination: "slack_webhook",
    state: "implemented",
    summary: "Send a generic notification to Slack when configured, otherwise leave it queued.",
    requires: ["SLACK_WEBHOOK_URL"],
    unimplemented: ["Slack is the only direct notification sink currently implemented."],
    run: ({ env, payload, actionId }) => sendSlack(env, payload, actionId),
  },
};

export function listActionExecutors(): Omit<ActionExecutorDefinition, "run">[] {
  return Object.values(actionExecutors).map(({ run: _run, ...definition }) => definition);
}

export async function executeAction(
  env: EnvLike,
  tx: LedgerRow,
  decision: AiDecision,
): Promise<ActionRow | null> {
  if (!decision.decisionAction || decision.decisionAction === "none") {
    return null;
  }

  const executor = actionExecutors[decision.decisionAction as ActionType];
  if (!executor) {
    return createAction(env.DB, {
      id: crypto.randomUUID(),
      type: "unimplemented",
      payload: {
        ledgerId: tx.id,
        category: decision.category,
        decisionAction: decision.decisionAction,
        description: tx.description,
        amount: tx.amount,
        reason: decision.reason ?? null,
      },
      status: "unimplemented",
      retryCount: 0,
      maxRetries: 0,
      nextRetryAt: null,
    });
  }

  return createAction(env.DB, {
    id: crypto.randomUUID(),
    type: executor.executionAction,
    payload: {
      ledgerId: tx.id,
      category: decision.category,
      decisionAction: decision.decisionAction,
      executionAction: executor.executionAction,
      description: tx.description,
      amount: tx.amount,
      reason: decision.reason ?? null,
      executor: {
        destination: executor.destination,
        state: executor.state,
        unimplemented: executor.unimplemented ?? [],
      },
    },
    status: "queued",
    retryCount: 0,
    maxRetries: 3,
    nextRetryAt: new Date().toISOString(),
  });
}

export async function processQueuedActions(
  env: EnvLike,
  actions: ActionRow[],
  ledgerLookup: (ledgerId: string) => Promise<LedgerRow | null>,
): Promise<Array<{ id: string; type: string; status: ExecutorStatus }>> {
  const results: Array<{ id: string; type: string; status: ExecutorStatus }> = [];

  for (const action of actions) {
    const payload = parseExecutorPayload(action.payload);
    const executor = Object.values(actionExecutors).find(
      (definition) => definition.executionAction === action.type,
    );

    if (!executor || !payload) {
      await markActionFailed(env.DB, action.id);
      results.push({ id: action.id, type: action.type, status: "failed" });
      continue;
    }

    await markActionProcessing(env.DB, action.id);

    try {
      const tx = await ledgerLookup(payload.ledgerId);
      const status = await executor.run({
        env,
        tx,
        payload,
        actionId: action.id,
      });

      if (status === "done" || status === "ignored" || status === "unimplemented") {
        await markActionDone(env.DB, action.id, status === "ignored" ? "ignored" : "done");
      } else if (status === "queued") {
        await scheduleActionRetry(env.DB, action.id, action.retry_count + 1, action.max_retries);
      } else {
        await markActionFailed(env.DB, action.id);
      }

      results.push({ id: action.id, type: action.type, status });
    } catch {
      if (action.retry_count + 1 >= action.max_retries) {
        await markActionFailed(env.DB, action.id);
        results.push({ id: action.id, type: action.type, status: "failed" });
      } else {
        await scheduleActionRetry(env.DB, action.id, action.retry_count + 1, action.max_retries);
        results.push({ id: action.id, type: action.type, status: "queued" });
      }
    }
  }

  return results;
}

export async function fetchRunnableActions(env: EnvLike, limit: number): Promise<ActionRow[]> {
  return listRunnableActions(env.DB, limit);
}

function parseExecutorPayload(payload: string): ExecutorPayload | null {
  try {
    return JSON.parse(payload) as ExecutorPayload;
  } catch {
    return null;
  }
}

async function sendInvoice(
  env: EnvLike,
  payload: ExecutorPayload,
  tx: LedgerRow | null,
  _actionId: string,
): Promise<ExecutorStatus> {
  if (!env.INTERNAL_ACTION_WEBHOOK) {
    return "queued";
  }

  await fetch(env.INTERNAL_ACTION_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "invoice.create",
      ledgerId: payload.ledgerId,
      amount: payload.amount,
      description: payload.description,
      date: tx?.date ?? null,
    }),
  });

  return "done";
}

async function reserveTax(
  env: EnvLike,
  payload: ExecutorPayload,
  _actionId: string,
): Promise<ExecutorStatus> {
  const rate = Number(env.TAX_RESERVE_RATE ?? "0.30");
  const reserveAmount = Math.max(payload.amount, 0) * rate;

  if (!env.INTERNAL_ACTION_WEBHOOK) {
    return "queued";
  }

  await fetch(env.INTERNAL_ACTION_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "treasury.reserve_tax",
      ledgerId: payload.ledgerId,
      reserveAmount,
      originalAmount: payload.amount,
    }),
  });

  return "done";
}

async function sendSlack(
  env: EnvLike,
  payload: ExecutorPayload,
  _actionId: string,
): Promise<ExecutorStatus> {
  if (!env.SLACK_WEBHOOK_URL) {
    return "queued";
  }

  await fetch(env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: [
        `[nonui-cfo] ${payload.decisionAction}`,
        `category=${payload.category}`,
        `amount=${payload.amount}`,
        `description=${payload.description}`,
      ].join("\n"),
    }),
  });

  return "done";
}
