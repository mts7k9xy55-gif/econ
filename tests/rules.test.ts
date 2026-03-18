import test from "node:test";
import assert from "node:assert/strict";
import { applyRuleLayer, type Rule } from "../rules";
import type { LedgerRow } from "../ledger";

const tx: LedgerRow = {
  id: "ledger_1",
  date: "2026-03-19T00:00:00.000Z",
  description: "AWS tax payment",
  amount: 60000,
  category: null,
  source: "aws",
  raw_event: null,
};

test("rules execute in priority order", () => {
  const rules: Rule[] = [
    {
      id: "low-priority",
      summary: "Low priority rule",
      priority: 10,
      stopProcessing: false,
      mergePolicy: "first-wins",
      match: () => true,
      decision: () => ({ category: "low", action: "none", reason: "low" }),
    },
    {
      id: "high-priority",
      summary: "High priority rule",
      priority: 100,
      stopProcessing: false,
      mergePolicy: "first-wins",
      match: () => true,
      decision: () => ({ category: "high", action: "none", reason: "high" }),
    },
  ];

  const result = applyRuleLayer(tx, rules);
  assert.ok(result);
  assert.equal(result.ruleId, "high-priority");
  assert.deepEqual(result.matchedRuleIds, ["high-priority", "low-priority"]);
});

test("stopProcessing halts later rule evaluation", () => {
  const rules: Rule[] = [
    {
      id: "stop-first",
      summary: "Stop first",
      priority: 100,
      stopProcessing: true,
      mergePolicy: "first-wins",
      match: () => true,
      decision: () => ({ category: "first", action: "none", reason: "first" }),
    },
    {
      id: "never-runs",
      summary: "Never runs",
      priority: 50,
      stopProcessing: false,
      mergePolicy: "first-wins",
      match: () => true,
      decision: () => ({ category: "second", action: "none", reason: "second" }),
    },
  ];

  const result = applyRuleLayer(tx, rules);
  assert.ok(result);
  assert.equal(result.ruleId, "stop-first");
  assert.deepEqual(result.matchedRuleIds, ["stop-first"]);
});
