CREATE TABLE IF NOT EXISTS waitlist_signups (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL,
  source_path TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created_at ON waitlist_signups(created_at DESC);
