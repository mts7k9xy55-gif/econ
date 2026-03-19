import test from "node:test";
import assert from "node:assert/strict";
import { processAI } from "../ai";
import type { LedgerRow } from "../ledger";

test("heuristic fallback classifies payment failure separately from revenue", async () => {
  const tx: LedgerRow = {
    id: "ledger_payment_failed",
    date: "2026-03-19T00:00:00.000Z",
    description: "Failed invoice",
    amount: 500,
    category: null,
    source: "stripe",
    raw_event: JSON.stringify({ type: "payment.failed" }),
  };

  const decision = await processAI({}, tx);
  assert.equal(decision.category, "payment_failure");
  assert.equal(decision.decisionAction, "notify_slack");
});

test("heuristic fallback treats customer.created as operational", async () => {
  const tx: LedgerRow = {
    id: "ledger_customer_created",
    date: "2026-03-19T00:00:00.000Z",
    description: "New customer",
    amount: 0,
    category: null,
    source: "stripe",
    raw_event: JSON.stringify({ type: "customer.created" }),
  };

  const decision = await processAI({}, tx);
  assert.equal(decision.category, "customer_lifecycle");
  assert.equal(decision.decisionAction, "none");
});
