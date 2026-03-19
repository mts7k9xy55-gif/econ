CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  source TEXT DEFAULT 'manual',
  raw_event TEXT
);

CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TEXT
);

CREATE TABLE IF NOT EXISTS econ_event (
  id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL,
  event_version INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  source TEXT NOT NULL,
  type TEXT NOT NULL,
  event_class TEXT NOT NULL,
  amount REAL,
  currency TEXT,
  actor TEXT,
  counterparty TEXT,
  description TEXT,
  tags TEXT NOT NULL,
  related_event_ids TEXT,
  causation_id TEXT,
  correlation_id TEXT,
  metadata TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,
  ledger_id TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS balances (
  category TEXT NOT NULL,
  currency TEXT NOT NULL,
  net_amount REAL NOT NULL,
  inflow_amount REAL NOT NULL,
  outflow_amount REAL NOT NULL,
  event_count INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (category, currency)
);

CREATE TABLE IF NOT EXISTS cashflow (
  period TEXT NOT NULL,
  currency TEXT NOT NULL,
  inflow_amount REAL NOT NULL,
  outflow_amount REAL NOT NULL,
  net_amount REAL NOT NULL,
  event_count INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (period, currency)
);

CREATE TABLE IF NOT EXISTS replay_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  event_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger(date DESC);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_econ_event_timestamp ON econ_event(timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_econ_event_correlation_id ON econ_event(correlation_id);
