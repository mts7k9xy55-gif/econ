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
};

export type ProcessedEventRow = {
  event_id: string;
  ledger_id: string;
  processed_at: string;
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
  action: { id: string; type: string; payload: unknown; status: string },
): Promise<ActionRow> {
  const payload = JSON.stringify(action.payload);

  await db
    .prepare("INSERT INTO actions (id, type, payload, status) VALUES (?, ?, ?, ?)")
    .bind(action.id, action.type, payload, action.status)
    .run();

  return {
    id: action.id,
    type: action.type,
    payload,
    status: action.status,
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
    .prepare("SELECT id, type, payload, status FROM actions ORDER BY rowid DESC LIMIT ?")
    .bind(limit)
    .all<ActionRow>();

  return results;
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
