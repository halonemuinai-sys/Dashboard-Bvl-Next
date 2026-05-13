-- Table: dashboard_users
-- Stores authorized users and their role assignments for the BI Dashboard.

CREATE TABLE IF NOT EXISTS dashboard_users (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'crm'
              CHECK (role IN ('super_admin', 'management_it', 'operations_sales', 'crm')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: role_menu_access
-- Defines which menu paths are allowed per role.
-- If a path is not listed for a role, it is denied by default.

CREATE TABLE IF NOT EXISTS role_menu_access (
  role        TEXT NOT NULL
              CHECK (role IN ('management_it', 'operations_sales', 'crm')),
  menu_path   TEXT NOT NULL,
  allowed     BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (role, menu_path)
);

ALTER TABLE dashboard_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_menu_access DISABLE ROW LEVEL SECURITY;

-- Seed default permissions
-- Management & IT: all menus
INSERT INTO role_menu_access (role, menu_path, allowed) VALUES
  ('management_it', '/', true),
  ('management_it', '/quarterly-standard', true),
  ('management_it', '/quarterly-budget', true),
  ('management_it', '/annual-sales', true),
  ('management_it', '/store-performance', true),
  ('management_it', '/forecasting', true),
  ('management_it', '/daily-report', true),
  ('management_it', '/monthly-transactions', true),
  ('management_it', '/heatmap-calendar', true),
  ('management_it', '/crossing-sales', true),
  ('management_it', '/sales', true),
  ('management_it', '/product-rank', true),
  ('management_it', '/product-projection', true),
  ('management_it', '/advisor-setup', true),
  ('management_it', '/advisor-performance', true),
  ('management_it', '/crm-profiling', true),
  ('management_it', '/event-selling-plan', true),
  ('management_it', '/app-sheet-crm', true),
  ('management_it', '/footfall-store', true),
  ('management_it', '/footfall-crm', true),
  ('management_it', '/customer-segment', true),
  ('management_it', '/clienteling-hub', true),
  ('management_it', '/user-access', true),
-- Operations Sales: sales & advisor menus
  ('operations_sales', '/', true),
  ('operations_sales', '/quarterly-standard', true),
  ('operations_sales', '/quarterly-budget', true),
  ('operations_sales', '/annual-sales', true),
  ('operations_sales', '/store-performance', true),
  ('operations_sales', '/daily-report', true),
  ('operations_sales', '/monthly-transactions', true),
  ('operations_sales', '/heatmap-calendar', true),
  ('operations_sales', '/crossing-sales', true),
  ('operations_sales', '/product-rank', true),
  ('operations_sales', '/product-projection', true),
  ('operations_sales', '/advisor-setup', true),
  ('operations_sales', '/advisor-performance', true),
-- CRM: CRM & traffic menus only
  ('crm', '/', true),
  ('crm', '/crm-profiling', true),
  ('crm', '/event-selling-plan', true),
  ('crm', '/app-sheet-crm', true),
  ('crm', '/footfall-store', true),
  ('crm', '/footfall-crm', true),
  ('crm', '/customer-segment', true),
  ('crm', '/clienteling-hub', true)
ON CONFLICT (role, menu_path) DO NOTHING;
