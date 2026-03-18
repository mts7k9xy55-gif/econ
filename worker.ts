import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { processAI } from "./ai";
import { executeAction, listActionExecutors } from "./actions";
import { econEventToLedgerInsert, normalizeIncomingEvent, normalizeStripeEvent } from "./event";
import {
  getLedgerEntry,
  getProcessedEvent,
  insertLedgerEntry,
  listRecentActions,
  listRecentLedger,
  recordProcessedEvent,
  updateLedgerCategory,
} from "./ledger";
import { applyRuleLayer, listRules } from "./rules";
import { parseStripeEvent } from "./stripe";
import type { EconEvent } from "./types";

type Bindings = {
  AI?: Ai;
  DB: D1Database;
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

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) => c.json({ ok: true }));

app.get("/ledger", async (c) => {
  const limit = Number(c.req.query("limit") ?? "50");
  const results = await listRecentLedger(c.env.DB, clampLimit(limit));
  return c.json({ ok: true, results });
});

app.get("/actions", async (c) => {
  const limit = Number(c.req.query("limit") ?? "50");
  const results = await listRecentActions(c.env.DB, clampLimit(limit));
  return c.json({ ok: true, results });
});

app.get("/action-executors", (c) => {
  return c.json({ ok: true, results: listActionExecutors() });
});

app.get("/rules", (c) => {
  return c.json({ ok: true, results: listRules() });
});

app.post("/event", async (c) => {
  const payload = await c.req.json<unknown>();
  const econEvent = normalizeIncomingEvent(payload);
  const result = await ingestEvent(c.env, econEvent);
  return c.json({ ok: true, event: econEvent, ...result });
});

app.post("/webhooks/stripe", async (c) => {
  const rawBody = await c.req.text();
  const stripeEvent = await parseStripeEvent(c.req.raw, rawBody, c.env);
  const econEvent = normalizeStripeEvent(stripeEvent);

  if (!econEvent) {
    return c.json({ ok: true, skipped: true, reason: `Unhandled event ${stripeEvent.type}` });
  }

  const result = await ingestEvent(c.env, econEvent);

  return c.json({ ok: true, source: "stripe", event: econEvent, ...result });
});

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  console.error(error);
  return c.json(
    {
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected error",
    },
    500,
  );
});

export default app;

async function ingestEvent(env: Bindings, event: EconEvent) {
  const existingProcessedEvent = await getProcessedEvent(env.DB, event.id);
  if (existingProcessedEvent) {
    return buildDuplicateResponse(env, event.id, existingProcessedEvent.ledger_id);
  }

  let ledgerRow;
  try {
    ledgerRow = await insertLedgerEntry(env.DB, econEventToLedgerInsert(event));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return buildDuplicateResponse(env, event.id, event.id);
    }
    throw error;
  }

  try {
    await recordProcessedEvent(env.DB, { eventId: event.id, ledgerId: ledgerRow.id });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return buildDuplicateResponse(env, event.id, ledgerRow.id);
    }
    throw error;
  }
  const ruleMatch = applyRuleLayer(ledgerRow);
  const decision = ruleMatch?.decision ?? (await processAI(env, ledgerRow));
  await updateLedgerCategory(env.DB, ledgerRow.id, decision.category);
  const action = await executeAction(
    env,
    {
      ...ledgerRow,
      category: decision.category,
    },
    decision,
  );

  return {
    ledgerId: ledgerRow.id,
    eventId: event.id,
    duplicate: false,
    category: decision.category,
    action: decision.action,
    reason: decision.reason ?? null,
    ruleMatch,
    actionRecord: action,
  };
}

async function buildDuplicateResponse(env: Bindings, eventId: string, ledgerId: string) {
  const existingLedger = await getLedgerEntry(env.DB, ledgerId);
  return {
    ledgerId,
    eventId,
    duplicate: true,
    category: existingLedger?.category ?? null,
    action: null,
    reason: "Duplicate event ignored by idempotency layer",
    ruleMatch: null,
    actionRecord: null,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed");
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 50;
  }

  return Math.min(Math.trunc(value), 200);
}
