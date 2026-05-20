-- Table: inventory_valuation
-- Stores monthly snapshots of stock valuation per boutique/location.

CREATE TABLE IF NOT EXISTS inventory_valuation (
  id              BIGSERIAL PRIMARY KEY,
  snapshot_date   DATE NOT NULL,
  location_code   TEXT NOT NULL,
  location_name   TEXT NOT NULL,
  item_code       TEXT, -- Serial Number
  item_sku        TEXT, -- SAP SKU
  item_name       TEXT,
  description     TEXT,
  item_price      NUMERIC NOT NULL DEFAULT 0,
  item_cost       NUMERIC NOT NULL DEFAULT 0,
  collection_code TEXT,
  qoh             INTEGER NOT NULL DEFAULT 0,
  amount          NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching and filtering
CREATE INDEX IF NOT EXISTS idx_inventory_val_date_loc ON inventory_valuation (snapshot_date, location_code);
CREATE INDEX IF NOT EXISTS idx_inventory_val_sku ON inventory_valuation (item_sku);
CREATE INDEX IF NOT EXISTS idx_inventory_val_code ON inventory_valuation (item_code);

-- Enable RLS if needed, or disable it initially to match other tables:
ALTER TABLE inventory_valuation DISABLE ROW LEVEL SECURITY;

-- Seed permissions for the /inventory route
INSERT INTO role_menu_access (role, menu_path, allowed) VALUES
  ('management_it', '/inventory', true),
  ('operations_sales', '/inventory', true)
ON CONFLICT (role, menu_path) DO NOTHING;
