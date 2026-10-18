"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ShieldCheck, Users, Plus, Trash2, Save, RefreshCw, Check, Lock, X, Search, Eye, ChevronLeft, ChevronRight, KeyRound, ArrowUpRight, Building2, CircleCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLES, ROLE_LABEL, STORES, MENU_GROUPS, hasMenuAccess, isFixedPermission, type Role, type DashboardUser, type MenuAccess, type AuditLog } from '@/lib/access-policy';
import { loadUserAccessAction, createUserAction, updateUserAction, deleteUserAction, resetUserPasswordAction, savePermissionsAction, loadAuditAction } from './actions';
import styles from './user-access.module.css';

type Notice = { kind: 'success' | 'error'; text: string } | null;
const paths = MENU_GROUPS.flatMap(group => group.items.map(item => item.path));
const date = (value: string) => new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' });

function Modal({ title, onClose, busy, children }: { title: string; onClose: () => void; busy: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={styles.dialog} aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className={styles.modalHeader}><div><span className={styles.eyebrow}>ACCESS MANAGEMENT</span><h2>{title}</h2></div><button type="button" className={styles.iconButton} disabled={busy} onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>
    <div className={styles.modalBody}>{children}</div>
  </dialog>;
}

export default function UserAccessPage() {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [permissions, setPermissions] = useState<MenuAccess[]>([]);
  const [savedPermissions, setSavedPermissions] = useState<MenuAccess[]>([]);
  const [actor, setActor] = useState<DashboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [tab, setTab] = useState<'users' | 'permissions' | 'audit'>('users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeRole, setActiveRole] = useState<Role>('operations_sales');
  const [menuSearch, setMenuSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'reset' | 'delete' | null>(null);
  const [target, setTarget] = useState<DashboardUser | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState('ALL');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditRefresh, setAuditRefresh] = useState(0);
  const [selectedAudit, setSelectedAudit] = useState<AuditLog | null>(null);
  const mutationLock = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadUserAccessAction();
      if (!result.ok) { setActor(null); setUsers([]); setNotice({ kind: 'error', text: result.error }); return; }
      setUsers(result.data.users); setPermissions(result.data.permissions); setSavedPermissions(result.data.permissions); setActor(result.data.actor);
    } catch { setActor(null); setNotice({ kind: 'error', text: 'Could not connect to the server. Please try again.' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const changedRows = permissions.filter(row => !isFixedPermission(row.role, row.menu_path) && row.allowed !== (savedPermissions.find(saved => saved.role === row.role && saved.menu_path === row.menu_path)?.allowed ?? false));
  const roleChanges = changedRows.filter(row => row.role === activeRole);
  const dirty = changedRows.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (tab !== 'audit' || !actor) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setAuditLoading(true); setAuditError('');
      try {
        const result = await loadAuditAction({ page: auditPage, search: auditSearch, action: auditAction });
        if (cancelled) return;
        if (!result.ok) { setAuditError(result.error); setAuditLogs([]); setAuditTotal(0); }
        else { setAuditLogs(result.data.logs); setAuditTotal(result.data.total); }
      } catch { if (!cancelled) { setAuditError('Could not load the audit trail. Please retry.'); setAuditLogs([]); setAuditTotal(0); } }
      finally { if (!cancelled) setAuditLoading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [tab, actor, auditPage, auditSearch, auditAction, auditRefresh]);

  async function mutate(work: () => Promise<void>) {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setNotice(null);
    try { await work(); }
    catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'The request failed. Please try again.' }); }
    finally { mutationLock.current = false; setBusy(false); }
  }
  const canManage = (user: DashboardUser) => actor?.role === 'super_admin' || user.role !== 'super_admin';
  const allowed = (role: Role, path: string, rows = permissions) => hasMenuAccess(role, rows.filter(row => row.role === role && row.allowed).map(row => row.menu_path), path);
  const visibleUsers = users.filter(user => `${user.full_name} ${user.email}`.toLowerCase().includes(search.toLowerCase().trim()) && (roleFilter === 'ALL' || user.role === roleFilter) && (statusFilter === 'ALL' || user.is_active === (statusFilter === 'active')));
  const activeUsers = users.filter(user => user.is_active).length;
  const openModal = (mode: 'create' | 'reset' | 'delete', user: DashboardUser | null = null) => { setNotice(null); setTarget(user); setModal(mode); };
  const closeModal = () => { setModal(null); setTarget(null); };
  const updateUser = (user: DashboardUser, changes: { role?: Role; assigned_store?: string; is_active?: boolean }) => void mutate(async () => {
    const result = await updateUserAction(user.id, changes);
    if (!result.ok) throw new Error(result.error);
    setUsers(current => current.map(item => item.id === user.id ? result.data : item));
    setNotice({ kind: 'success', text: `${user.full_name}'s account has been updated.` });
    window.dispatchEvent(new Event('bvl-access-updated'));
  });
  const feedback = notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} className={cn(styles.notice, notice.kind === 'error' ? styles.error : styles.success)}>{notice.kind === 'error' ? <AlertCircle size={17} /> : <CircleCheck size={17} />}<span>{notice.text}</span></div>;

  if (loading && !actor) return <div className={styles.state}><RefreshCw size={26} className="animate-spin" /><h2>Loading access configuration</h2><p>Verifying your administrator access.</p></div>;
  if (!actor) return <div className={styles.state}><ShieldCheck size={32} /><h2>Access configuration is unavailable</h2>{feedback}<button className={styles.secondary} onClick={() => void load()}>Try again</button></div>;

  return <div className={styles.page} lang="en">
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>ADMINISTRATION / ACCESS CONTROL</span><h1>User Access Configuration</h1><p>Manage your team, define access, and review account activity.</p></div>
      <div className={styles.headerActions}><button type="button" disabled={loading || busy || dirty} onClick={() => { setNotice(null); void load(); setAuditRefresh(value => value + 1); }} className={styles.secondary} title={dirty ? 'Save or discard permission changes before refreshing' : 'Refresh data'}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button><button type="button" className={styles.primary} disabled={busy} onClick={() => openModal('create')}><Plus size={16} />Add user</button></div>
    </header>
    {!modal && feedback}
    <div className={styles.metrics}>
      {[{ label: 'Total users', value: users.length, detail: 'Across all assigned stores', icon: Users }, { label: 'Active accounts', value: activeUsers, detail: `${users.length - activeUsers} inactive accounts`, icon: CircleCheck }, { label: 'Access roles', value: ROLES.length, detail: '2 configurable · 3 fixed policies', icon: ShieldCheck }, { label: 'Assigned stores', value: new Set(users.filter(user => user.assigned_store && user.assigned_store !== 'ALL').map(user => user.assigned_store)).size, detail: 'Individual store assignments', icon: Building2 }].map(metric => <div key={metric.label} className={styles.metric}><div><span>{metric.label}</span><strong>{metric.value}</strong><p>{metric.detail}</p></div><metric.icon size={20} /></div>)}
    </div>
    <div className={styles.tabBar}><div className={styles.tabs} role="tablist" aria-label="Access configuration">
      {(['users', 'permissions', 'audit'] as const).map((value, index, tabs) => <button key={value} type="button" role="tab" id={`tab-${value}`} aria-selected={tab === value} aria-controls={`panel-${value}`} tabIndex={tab === value ? 0 : -1} onKeyDown={event => { if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return; event.preventDefault(); const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; setTab(next); document.getElementById(`tab-${next}`)?.focus(); }} onClick={() => setTab(value)} className={cn(styles.tab, tab === value && styles.selectedTab)}>{value === 'users' ? <Users size={16} /> : value === 'permissions' ? <Lock size={16} /> : <ShieldCheck size={16} />}{value === 'users' ? 'Team members' : value === 'permissions' ? 'Role permissions' : 'Audit trail'}{value === 'users' && <span>{users.length}</span>}{value === 'permissions' && dirty && <span>{changedRows.length}</span>}</button>)}
    </div><span className={styles.adminBadge}><ShieldCheck size={13} />{ROLE_LABEL[actor.role]}</span></div>

    {tab === 'users' && <section id="panel-users" role="tabpanel" aria-labelledby="tab-users" className={styles.card}>
      <div className={styles.cardHeading}><div><h2>Team directory</h2><p>Control account status, role, and store assignment.</p></div><span>{visibleUsers.length} of {users.length} users</span></div>
      <div className={styles.filters}><div className={styles.search}><Search size={17} /><input aria-label="Search users" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name or email..." /></div><select aria-label="Filter by role" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="ALL">All roles</option>{ROLES.map(role => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select><select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Team member</th><th>Access role</th><th>Store assignment</th><th>Status</th><th className={styles.right}>Actions</th></tr></thead><tbody>
        {visibleUsers.map(user => <tr key={user.id}>
          <td><div className={styles.member}><span className={styles.avatar}>{user.full_name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase() || '?'}</span><div><strong>{user.full_name}{user.id === actor.id && <small>You</small>}</strong><span>{user.email}</span></div></div></td>
          <td><select aria-label={`Role for ${user.full_name}`} disabled={busy || !canManage(user) || user.id === actor.id} value={user.role} onChange={event => updateUser(user, { role: event.target.value as Role })}>{ROLES.filter(role => actor.role === 'super_admin' || role !== 'super_admin' || user.role === role).map(role => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select></td>
          <td><select aria-label={`Store for ${user.full_name}`} disabled={busy || !canManage(user)} value={user.assigned_store || 'ALL'} onChange={event => updateUser(user, { assigned_store: event.target.value })}>{STORES.map(store => <option key={store} value={store}>{store === 'ALL' ? 'All stores' : store}</option>)}</select></td>
          <td><button type="button" className={cn(styles.status, user.is_active && styles.activeStatus)} disabled={busy || !canManage(user) || user.id === actor.id} aria-label={`${user.is_active ? 'Deactivate' : 'Activate'} ${user.full_name}`} onClick={() => updateUser(user, { is_active: !user.is_active })}><span />{user.is_active ? 'Active' : 'Inactive'}</button></td>
          <td><div className={styles.rowActions}><button type="button" className={styles.iconButton} title="Reset password" aria-label={`Reset password for ${user.full_name}`} disabled={busy || !canManage(user)} onClick={() => openModal('reset', user)}><KeyRound size={16} /></button><button type="button" className={cn(styles.iconButton, styles.dangerIcon)} title="Delete account" aria-label={`Delete ${user.full_name}`} disabled={busy || !canManage(user) || user.id === actor.id} onClick={() => openModal('delete', user)}><Trash2 size={16} /></button></div></td>
        </tr>)}
        {!visibleUsers.length && <tr><td colSpan={5}><div className={styles.empty}><Users size={26} /><h3>{users.length ? 'No matching team members' : 'No team members yet'}</h3><p>{users.length ? 'Try a different name, role, or status.' : 'Add a user to get started.'}</p></div></td></tr>}
      </tbody></table></div>
      <div className={styles.tableFooter}><ShieldCheck size={14} />Your own role and account status are protected from accidental changes.</div>
    </section>}

    {tab === 'permissions' && <section id="panel-permissions" role="tabpanel" aria-labelledby="tab-permissions" className={styles.permissionLayout}>
      <aside className={styles.roleList}><span className={styles.eyebrow}>SELECT A ROLE</span>{ROLES.map(role => <button key={role} type="button" onClick={() => setActiveRole(role)} className={cn(styles.roleOption, activeRole === role && styles.selectedRole)}><ShieldCheck size={17} /><div><strong>{ROLE_LABEL[role]}</strong><span>{users.filter(user => user.role === role && user.is_active).length} active users · {paths.filter(path => allowed(role, path)).length} menus</span></div><ArrowUpRight size={14} /></button>)}</aside>
      <div className={styles.card}>
        <div className={styles.cardHeading}><div><h2>{ROLE_LABEL[activeRole]}</h2><p>{activeRole === 'super_admin' || activeRole === 'management_it' ? 'Full access is included in this role and cannot be restricted here.' : activeRole === 'finance' ? 'Finance uses a fixed policy for its approved operational and finance menus.' : 'Choose the menus this role can access. Locked permissions follow the system policy.'}</p></div><span className={styles.policyBadge}>{activeRole === 'operations_sales' || activeRole === 'crm' ? 'Configurable' : 'Fixed policy'}</span></div>
        <div className={styles.filters}><div className={styles.search}><Search size={16} /><input aria-label="Search permissions" placeholder="Find a menu permission..." value={menuSearch} onChange={event => setMenuSearch(event.target.value)} /></div><span>{paths.filter(path => allowed(activeRole, path)).length} / {paths.length} enabled</span></div>
        <div className={styles.permissionGroups}>{MENU_GROUPS.map(group => {
          const items = group.items.filter(item => `${item.label} ${group.title}`.toLowerCase().includes(menuSearch.toLowerCase().trim()));
          if (!items.length) return null;
          return <div key={group.title} className={styles.permissionGroup}><h3>{group.title}</h3><div>{items.map(item => {
            const enabled = allowed(activeRole, item.path);
            const fixed = isFixedPermission(activeRole, item.path);
            return <button type="button" key={item.path} role="switch" aria-checked={enabled} aria-label={`${item.label}${fixed ? ', fixed by policy' : ''}`} disabled={busy || fixed} className={cn(styles.permission, enabled && styles.permissionEnabled)} onClick={() => setPermissions(current => [...current.filter(row => !(row.role === activeRole && row.menu_path === item.path)), { role: activeRole, menu_path: item.path, allowed: !enabled }])}><span>{item.label}</span>{fixed ? <Lock size={13} /> : null}<span className={cn(styles.switch, enabled && styles.switchOn)}><span /></span></button>;
          })}</div></div>;
        })}{!MENU_GROUPS.some(group => group.items.some(item => `${item.label} ${group.title}`.toLowerCase().includes(menuSearch.toLowerCase().trim()))) && <div className={styles.empty}><p>No permissions match your search.</p></div>}</div>
        <div className={styles.saveBar}><span>{roleChanges.length ? `${roleChanges.length} unsaved changes for this role` : 'No unsaved changes for this role'}</span><div><button type="button" className={styles.secondary} disabled={busy || !roleChanges.length} onClick={() => setPermissions(current => [...current.filter(row => row.role !== activeRole), ...savedPermissions.filter(row => row.role === activeRole)])}>Discard</button><button type="button" className={styles.primary} disabled={busy || !roleChanges.length} onClick={() => void mutate(async () => {
          const result = await savePermissionsAction(activeRole, roleChanges.map(({ menu_path, allowed }) => ({ menu_path, allowed })));
          if (!result.ok) throw new Error(result.error);
          setSavedPermissions(current => [...current.filter(row => row.role !== activeRole), ...permissions.filter(row => row.role === activeRole)]);
          setNotice({ kind: 'success', text: `${ROLE_LABEL[activeRole]} permissions saved.` });
          window.dispatchEvent(new Event('bvl-access-updated'));
        })}><Save size={15} />{busy ? 'Saving...' : 'Save changes'}</button></div></div>
      </div>
    </section>}

    {tab === 'audit' && <section id="panel-audit" role="tabpanel" aria-labelledby="tab-audit" className={styles.card}>
      <div className={styles.cardHeading}><div><h2>Activity history</h2><p>Review recorded changes. Times shown in Jakarta time (WIB, UTC+7).</p></div><span>{auditTotal} records</span></div>
      <div className={styles.filters}><div className={styles.search}><Search size={16} /><input aria-label="Search audit by actor email" maxLength={254} placeholder="Search actor email..." value={auditSearch} onChange={event => { setAuditSearch(event.target.value); setAuditPage(1); setAuditLoading(true); }} /></div><select aria-label="Filter audit action" value={auditAction} onChange={event => { setAuditAction(event.target.value); setAuditPage(1); setAuditLoading(true); }}><option value="ALL">All actions</option>{['INSERT', 'UPDATE', 'DELETE'].map(action => <option key={action}>{action}</option>)}</select><button type="button" className={styles.secondary} disabled={auditLoading} onClick={() => setAuditRefresh(value => value + 1)}><RefreshCw size={15} />Refresh</button></div>
      {auditError && <div role="alert" className={cn(styles.notice, styles.error)}>{auditError}</div>}
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Date & time · WIB</th><th>Actor</th><th>Action</th><th>Resource</th><th>Record</th><th>Details</th></tr></thead><tbody>
        {auditLoading ? <tr><td colSpan={6}><div className={styles.empty} role="status"><RefreshCw className="animate-spin" size={22} /><p>Loading activity...</p></div></td></tr> : auditLogs.map(log => <tr key={log.id}><td className={styles.nowrap}>{date(log.created_at)}</td><td>{log.user_email || 'System'}</td><td><span className={cn(styles.auditBadge, log.action_type === 'DELETE' && styles.deleteBadge)}>{log.action_type}</span></td><td>{log.table_name.replaceAll('_', ' ')}</td><td className={styles.recordId}>{log.record_id || '—'}</td><td><button type="button" className={styles.iconButton} aria-label={`View audit record ${log.id}`} onClick={() => setSelectedAudit(log)}><Eye size={16} /></button></td></tr>)}
        {!auditLoading && !auditLogs.length && <tr><td colSpan={6}><div className={styles.empty}><ShieldCheck size={25} /><h3>{auditError ? 'Activity could not be loaded' : 'No activity found'}</h3><p>{auditError ? 'Retry using Refresh.' : 'Try another email or action filter.'}</p></div></td></tr>}
      </tbody></table></div>
      <div className={styles.pagination}><span>{auditTotal ? `${(auditPage - 1) * 15 + 1}–${Math.min(auditPage * 15, auditTotal)} of ${auditTotal} records` : '0 records'}</span><div><button type="button" className={styles.iconButton} aria-label="Previous page" disabled={auditPage === 1 || auditLoading} onClick={() => { setAuditPage(page => page - 1); setAuditLoading(true); }}><ChevronLeft size={17} /></button><span>Page {auditPage}</span><button type="button" className={styles.iconButton} aria-label="Next page" disabled={auditPage * 15 >= auditTotal || auditLoading} onClick={() => { setAuditPage(page => page + 1); setAuditLoading(true); }}><ChevronRight size={17} /></button></div></div>
    </section>}

    {modal && <Modal title={modal === 'create' ? 'Add team member' : modal === 'reset' ? 'Reset password' : 'Delete account'} busy={busy} onClose={closeModal}>
      {feedback}
      {modal === 'create' && <form className={styles.form} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void mutate(async () => {
        const result = await createUserAction({ fullName: String(form.get('name')), email: String(form.get('email')), password: String(form.get('password')), role: String(form.get('role')), assignedStore: String(form.get('store')) });
        if (!result.ok) throw new Error(result.error);
        setUsers(current => [...current, result.data].sort((a, b) => a.full_name.localeCompare(b.full_name))); closeModal(); setNotice({ kind: 'success', text: 'Team member created successfully.' });
      }); }}><p>Give a team member access to the retail workspace.</p><label>Full name<input name="name" required maxLength={150} autoComplete="name" /></label><label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" /></label><label>Initial password<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" /><small>8–128 characters. Share the password through your approved channel.</small></label><div className={styles.formGrid}><label>Role<select name="role" defaultValue="operations_sales">{ROLES.filter(role => actor.role === 'super_admin' || role !== 'super_admin').map(role => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select></label><label>Store assignment<select name="store">{STORES.map(store => <option key={store} value={store}>{store === 'ALL' ? 'All stores' : store}</option>)}</select></label></div><div className={styles.modalActions}><button type="button" className={styles.secondary} disabled={busy} onClick={closeModal}>Cancel</button><button className={styles.primary} disabled={busy} type="submit"><Plus size={16} />{busy ? 'Creating...' : 'Create account'}</button></div></form>}
      {modal === 'reset' && target && <form className={styles.form} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void mutate(async () => { const result = await resetUserPasswordAction(target.id, String(form.get('password'))); if (!result.ok) throw new Error(result.error); closeModal(); setNotice({ kind: 'success', text: 'Password updated successfully.' }); }); }}><p>Set a new password for <strong>{target.full_name}</strong> ({target.email}).</p><label>New password<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" /><small>Use 8–128 characters.</small></label><div className={styles.modalActions}><button type="button" className={styles.secondary} onClick={closeModal} disabled={busy}>Cancel</button><button type="submit" className={styles.primary} disabled={busy}><KeyRound size={16} />{busy ? 'Updating...' : 'Update password'}</button></div></form>}
      {modal === 'delete' && target && <div className={styles.form}><p>Delete the account for <strong>{target.full_name}</strong> ({target.email})? This cannot be undone. To keep the account, change its status to inactive instead.</p><div className={styles.modalActions}><button type="button" className={styles.secondary} disabled={busy} onClick={closeModal}>Cancel</button><button type="button" className={styles.danger} disabled={busy} onClick={() => void mutate(async () => { const result = await deleteUserAction(target.id); if (!result.ok) throw new Error(result.error); setUsers(current => current.filter(user => user.id !== target.id)); closeModal(); setNotice({ kind: 'success', text: 'Account deleted.' }); })}><Trash2 size={16} />{busy ? 'Deleting...' : 'Delete account'}</button></div></div>}
    </Modal>}
    {selectedAudit && <Modal title="Activity details" busy={false} onClose={() => setSelectedAudit(null)}><div className={styles.auditSummary}><strong>{selectedAudit.action_type} · {selectedAudit.table_name.replaceAll('_', ' ')}</strong><p>{selectedAudit.user_email} · {date(selectedAudit.created_at)} WIB</p></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>{Array.from(new Set([...Object.keys(selectedAudit.old_values || {}), ...Object.keys(selectedAudit.new_values || {})])).sort().map(key => {
      const before = JSON.stringify(selectedAudit.old_values?.[key]); const after = JSON.stringify(selectedAudit.new_values?.[key]);
      return <tr key={key} className={before !== after ? styles.diffRow : undefined}><td>{key}</td><td className={styles.diffValue}>{before ?? '—'}</td><td className={styles.diffValue}>{after ?? '—'}</td></tr>;
    })}</tbody></table></div><p className={styles.hint}>Sensitive credential fields are redacted.</p></Modal>}
  </div>;
}
