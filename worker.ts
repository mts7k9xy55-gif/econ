import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { processAI } from "./ai";
import { executeAction, fetchRunnableActions, listActionExecutors, processQueuedActions } from "./actions";
import { econEventToLedgerInsert, normalizeIncomingEvent, normalizeStripeEvent } from "./event";
import { renderLandingPage, resolveLandingLocale } from "./landing";
import {
  getActionQueueSummary,
  getLedgerEntry,
  getProcessedEvent,
  insertEconEvent,
  insertLedgerEntry,
  listBalances,
  listActionQueue,
  listCashflow,
  listRecentActions,
  listRecentLedger,
  listReplayRuns,
  insertWaitlistSignup,
  recordProcessedEvent,
  updateLedgerCategory,
} from "./ledger";
import { refreshReadModels, runReplay } from "./replay";
import { applyRuleLayer, listRules } from "./rules";
import { parseStripeEvent } from "./stripe";
import type { EconEvent } from "./types";
import {
  buildWaitlistRedirect,
  isValidWaitlistEmail,
  normalizeWaitlistEmail,
  normalizeWaitlistLocale,
  resolveWaitlistStatus,
} from "./waitlist";

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

app.get("/", (c) => {
  const locale = resolveLandingLocale(c.req.query("lang"), c.req.header("Accept-Language"));
  const waitlistStatus = resolveWaitlistStatus(c.req.query("waitlist"));
  return c.html(renderLandingPage(locale, waitlistStatus));
});

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

app.get("/action-queue", async (c) => {
  const limit = Number(c.req.query("limit") ?? "50");
  const [summary, results] = await Promise.all([
    getActionQueueSummary(c.env.DB),
    listActionQueue(c.env.DB, clampLimit(limit)),
  ]);

  return c.json({ ok: true, summary, results });
});

app.get("/action-executors", (c) => {
  return c.json({ ok: true, results: listActionExecutors() });
});

app.get("/balances", async (c) => {
  const limit = Number(c.req.query("limit") ?? "100");
  const results = await listBalances(c.env.DB, clampLimit(limit));
  return c.json({ ok: true, results });
});

app.get("/cashflow", async (c) => {
  const limit = Number(c.req.query("limit") ?? "24");
  const results = await listCashflow(c.env.DB, clampLimit(limit));
  return c.json({ ok: true, results });
});

app.get("/replay-runs", async (c) => {
  const limit = Number(c.req.query("limit") ?? "20");
  const results = await listReplayRuns(c.env.DB, clampLimit(limit));
  return c.json({ ok: true, results });
});

app.post("/actions/run", async (c) => {
  const limit = Number((await c.req.json().catch(() => ({})) as { limit?: number }).limit ?? "20");
  const actions = await fetchRunnableActions(c.env, clampLimit(limit));
  const results = await processQueuedActions(c.env, actions, async (ledgerId) => getLedgerEntry(c.env.DB, ledgerId));
  return c.json({ ok: true, processed: results.length, results });
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

app.post("/replay", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    fromTimestamp?: string;
    dryRun?: boolean;
  };
  const result = await runReplay(c.env, {
    fromTimestamp: body.fromTimestamp,
    dryRun: Boolean(body.dryRun),
  });
  return c.json({ ok: true, ...result });
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

app.post("/waitlist", async (c) => {
  const payload = await parseWaitlistPayload(c.req.raw);
  const locale = normalizeWaitlistLocale(payload.locale);
  const email = normalizeWaitlistEmail(payload.email);
  const wantsJson = c.req.header("accept")?.includes("application/json") ?? false;

  if (!isValidWaitlistEmail(email)) {
    if (wantsJson) {
      return c.json({ ok: false, error: "Invalid email address" }, 400);
    }

    return c.redirect(buildWaitlistRedirect(locale, "invalid"), 303);
  }

  try {
    const signup = await insertWaitlistSignup(c.env.DB, {
      id: `wait_${crypto.randomUUID()}`,
      email,
      locale,
      sourcePath: "/",
      userAgent: c.req.header("user-agent") ?? null,
    });

    if (wantsJson) {
      return c.json({ ok: true, signup }, 201);
    }

    return c.redirect(buildWaitlistRedirect(locale, "success"), 303);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      if (wantsJson) {
        return c.json({ ok: true, duplicate: true }, 200);
      }

      return c.redirect(buildWaitlistRedirect(locale, "exists"), 303);
    }

    console.error(error);

    if (wantsJson) {
      return c.json({ ok: false, error: "Failed to save waitlist signup" }, 500);
    }

    return c.redirect(buildWaitlistRedirect(locale, "error"), 303);
  }
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
  try {
    await insertEconEvent(env.DB, event);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existingProcessedEvent = await getProcessedEvent(env.DB, event.id);
      return buildDuplicateResponse(env, event.id, existingProcessedEvent?.ledger_id ?? event.id);
    }
    throw error;
  }

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
  await refreshReadModels(env);

  return {
    ledgerId: ledgerRow.id,
    eventId: event.id,
    duplicate: false,
    category: decision.category,
    action: decision.decisionAction,
    decisionAction: decision.decisionAction,
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

async function parseWaitlistPayload(request: Request): Promise<{ email?: string; locale?: string }> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json().catch(() => ({}))) as { email?: string; locale?: string };
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const email = formData.get("email");
    const locale = formData.get("locale");
    return {
      email: typeof email === "string" ? email : undefined,
      locale: typeof locale === "string" ? locale : undefined,
    };
  }

  const params = new URLSearchParams(await request.text());
  return {
    email: params.get("email") ?? undefined,
    locale: params.get("locale") ?? undefined,
  };
}
