export const ROLES = ['super_admin', 'management_it', 'operations_sales', 'crm', 'finance', 'merchandise'] as const;
export type Role = typeof ROLES[number];
export interface DashboardUser { id: number; email: string; full_name: string; role: Role; assigned_store: string; is_active: boolean }
export interface MenuAccess { role: Role; menu_path: string; allowed: boolean }
export interface AuditLog { id: number; user_email: string; action_type: string; table_name: string; record_id: string | null; created_at: string; old_values: Record<string, unknown> | null; new_values: Record<string, unknown> | null }
export const ROLE_LABEL: Record<Role, string> = { super_admin: 'Super Admin', management_it: 'Management & IT', operations_sales: 'Operations Sales', crm: 'CRM', finance: 'Finance', merchandise: 'Merchandise' };
export const STORES = ['ALL', 'Plaza Indonesia', 'Plaza Senayan', 'Bali', 'Head Office'] as const;
export const FINANCE_PATHS = ['/', '/operations-sales', '/finance-reconciliation', '/finance-payment-analytics', '/finance-mdr-setup', '/installment-guide'];
/** Roles whose menus an administrator chooses in User Access (others follow a fixed policy). */
export const CONFIGURABLE_ROLES: Role[] = ['operations_sales', 'crm', 'merchandise'];
/** Menus a new merchandise role starts with; administrators can add or remove menus later. */
export const MERCHANDISE_DEFAULT_PATHS = ['/packaging', '/inventory', '/stock-opname'];
export function isRole(value: unknown): value is Role { return typeof value === 'string' && ROLES.includes(value as Role); }
export function isAdminRole(role: unknown) { return role === 'super_admin' || role === 'management_it'; }
export const DP_TRANSACTION_PATHS = ['/monthly-dps-svc', '/monthly-dps-svc/down-payment', '/monthly-dps-svc/service', '/monthly-dps-svc/packaging'];
export function isFixedPermission(role: Role, path: string) { return isAdminRole(role) || role === 'finance' || path === '/user-access' || (role === 'operations_sales' && (path === '/installment-guide' || DP_TRANSACTION_PATHS.includes(path))); }
export function hasMenuAccess(role: Role | null, paths: Iterable<string>, path: string): boolean {
  if (DP_TRANSACTION_PATHS.includes(path)) path = '/monthly-dps-svc';
  if (!role) return false;
  if (isAdminRole(role)) return true;
  if (path === '/user-access') return false;
  if (role === 'finance') return FINANCE_PATHS.includes(path);
  if (role === 'operations_sales' && (path === '/installment-guide' || path === '/monthly-dps-svc')) return true;
  return new Set(paths).has(path);
}
export function assertUserChange(actor: Pick<DashboardUser, 'id' | 'role'>, target: Pick<DashboardUser, 'id' | 'role'>, changes: { role?: Role; is_active?: boolean }, deleting = false) {
  if (!isAdminRole(actor.role)) throw new Error('Administrator access is required.');
  if (actor.role !== 'super_admin' && (target.role === 'super_admin' || changes.role === 'super_admin')) throw new Error('Only a Super Admin can manage Super Admin accounts.');
  if (actor.id === target.id && (deleting || changes.is_active === false || (changes.role && changes.role !== actor.role))) throw new Error('You cannot delete, deactivate, or change the role of your own account.');
}
export function validatePassword(password: string) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128 || !password.trim()) throw new Error('Use a password between 8 and 128 characters.');
}
export function redactAuditValue(value: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!value) return null;
  const redact = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(redact);
    if (entry && typeof entry === 'object') return Object.fromEntries(Object.entries(entry).map(([key, val]) => [key, /password|token|secret|salt|hash/i.test(key) ? '[REDACTED]' : redact(val)]));
    return entry;
  };
  return redact(value) as Record<string, unknown>;
}

export const MENU_GROUPS = [
  {
    title: 'Overview',
    items: [
      { path: '/',                    label: 'Monthly Overview' },
      { path: '/operations-sales',    label: 'Operations Sales (Store Manager)' },
      { path: '/quarterly-standard',  label: 'Quarterly Standard' },
      { path: '/quarterly-budget',    label: 'Quarterly Budget' },
      { path: '/annual-sales',        label: 'Annual Net Sales' },
      { path: '/store-performance',   label: 'Store Performance' },
      { path: '/cost-disc-analysis', label: 'Margin Intelligence' },
      { path: '/forecasting',         label: 'Forecasting (AI)' },
      { path: '/sales-simulator',     label: 'Sales Simulator' },
      { path: '/comparison-sandbox',  label: 'Comparison Sandbox' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { path: '/daily-report',         label: 'Daily Report' },
      { path: '/daily-breakdown',      label: 'Daily Breakdown' },
      { path: '/invoice-management',   label: 'Invoice Management' },
      { path: '/installment-guide',    label: 'Installment & MDR Guide' },
      { path: '/monthly-transactions', label: 'Monthly Transactions' },
      { path: '/monthly-dps-svc',      label: 'DP, Service & Packaging' },
      { path: '/heatmap-calendar',     label: 'Heatmap Calendar' },
      { path: '/sales-journal', label: 'Sales Journal' },
      { path: '/inventory', label: 'Inventory Valuation' },
      { path: '/packaging', label: 'Packaging' },
      { path: '/stock-opname', label: 'Stock Opname' },
      { path: '/crossing-sales',       label: 'Crossing Sales' },
      { path: '/sales',                label: 'Sales Data' },
      { path: '/sales-dps-svc',        label: 'Sales Data (DP/SVC)' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { path: '/finance-reconciliation',     label: 'Reconciliation & Audit' },
      { path: '/finance-payment-analytics',  label: 'Bank Performance & MDR' },
      { path: '/finance-mdr-setup',          label: 'Bank MDR Setup' },
    ],
  },
  {
    title: 'Products & Advisors',
    items: [
      { path: '/product-rank',          label: 'Product Rank' },
      { path: '/product-projection',    label: 'Product Projection' },
      { path: '/advisor-setup',         label: 'Setup & Targets' },
      { path: '/advisor-performance',   label: 'Advisor Performance' },
      { path: '/advisor-productivity',  label: 'Advisor Productivity' },
    ],
  },
  {
    title: 'CRM & Traffic',
    items: [
      { path: '/crm-profiling',        label: 'CRM Profiling' },
      { path: '/advanced-clienteling', label: 'Advanced Clienteling' },
      { path: '/crm-dedup',            label: 'CRM & Traffic' },
      { path: '/event-selling-plan', label: 'Event Selling Plan' },
      { path: '/app-sheet-crm',      label: 'App Sheet (CRM)' },
      { path: '/footfall-store',     label: 'Footfall (Store)' },
      { path: '/footfall-crm',       label: 'Footfall (CRM)' },
      { path: '/customer-segment',   label: 'Customer Segment' },
      { path: '/clienteling-hub',    label: 'Clienteling Hub' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { path: '/user-access', label: 'User Access Config' },
    ],
  },
];
