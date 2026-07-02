"use client";

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Users, Plus, Trash2, Save, RefreshCw, Check, Lock, Unlock, X, Crown, ClipboardList, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import BvlgariLoader from '@/components/BvlgariLoader';
import { useUserAccess } from '@/lib/user-access-context';

// ── Types ──────────────────────────────────────────────────────────────────
type Role = 'super_admin' | 'management_it' | 'operations_sales' | 'crm';
type PermRole = Exclude<Role, 'super_admin'>;

interface DashboardUser {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

interface MenuAccess {
  role: PermRole;
  menu_path: string;
  allowed: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────
const ALL_ROLES: { value: Role; label: string; color: string; bg: string }[] = [
  { value: 'super_admin',      label: 'Super Admin',         color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200' },
  { value: 'management_it',    label: 'Management & IT All', color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200' },
  { value: 'operations_sales', label: 'Operations Sales',    color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  { value: 'crm',              label: 'CRM',                 color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
];

const PERM_ROLES = ALL_ROLES.filter(r => r.value !== 'super_admin') as { value: PermRole; label: string; color: string; bg: string }[];

const ROLE_LABEL: Record<Role, string> = {
  super_admin:      'Super Admin',
  management_it:    'Management & IT All',
  operations_sales: 'Operations Sales',
  crm:              'CRM',
};

const ROLE_BADGE: Record<Role, string> = {
  super_admin:      'bg-rose-100 text-rose-700',
  management_it:    'bg-indigo-100 text-indigo-700',
  operations_sales: 'bg-amber-100 text-amber-700',
  crm:              'bg-emerald-100 text-emerald-700',
};

const TABLE_LABEL: Record<string, string> = {
  dashboard_users: 'User Access Control',
  role_menu_access: 'Menu Permission Access',
  advisors: 'Advisor Profile',
  advisor_rotations: 'Advisor Rotation',
  advisor_targets: 'Advisor Monthly Target',
  footfall_store: 'Traffic Footfall (Store)',
  footfall_crm: 'Traffic Footfall (CRM)',
  clean_master: 'Transactions Data',
};

const MENU_GROUPS = [
  {
    title: 'Overview',
    items: [
      { path: '/',                    label: 'Monthly Overview' },
      { path: '/quarterly-standard',  label: 'Quarterly Standard' },
      { path: '/quarterly-budget',    label: 'Quarterly Budget' },
      { path: '/annual-sales',        label: 'Annual Net Sales' },
      { path: '/store-performance',   label: 'Store Performance' },
      { path: '/forecasting',         label: 'Forecasting (AI)' },
      { path: '/sales-simulator',     label: 'Sales Simulator' },
      { path: '/comparison-sandbox',  label: 'Comparison Sandbox' },
    ],
  },
  {
    title: 'Operasional',
    items: [
      { path: '/daily-report',         label: 'Daily Report' },
      { path: '/daily-breakdown',      label: 'Daily Breakdown' },
      { path: '/monthly-transactions', label: 'Monthly Transactions' },
      { path: '/heatmap-calendar',     label: 'Heatmap Calendar' },
      { path: '/crossing-sales',       label: 'Crossing Sales' },
      { path: '/sales',                label: 'Sales Data' },
    ],
  },
  {
    title: 'Produk & Advisor',
    items: [
      { path: '/product-rank',        label: 'Product Rank' },
      { path: '/product-projection',  label: 'Product Projection' },
      { path: '/advisor-setup',       label: 'Setup & Targets' },
      { path: '/advisor-performance', label: 'Advisor Performance' },
    ],
  },
  {
    title: 'CRM & Traffic',
    items: [
      { path: '/crm-profiling',      label: 'CRM Profiling' },
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

// ── Component ──────────────────────────────────────────────────────────────
export default function UserAccessPage() {
  const { role: currentUserRole } = useUserAccess();
  const isSuperAdmin = currentUserRole === 'super_admin';

  const [tab, setTab] = useState<'users' | 'permissions' | 'audit'>('users');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [menuAccess, setMenuAccess] = useState<MenuAccess[]>([]);
  const [activeRole, setActiveRole] = useState<PermRole>('management_it');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('operations_sales');
  const [addingUser, setAddingUser] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);

  const ITEMS_PER_PAGE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    const [usersRes, accessRes] = await Promise.all([
      supabase.from('dashboard_users').select('*').order('full_name'),
      supabase.from('role_menu_access').select('*'),
    ]);
    setUsers(usersRes.data || []);
    setMenuAccess((accessRes.data || []) as MenuAccess[]);
    setLoading(false);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (auditSearch.trim()) {
      query = query.ilike('user_email', `%${auditSearch.trim()}%`);
    }

    if (auditActionFilter !== 'ALL') {
      query = query.eq('action_type', auditActionFilter);
    }

    const from = (auditPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error) {
      setAuditLogs(data || []);
      setAuditTotal(count || 0);
    }
    setAuditLoading(false);
  }, [auditPage, auditSearch, auditActionFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 'audit') {
      loadAuditLogs();
    }
  }, [tab, loadAuditLogs]);

  const isAllowed = (role: PermRole, path: string) =>
    menuAccess.some(m => m.role === role && m.menu_path === path && m.allowed);

  const toggleAccess = (role: PermRole, path: string) => {
    const exists = menuAccess.find(m => m.role === role && m.menu_path === path);
    if (exists) {
      setMenuAccess(prev => prev.map(m =>
        m.role === role && m.menu_path === path ? { ...m, allowed: !m.allowed } : m
      ));
    } else {
      setMenuAccess(prev => [...prev, { role, menu_path: path, allowed: true }]);
    }
  };

  const savePermissions = async () => {
    setSaving(true);
    const rows = menuAccess.filter(m => m.role === activeRole);
    const { error } = await supabase
      .from('role_menu_access')
      .upsert(rows, { onConflict: 'role,menu_path' });
    setSaving(false);
    setSavedMsg(error ? 'Gagal menyimpan' : 'Tersimpan!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const addUser = async () => {
    if (!newEmail.trim() || !newName.trim()) return;
    setAddingUser(true);
    const { error } = await supabase.from('dashboard_users').insert({
      email: newEmail.trim().toLowerCase(),
      full_name: newName.trim(),
      role: newRole,
      is_active: true,
    });
    setAddingUser(false);
    if (!error) { setNewEmail(''); setNewName(''); setShowForm(false); load(); }
  };

  const toggleUserActive = async (user: DashboardUser) => {
    await supabase.from('dashboard_users').update({ is_active: !user.is_active }).eq('id', user.id);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
  };

  const changeUserRole = async (user: DashboardUser, role: Role) => {
    await supabase.from('dashboard_users').update({ role }).eq('id', user.id);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role } : u));
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Hapus user ini?')) return;
    await supabase.from('dashboard_users').delete().eq('id', id);
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  // Roles selectable when assigning: non-super_admin can't assign super_admin
  const assignableRoles = isSuperAdmin ? ALL_ROLES : ALL_ROLES.filter(r => r.value !== 'super_admin');

  if (loading) return <BvlgariLoader message="Loading User Access Config..." />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Access Configuration</h1>
          </div>
          <p className="text-slate-500 text-sm">Kelola pengguna dan hak akses menu per role</p>
        </div>
        <button type="button" onClick={load}
          className="flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ALL_ROLES.map(r => {
          const count = users.filter(u => u.role === r.value && u.is_active).length;
          const menuCount = r.value === 'super_admin'
            ? 999
            : menuAccess.filter(m => m.role === r.value && m.allowed).length;
          return (
            <div key={r.value} className={cn('rounded-2xl border p-4 flex items-start gap-3', r.bg)}>
              <div className="p-2 rounded-xl bg-white shadow-sm shrink-0">
                {r.value === 'super_admin'
                  ? <Crown className={cn('w-4 h-4', r.color)} />
                  : <ShieldCheck className={cn('w-4 h-4', r.color)} />}
              </div>
              <div className="min-w-0">
                <p className={cn('font-bold text-xs leading-tight', r.color)}>{r.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {count} user &middot; {r.value === 'super_admin' ? 'All access' : `${menuCount} menus`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['users', 'permissions', 'audit'] as const).map(t => (
          <button key={t} type="button" onClick={() => { setTab(t); if (t === 'audit') setAuditPage(1); }}
            className={cn('px-5 py-2 rounded-lg text-sm font-bold transition-all',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'users' && <span className="flex items-center gap-2"><Users className="w-4 h-4" />Users</span>}
            {t === 'permissions' && <span className="flex items-center gap-2"><Lock className="w-4 h-4" />Permissions</span>}
            {t === 'audit' && <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4" />Audit Trail</span>}
          </button>
        ))}
      </div>

      {/* ── TAB: USERS ─────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-4">
          {!showForm ? (
            <button type="button" onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-sm transition-all">
              <Plus className="w-4 h-4" /> Tambah User
            </button>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <p className="font-bold text-slate-800">Tambah User Baru</p>
                <button type="button" aria-label="Close" onClick={() => setShowForm(false)}>
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Full Name"
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="Email address" type="email"
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                <select value={newRole} onChange={e => setNewRole(e.target.value as Role)} aria-label="Select role"
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white">
                  {assignableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <button type="button" onClick={addUser} disabled={addingUser || !newEmail || !newName}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                {addingUser ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Nama</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Role</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm italic">Belum ada user terdaftar</td></tr>
                )}
                {users.map(user => {
                  const isSA = user.role === 'super_admin';
                  return (
                    <tr key={user.id} className={cn('hover:bg-slate-50 transition-colors', !user.is_active && 'opacity-50')}>
                      <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                        {isSA && <Crown className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                        {user.full_name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        {/* Super admin can only be changed by another super admin */}
                        {isSA && !isSuperAdmin ? (
                          <span className={cn('text-xs font-bold px-2 py-1 rounded-lg', ROLE_BADGE[user.role])}>
                            {ROLE_LABEL[user.role]}
                          </span>
                        ) : (
                          <select title="Change role" value={user.role} onChange={e => changeUserRole(user, e.target.value as Role)}
                            className={cn('text-xs font-bold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer', ROLE_BADGE[user.role])}>
                            {assignableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button type="button" onClick={() => toggleUserActive(user)}
                          className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                            user.is_active
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200')}>
                          {user.is_active ? <><Unlock className="w-3 h-3" />Active</> : <><Lock className="w-3 h-3" />Inactive</>}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {/* Protect super_admin from deletion unless current user is super_admin */}
                        {(!isSA || isSuperAdmin) && (
                          <button type="button" title="Hapus user" onClick={() => deleteUser(user.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: PERMISSIONS ──────────────────────────────────────── */}
      {tab === 'permissions' && (
        <div className="space-y-4">
          {/* Super Admin info banner */}
          <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
            <Crown className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700">
              <b>Super Admin</b> selalu mendapat akses ke semua menu — tidak perlu dikonfigurasi.
              Atur permissions hanya untuk role di bawah ini.
            </p>
          </div>

          {/* Role selector (exclude super_admin) */}
          <div className="flex flex-wrap gap-2">
            {PERM_ROLES.map(r => (
              <button key={r.value} type="button" onClick={() => setActiveRole(r.value)}
                className={cn('px-4 py-2 rounded-xl text-sm font-bold border transition-all',
                  activeRole === r.value ? cn(r.bg, r.color, 'shadow-sm') : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Permission matrix */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <p className="font-bold text-slate-800 text-sm">
                Menu Access — <span className={PERM_ROLES.find(r => r.value === activeRole)?.color}>{ROLE_LABEL[activeRole]}</span>
              </p>
              <p className="text-xs text-slate-400">
                {menuAccess.filter(m => m.role === activeRole && m.allowed).length} menus allowed
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {MENU_GROUPS.map(group => (
                <div key={group.title} className="px-5 py-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{group.title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.items.map(item => {
                      const allowed = isAllowed(activeRole, item.path);
                      return (
                        <button key={item.path} type="button" onClick={() => toggleAccess(activeRole, item.path)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left',
                            allowed ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                          )}>
                          <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                            allowed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300')}>
                            {allowed && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="flex-1">{item.label}</span>
                          <code className="text-[10px] text-slate-400 font-mono hidden sm:inline">{item.path}</code>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={savePermissions} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-sm">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Menyimpan...' : 'Simpan Permissions'}
            </button>
            {savedMsg && (
              <span className={cn('text-sm font-bold flex items-center gap-1.5',
                savedMsg.includes('Gagal') ? 'text-red-500' : 'text-emerald-600')}>
                {!savedMsg.includes('Gagal') && <Check className="w-4 h-4" />}
                {savedMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: AUDIT TRAIL ──────────────────────────────────────── */}
      {tab === 'audit' && (
        <div className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Cari berdasarkan email admin..."
                value={auditSearch}
                onChange={e => { setAuditSearch(e.target.value); setAuditPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm transition-all"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={auditActionFilter}
                onChange={e => { setAuditActionFilter(e.target.value); setAuditPage(1); }}
                aria-label="Filter Action Type"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none text-sm bg-white"
              >
                <option value="ALL">Semua Tindakan</option>
                <option value="INSERT">INSERT (Tambah)</option>
                <option value="UPDATE">UPDATE (Ubah)</option>
                <option value="DELETE">DELETE (Hapus)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={loadAuditLogs}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all shrink-0"
            >
              Cari
            </button>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Waktu (WITA)</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Admin</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Aksi</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Modul / Tabel</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Record ID</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                        <p className="text-xs text-slate-400 mt-2 font-medium">Memuat log aktivitas...</p>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400 text-sm italic">
                        Tidak ada log aktivitas admin ditemukan
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log: any) => {
                      let badgeColor = 'bg-slate-100 text-slate-700';
                      if (log.action_type === 'INSERT') badgeColor = 'bg-emerald-100 text-emerald-800';
                      else if (log.action_type === 'UPDATE') badgeColor = 'bg-amber-100 text-amber-800';
                      else if (log.action_type === 'DELETE') badgeColor = 'bg-rose-100 text-rose-800';

                      // Format date in WITA (Asia/Makassar) since Bvlgari outlets are in Bali and Jakarta
                      const logDate = new Date(log.created_at).toLocaleString('id-ID', {
                        timeZone: 'Asia/Makassar',
                        dateStyle: 'short',
                        timeStyle: 'medium'
                      });

                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">{logDate}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{log.user_email}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full', badgeColor)}>
                              {log.action_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            {TABLE_LABEL[log.table_name] || log.table_name}
                            <div className="text-[10px] text-slate-400 font-mono">{log.table_name}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs max-w-[150px] truncate hover:text-clip" title={log.record_id}>
                            {log.record_id || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedAudit(log)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                            >
                              <Eye className="w-4 h-4" /> Lihat
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {auditTotal > ITEMS_PER_PAGE && (
              <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">
                  Menampilkan <span className="font-bold text-slate-800">{(auditPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-slate-800">{Math.min(auditPage * ITEMS_PER_PAGE, auditTotal)}</span> dari <span className="font-bold text-slate-800">{auditTotal}</span> aktivitas
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={auditPage === 1 || auditLoading}
                    onClick={() => setAuditPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-all shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={auditPage * ITEMS_PER_PAGE >= auditTotal || auditLoading}
                    onClick={() => setAuditPage(prev => prev + 1)}
                    className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-all shrink-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Diff Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Detail Log Perubahan
                  <span className={cn(
                    'text-[10px] font-black px-2 py-0.5 rounded-full',
                    selectedAudit.action_type === 'INSERT' && 'bg-emerald-100 text-emerald-800',
                    selectedAudit.action_type === 'UPDATE' && 'bg-amber-100 text-amber-800',
                    selectedAudit.action_type === 'DELETE' && 'bg-rose-100 text-rose-800'
                  )}>
                    {selectedAudit.action_type}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Audit ID: #{selectedAudit.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                <div>
                  <p className="text-slate-400 text-xs font-semibold">ADMIN</p>
                  <p className="font-bold text-slate-800">{selectedAudit.user_email}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-semibold">TANGGAL & WAKTU (WITA)</p>
                  <p className="font-bold text-slate-800 font-mono text-xs">
                    {new Date(selectedAudit.created_at).toLocaleString('id-ID', {
                      timeZone: 'Asia/Makassar',
                      dateStyle: 'long',
                      timeStyle: 'medium'
                    })}
                  </p>
                </div>
                <div className="md:mt-2">
                  <p className="text-slate-400 text-xs font-semibold">MODUL / TABEL</p>
                  <p className="font-bold text-slate-800">
                    {TABLE_LABEL[selectedAudit.table_name] || selectedAudit.table_name} 
                    <span className="font-mono font-medium text-slate-400 text-xs ml-1">({selectedAudit.table_name})</span>
                  </p>
                </div>
                <div className="md:mt-2">
                  <p className="text-slate-400 text-xs font-semibold">RECORD ID</p>
                  <p className="font-bold text-slate-800 font-mono text-xs">{selectedAudit.record_id || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Perbedaan Data (JSON Diff)</p>
                {renderJSONDiff(selectedAudit.old_values, selectedAudit.new_values)}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-xl transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── JSON Diff Helper ───────────────────────────────────────────────────────
function renderJSONDiff(oldVal: any, newVal: any) {
  const allKeys = Array.from(new Set([
    ...Object.keys(oldVal || {}),
    ...Object.keys(newVal || {})
  ])).sort();

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs font-mono max-h-[350px] overflow-y-auto bg-white shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-widest text-[9px]">
            <th className="text-left px-4 py-2 font-bold">Kolom</th>
            <th className="text-left px-4 py-2 font-bold bg-red-50/20 text-red-600">Sebelum (Old)</th>
            <th className="text-left px-4 py-2 font-bold bg-emerald-50/20 text-emerald-600">Sesudah (New)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {allKeys.map(key => {
            if (key === 'created_at' || key === 'updated_at') return null;

            const oldRaw = oldVal ? oldVal[key] : undefined;
            const newRaw = newVal ? newVal[key] : undefined;

            const oStr = oldRaw !== undefined ? (typeof oldRaw === 'object' ? JSON.stringify(oldRaw) : String(oldRaw)) : undefined;
            const nStr = newRaw !== undefined ? (typeof newRaw === 'object' ? JSON.stringify(newRaw) : String(newRaw)) : undefined;
            const isDiff = oStr !== nStr;

            return (
              <tr key={key} className={cn(isDiff ? 'bg-amber-50/20' : 'hover:bg-slate-50/50')}>
                <td className="px-4 py-2.5 font-bold text-slate-700 border-r border-slate-100">{key}</td>
                <td className={cn(
                  "px-4 py-2.5 text-slate-500 max-w-[250px] break-all border-r border-slate-100",
                  isDiff && oStr !== undefined && "text-red-700 bg-red-50/40 font-bold"
                )}>
                  {oStr !== undefined ? oStr : <span className="text-slate-300 italic">none</span>}
                </td>
                <td className={cn(
                  "px-4 py-2.5 text-slate-500 max-w-[250px] break-all",
                  isDiff && nStr !== undefined && "text-emerald-700 bg-emerald-50/40 font-bold"
                )}>
                  {nStr !== undefined ? nStr : <span className="text-slate-300 italic">none</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
