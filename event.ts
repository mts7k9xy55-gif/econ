import { HTTPException } from "hono/http-exception";
import type { LedgerInsert } from "./ledger";
import type { StripeEvent } from "./stripe";
import type { EconEvent, EconEventClass } from "./types";

const ECON_EVENT_SCHEMA_VERSION = "2026-03-19" as const;

export function normalizeIncomingEvent(payload: unknown): EconEvent {
  if (!payload || typeof payload !== "object") {
    throw new HTTPException(400, { message: "JSON object is required" });
  }

  const raw = payload as Record<string, unknown>;
  const id = stringValue(raw.id) ?? crypto.randomUUID();
  const source = stringValue(raw.source) ?? "manual";
  const type = stringValue(raw.type) ?? "manual.recorded";
  const eventVersion = normalizeEventVersion(raw.eventVersion);
  const causationId = stringValue(raw.causationId);
  const correlationId = stringValue(raw.correlationId) ?? id;
  const timestamp = normalizeTimestamp(stringValue(raw.timestamp) ?? stringValue(raw.date) ?? new Date().toISOString());
  const amount = optionalNumber(raw.amount);
  const description = stringValue(raw.description);
  const currency = normalizeCurrency(stringValue(raw.currency));
  const actor = stringValue(raw.actor);
  const counterparty = stringValue(raw.counterparty);
  const tags = normalizeTags(raw.tags, amount, type, source);
  const relatedEventIds = normalizeStringArray(raw.relatedEventIds);
  const metadata = normalizeMetadata(raw.metadata, raw);
  const eventClass = normalizeEventClass(raw.eventClass, amount, type);

  return {
    schemaVersion: ECON_EVENT_SCHEMA_VERSION,
    eventVersion,
    id,
    causationId,
    correlationId,
    source,
    type,
    eventClass,
    timestamp,
    amount,
    currency,
    actor,
    counterparty,
    description,
    tags,
    relatedEventIds,
    metadata,
  };
}

export function normalizeStripeEvent(event: StripeEvent): EconEvent | null {
  const object = event.data?.object ?? {};
  const timestamp = new Date(event.created * 1000).toISOString();
  const currency = normalizeCurrency(stringValue(object.currency)) ?? "JPY";
  const counterparty = stringValue(object.customer_email) ?? stringValue(object.customer) ?? "unknown";
  const description = stringValue(object.description);

  switch (event.type) {
    case "invoice.payment_succeeded":
      return {
        schemaVersion: ECON_EVENT_SCHEMA_VERSION,
        eventVersion: 1,
        id: event.id,
        causationId: undefined,
        correlationId: event.id,
        source: "stripe",
        type: "payment.received",
        eventClass: "financial_transaction",
        timestamp,
        amount: toMajorUnit(object.amount_paid),
        currency,
        actor: "customer",
        counterparty,
        description: description ?? `Stripe invoice payment ${counterparty}`,
        tags: ["revenue", "stripe"],
        relatedEventIds: normalizeStringArray(object.invoice),
        metadata: { stripeEventType: event.type, stripe: event },
      };
    case "charge.succeeded":
      return {
        schemaVersion: ECON_EVENT_SCHEMA_VERSION,
        eventVersion: 1,
        id: event.id,
        causationId: undefined,
        correlationId: event.id,
        source: "stripe",
        type: "payment.received",
        eventClass: "financial_transaction",
        timestamp,
        amount: toMajorUnit(object.amount),
        currency,
        actor: "customer",
        counterparty,
        description: description ?? `Stripe charge ${counterparty}`,
        tags: ["revenue", "stripe"],
        relatedEventIds: normalizeStringArray(object.payment_intent),
        metadata: { stripeEventType: event.type, stripe: event },
      };
    case "charge.refunded":
      return {
        schemaVersion: ECON_EVENT_SCHEMA_VERSION,
        eventVersion: 1,
        id: event.id,
        causationId: undefined,
        correlationId: event.id,
        source: "stripe",
        type: "refund.issued",
        eventClass: "financial_transaction",
        timestamp,
        amount: -Math.abs(toMajorUnit(object.amount_refunded ?? object.amount)),
        currency,
        actor: "customer",
        counterparty,
        description: description ?? `Stripe refund ${counterparty}`,
        tags: ["refund", "stripe"],
        relatedEventIds: normalizeStringArray(object.charge, object.payment_intent),
        metadata: { stripeEventType: event.type, stripe: event },
      };
    case "invoice.payment_failed":
      return {
        schemaVersion: ECON_EVENT_SCHEMA_VERSION,
        eventVersion: 1,
        id: event.id,
        correlationId: event.id,
        source: "stripe",
        type: "payment.failed",
        eventClass: "financial_transaction",
        timestamp,
        amount: toMajorUnit(object.amount_due ?? object.amount_remaining ?? 0),
        currency,
        actor: "customer",
        counterparty,
        description: description ?? `Stripe invoice payment failed ${counterparty}`,
        tags: ["stripe", "payment_failed"],
        relatedEventIds: normalizeStringArray(object.invoice),
        metadata: { stripeEventType: event.type, stripe: event },
      };
    case "customer.created":
      return {
        schemaVersion: ECON_EVENT_SCHEMA_VERSION,
        eventVersion: 1,
        id: event.id,
        correlationId: event.id,
        source: "stripe",
        type: "customer.created",
        eventClass: "operational_event",
        timestamp,
        currency,
        actor: "customer",
        counterparty,
        description: description ?? `Stripe customer created ${counterparty}`,
        tags: ["stripe", "customer"],
        relatedEventIds: undefined,
        metadata: { stripeEventType: event.type, stripe: event },
      };
    default:
      return null;
  }
}

export function econEventToLedgerInsert(event: EconEvent): LedgerInsert {
  return {
    id: event.id,
    date: event.timestamp,
    description: buildLedgerDescription(event),
    amount: event.amount ?? 0,
    source: event.source,
    rawEvent: event,
  };
}

function normalizeEventClass(value: unknown, amount: number | undefined, type: string): EconEventClass {
  if (value === "financial_transaction" || value === "operational_event" || value === "ai_action") {
    return value;
  }

  if (type.startsWith("action.")) {
    return "ai_action";
  }

  if (amount !== undefined) {
    return "financial_transaction";
  }

  return "operational_event";
}

function normalizeTags(value: unknown, amount: number | undefined, type: string, source: string): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  const tags = new Set<string>([source]);
  if (amount !== undefined) {
    tags.add(amount >= 0 ? "inflow" : "outflow");
  }
  if (type.includes("payment")) {
    tags.add("revenue");
  }
  if (type.includes("refund")) {
    tags.add("refund");
  }
  return [...tags];
}

function normalizeMetadata(value: unknown, fallback: Record<string, unknown>): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return fallback;
}

function normalizeEventVersion(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    return 1;
  }

  const version = Number(value);
  if (!Number.isInteger(version) || version <= 0) {
    throw new HTTPException(400, { message: "eventVersion must be a positive integer when provided" });
  }
  return version;
}

function normalizeTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HTTPException(400, { message: "timestamp/date must be a valid datetime" });
  }
  return date.toISOString();
}

function normalizeCurrency(value: string | undefined): string | undefined {
  return value ? value.toUpperCase() : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw new HTTPException(400, { message: "amount must be a number when provided" });
  }
  return amount;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeStringArray(...values: unknown[]): string[] | undefined {
  const flattened = values.flatMap((value) => {
    if (Array.isArray(value)) {
      return value;
    }
    return value === undefined || value === null ? [] : [value];
  });

  const result = flattened.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return result.length > 0 ? result : undefined;
}

function buildLedgerDescription(event: EconEvent): string {
  if (event.description) {
    return event.description;
  }

  if (event.counterparty) {
    return `${event.source} ${event.type} ${event.counterparty}`;
  }

  return `${event.source} ${event.type}`;
}

function toMajorUnit(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return amount / 100;
}
