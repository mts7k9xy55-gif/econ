export type ExtensibleString<T extends string> = T | (string & {});

export type EconEventVersion = "2026-03-19";

export type EconEventClass = "financial_transaction" | "operational_event" | "ai_action";

export type EconEventSource = ExtensibleString<
  "manual" | "stripe" | "aws" | "bank" | "card" | "payroll" | "tax" | "invoice" | "action" | "system"
>;

export type EconEventType = ExtensibleString<
  | "payment.received"
  | "payment.failed"
  | "refund.issued"
  | "cost.incurred"
  | "invoice.created"
  | "tax.observed"
  | "customer.created"
  | "action.requested"
  | "action.completed"
  | "manual.recorded"
>;

export type EconEventActor = ExtensibleString<"customer" | "vendor" | "system" | "agent" | "operator">;

export type EconEvent = {
  schemaVersion: EconEventVersion;
  eventVersion: number;
  id: string;
  causationId?: string;
  correlationId?: string;
  source: EconEventSource;
  type: EconEventType;
  eventClass: EconEventClass;
  timestamp: string;
  amount?: number;
  currency?: string;
  actor?: EconEventActor;
  counterparty?: string;
  description?: string;
  tags: string[];
  relatedEventIds?: string[];
  metadata: Record<string, unknown>;
};
