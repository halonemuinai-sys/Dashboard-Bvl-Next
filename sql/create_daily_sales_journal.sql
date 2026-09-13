-- Daily Sales Journal — narrative log explaining daily sales performance.
-- One entry per (entry_date, location). location = 'ALL' means a store-agnostic note.
-- Write access is admin-only at the application layer (super_admin / management_it).

CREATE TABLE IF NOT EXISTS daily_sales_journal (
  id           SERIAL PRIMARY KEY,
  entry_date   DATE NOT NULL,
  location     TEXT NOT NULL DEFAULT 'ALL',
  note         TEXT NOT NULL DEFAULT '',
  tags         TEXT[] NOT NULL DEFAULT '{}',
  created_by   TEXT DEFAULT '',
  updated_by   TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- One journal entry per day per location
CREATE UNIQUE INDEX IF NOT EXISTS daily_sales_journal_date_loc_key
  ON daily_sales_journal (entry_date, location);

CREATE INDEX IF NOT EXISTS daily_sales_journal_date_idx ON daily_sales_journal (entry_date);
