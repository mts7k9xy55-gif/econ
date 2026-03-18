import type { AiDecision } from "./ai";
import type { LedgerRow } from "./ledger";

export type RuleMatch = {
  ruleId: string;
  summary: string;
  priority: number;
  stopProcessing: boolean;
  mergePolicy: RuleMergePolicy;
  matchedRuleIds: string[];
  decision: AiDecision;
};

export type RuleMergePolicy = "first-wins";

export type Rule = {
  id: string;
  summary: string;
  priority: number;
  stopProcessing: boolean;
  mergePolicy: RuleMergePolicy;
  match: (tx: LedgerRow) => boolean;
  decision: (tx: LedgerRow) => AiDecision;
};

const rules: Rule[] = [
  {
    id: "revenue.stripe-payment",
    summary: "Stripe or payment-like inflow is treated as revenue.",
    priority: 100,
    stopProcessing: true,
    mergePolicy: "first-wins",
    match: (tx) => includesAny(tx, ["stripe", "payment", "invoice paid", "入金", "売上"]),
    decision: () => ({
      category: "revenue",
      action: "none",
      reason: "Matched rule: revenue.stripe-payment",
    }),
  },
  {
    id: "cost.infrastructure-threshold",
    summary: "Infra vendor spend above threshold becomes a cost increase alert.",
    priority: 90,
    stopProcessing: true,
    mergePolicy: "first-wins",
    match: (tx) =>
      tx.amount >= 50000 && includesAny(tx, ["aws", "gcp", "azure", "openai", "anthropic", "cloudflare"]),
    decision: () => ({
      category: "infra_cost",
      action: "alert_cost_increase",
      reason: "Matched rule: cost.infrastructure-threshold",
    }),
  },
  {
    id: "tax.reserve",
    summary: "Tax-like transactions trigger reserve_tax.",
    priority: 80,
    stopProcessing: false,
    mergePolicy: "first-wins",
    match: (tx) => includesAny(tx, ["税", "tax", "vat", "消費税"]),
    decision: () => ({
      category: "tax",
      action: "reserve_tax",
      reason: "Matched rule: tax.reserve",
    }),
  },
  {
    id: "cash-outflow.refund",
    summary: "Refunds and chargebacks are treated as cash outflow alerts.",
    priority: 95,
    stopProcessing: true,
    mergePolicy: "first-wins",
    match: (tx) => tx.amount < 0 || includesAny(tx, ["refund", "chargeback"]),
    decision: () => ({
      category: "cash_outflow",
      action: "alert_cash_outflow",
      reason: "Matched rule: cash-outflow.refund",
    }),
  },
];

export function listRules(): Array<{
  id: string;
  summary: string;
  priority: number;
  stopProcessing: boolean;
  mergePolicy: RuleMergePolicy;
}> {
  return getSortedRules().map(({ id, summary, priority, stopProcessing, mergePolicy }) => ({
    id,
    summary,
    priority,
    stopProcessing,
    mergePolicy,
  }));
}

export function applyRuleLayer(tx: LedgerRow, ruleSet: Rule[] = rules): RuleMatch | null {
  const matchedRules: Rule[] = [];
  let selectedRule: Rule | null = null;

  for (const rule of getSortedRules(ruleSet)) {
    if (rule.match(tx)) {
      matchedRules.push(rule);
      if (!selectedRule || rule.priority > selectedRule.priority) {
        selectedRule = rule;
      }
      if (rule.stopProcessing) {
        break;
      }
    }
  }

  if (!selectedRule) {
    return null;
  }

  return {
    ruleId: selectedRule.id,
    summary: selectedRule.summary,
    priority: selectedRule.priority,
    stopProcessing: selectedRule.stopProcessing,
    mergePolicy: selectedRule.mergePolicy,
    matchedRuleIds: matchedRules.map((rule) => rule.id),
    decision: selectedRule.decision(tx),
  };
}

function includesAny(tx: LedgerRow, patterns: string[]): boolean {
  const text = `${tx.description} ${tx.source}`.toLowerCase();
  return patterns.some((pattern) => text.includes(pattern));
}

function getSortedRules(ruleSet: Rule[] = rules): Rule[] {
  return [...ruleSet].sort((left, right) => right.priority - left.priority);
}
