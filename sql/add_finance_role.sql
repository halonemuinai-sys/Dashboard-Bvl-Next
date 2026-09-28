-- Add 'finance' role: access to Finance module (Reconciliation & Audit,
-- Bank Performance & MDR, Bank MDR Setup) plus Installment & MDR Guide.

ALTER TABLE dashboard_users DROP CONSTRAINT IF EXISTS dashboard_users_role_check;
ALTER TABLE dashboard_users ADD CONSTRAINT dashboard_users_role_check
  CHECK (role IN ('super_admin', 'management_it', 'operations_sales', 'crm', 'finance'));

ALTER TABLE role_menu_access DROP CONSTRAINT IF EXISTS role_menu_access_role_check;
ALTER TABLE role_menu_access ADD CONSTRAINT role_menu_access_role_check
  CHECK (role IN ('management_it', 'operations_sales', 'crm', 'finance'));

-- Seed default menu access for the finance role
INSERT INTO role_menu_access (role, menu_path, allowed) VALUES
  ('finance', '/finance-reconciliation', true),
  ('finance', '/finance-payment-analytics', true),
  ('finance', '/finance-mdr-setup', true),
  ('finance', '/installment-guide', true)
ON CONFLICT (role, menu_path) DO NOTHING;
