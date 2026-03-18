import type { AiDecision } from "./ai";
import { createAction, updateActionStatus, type LedgerRow, type ActionRow } from "./ledger";

export type ActionType =
  | "invoice"
  | "reserve_tax"
  | "alert_cost_increase"
  | "alert_cash_outflow"
  | "notify_slack";

export type ExecutorDestination = "internal_webhook" | "slack_webhook" | "action_queue";
export type ExecutorState = "implemented" | "stub" | "unimplemented";
export type ExecutorStatus = "done" | "queued" | "ignored" | "failed" | "unimplemented";

type EnvLike = {
  DB: D1Database;
  SLACK_WEBHOOK_URL?: string;
  INTERNAL_ACTION_WEBHOOK?: string;
  TAX_RESERVE_RATE?: string;
};

type ExecutorContext = {
  env: EnvLike;
  tx: LedgerRow;
  decision: AiDecision;
  actionId: string;
};

export type ActionExecutorDefinition = {
  type: ActionType;
  destination: ExecutorDestination;
  state: ExecutorState;
  summary: string;
  requires?: string[];
  unimplemented?: string[];
  run: (context: ExecutorContext) => Promise<ExecutorStatus>;
};

const actionExecutors: Record<ActionType, ActionExecutorDefinition> = {
  invoice: {
    type: "invoice",
    destination: "internal_webhook",
    state: "stub",
    summary: "Forward invoice creation requests to an internal executor webhook.",
    requires: ["INTERNAL_ACTION_WEBHOOK"],
    unimplemented: [
      "Direct invoice system integration is not implemented.",
      "Delivery confirmation from the downstream billing tool is not persisted.",
    ],
    run: ({ env, tx, actionId }) => sendInvoice(env, tx, actionId),
  },
  reserve_tax: {
    type: "reserve_tax",
    destination: "internal_webhook",
    state: "stub",
    summary: "Compute reserve amount and optionally forward it to an internal executor webhook.",
    requires: ["TAX_RESERVE_RATE"],
    unimplemented: [
      "Actual fund movement is not implemented.",
      "Reserve ledger booking is not implemented.",
    ],
    run: ({ env, tx, actionId }) => reserveTax(env, tx, actionId),
  },
  alert_cost_increase: {
    type: "alert_cost_increase",
    destination: "action_queue",
    state: "implemented",
    summary: "Persist cost increase alerts to the actions queue and optionally fan out to Slack.",
    requires: ["SLACK_WEBHOOK_URL"],
    unimplemented: ["No secondary escalation channel beyond Slack/action queue."],
    run: ({ env, tx, decision, actionId }) => sendSlack(env, tx, decision, actionId),
  },
  alert_cash_outflow: {
    type: "alert_cash_outflow",
    destination: "action_queue",
    state: "implemented",
    summary: "Persist cash outflow alerts to the actions queue and optionally fan out to Slack.",
    requires: ["SLACK_WEBHOOK_URL"],
    unimplemented: ["No treasury approval flow is implemented."],
    run: ({ env, tx, decision, actionId }) => sendSlack(env, tx, decision, actionId),
  },
  notify_slack: {
    type: "notify_slack",
    destination: "slack_webhook",
    state: "implemented",
    summary: "Send a generic notification to Slack when configured, otherwise leave it queued.",
    requires: ["SLACK_WEBHOOK_URL"],
    unimplemented: ["Slack is the only direct notification sink currently implemented."],
    run: ({ env, tx, decision, actionId }) => sendSlack(env, tx, decision, actionId),
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
  if (!decision.action || decision.action === "none") {
    return null;
  }

  const executor = actionExecutors[decision.action as ActionType];
  if (!executor) {
    const action = await createAction(env.DB, {
      id: crypto.randomUUID(),
      type: decision.action,
      payload: {
        ledgerId: tx.id,
        category: decision.category,
        description: tx.description,
        amount: tx.amount,
        reason: decision.reason ?? null,
      },
      status: "unimplemented",
    });

    return action;
  }

  const action = await createAction(env.DB, {
    id: crypto.randomUUID(),
    type: decision.action,
    payload: {
      ledgerId: tx.id,
      category: decision.category,
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
  });

  try {
    const finalStatus = await executor.run({
      env,
      tx,
      decision,
      actionId: action.id,
    });

    return {
      ...action,
      status: finalStatus,
    };
  } catch (error) {
    await updateActionStatus(env.DB, action.id, "failed");
    throw error;
  }
}

async function sendInvoice(env: EnvLike, tx: LedgerRow, actionId: string): Promise<ExecutorStatus> {
  if (!env.INTERNAL_ACTION_WEBHOOK) {
    await updateActionStatus(env.DB, actionId, "queued");
    return "queued";
  }

  await fetch(env.INTERNAL_ACTION_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "invoice",
      ledgerId: tx.id,
      amount: tx.amount,
      description: tx.description,
      date: tx.date,
    }),
  });

  await updateActionStatus(env.DB, actionId, "done");
  return "done";
}

async function reserveTax(env: EnvLike, tx: LedgerRow, actionId: string): Promise<ExecutorStatus> {
  const rate = Number(env.TAX_RESERVE_RATE ?? "0.30");
  const reserveAmount = Math.max(tx.amount, 0) * rate;

  if (env.INTERNAL_ACTION_WEBHOOK) {
    await fetch(env.INTERNAL_ACTION_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "reserve_tax",
        ledgerId: tx.id,
        reserveAmount,
        originalAmount: tx.amount,
      }),
    });
  }

  await updateActionStatus(env.DB, actionId, "done");
  return "done";
}

async function sendSlack(
  env: EnvLike,
  tx: LedgerRow,
  decision: AiDecision,
  actionId: string,
): Promise<ExecutorStatus> {
  if (!env.SLACK_WEBHOOK_URL) {
    await updateActionStatus(env.DB, actionId, "queued");
    return "queued";
  }

  await fetch(env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: [
        `[nonui-cfo] ${decision.action}`,
        `category=${decision.category}`,
        `amount=${tx.amount}`,
        `description=${tx.description}`,
      ].join("\n"),
    }),
  });

  await updateActionStatus(env.DB, actionId, "done");
  return "done";
}
