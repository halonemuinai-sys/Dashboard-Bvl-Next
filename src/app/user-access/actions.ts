'use server';

import { revalidatePath } from 'next/cache';
import { requireAccessAdmin } from '@/lib/server-access';
import { hashPassword } from '@/utils/auth';
import { assertUserChange, CONFIGURABLE_ROLES, isRole, isFixedPermission, MENU_GROUPS, STORES, validatePassword, redactAuditValue, type Role, type DashboardUser, type MenuAccess, type AuditLog } from '@/lib/access-policy';

const USER_FIELDS = 'id,email,full_name,role,is_active';
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(work: () => Promise<T>): Promise<Result<T>> {
  try { return { ok: true, data: await work() }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'The request could not be completed.' }; }
}

function checkDb(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === '23505') throw new Error('An account with this email already exists.');
  throw new Error('The database could not complete this request: ' + error.message);
}

function checkId(id: number) { if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid user ID.'); }

async function getAdvisorStoreMap(db: any) {
  const { data } = await db.from('advisors').select('name,home_location');
  const map = new Map<string, string>();
  (data || []).forEach((a: any) => {
    if (a.name && a.home_location) map.set(a.name.toLowerCase().trim(), a.home_location);
  });
  return map;
}

async function targetUser(id: number) {
  checkId(id);
  const { db, user } = await requireAccessAdmin();
  const { data, error } = await db.from('dashboard_users').select(USER_FIELDS).eq('id', id).single();
  checkDb(error);
  if (!data) throw new Error('This account no longer exists. Refresh the list.');
  const advMap = await getAdvisorStoreMap(db);
  const target: DashboardUser = {
    ...data,
    assigned_store: advMap.get(data.full_name.toLowerCase().trim()) || 'ALL'
  };
  return { db, actor: user, target };
}

export async function loadUserAccessAction() {
  return run(async () => {
    const { db, user } = await requireAccessAdmin();
    const [usersRes, permissionsRes, advisorsRes] = await Promise.all([
      db.from('dashboard_users').select(USER_FIELDS).order('full_name'),
      db.from('role_menu_access').select('role,menu_path,allowed'),
      db.from('advisors').select('name,home_location'),
    ]);
    checkDb(usersRes.error); checkDb(permissionsRes.error);
    const advMap = new Map<string, string>();
    (advisorsRes.data || []).forEach((a: any) => {
      if (a.name && a.home_location) advMap.set(a.name.toLowerCase().trim(), a.home_location);
    });
    const users: DashboardUser[] = (usersRes.data || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      assigned_store: advMap.get(u.full_name.toLowerCase().trim()) || 'ALL',
      is_active: u.is_active,
    }));
    return { users, permissions: (permissionsRes.data || []) as MenuAccess[], actor: user };
  });
}

export async function createUserAction(input: { email: string; fullName: string; role: string; assignedStore?: string; password?: string }) {
  return run(async () => {
    const { db, user } = await requireAccessAdmin();
    if (!isRole(input.role)) throw new Error('Select a valid role.');
    if (input.role === 'super_admin' && user.role !== 'super_admin') throw new Error('Only a Super Admin can create another Super Admin.');
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Enter a valid email address.');
    if (!fullName || fullName.length > 150) throw new Error('Enter a name of up to 150 characters.');
    const assignedStore = input.assignedStore || 'ALL';
    if (!(STORES as readonly string[]).includes(assignedStore)) throw new Error('Select a valid store.');
    validatePassword(input.password || '');

    const { data, error } = await db.from('dashboard_users').insert({
      email,
      full_name: fullName,
      role: input.role,
      password: await hashPassword(input.password!),
      is_active: true
    }).select(USER_FIELDS).single();
    checkDb(error);

    // Sync store assignment to advisors table
    if (assignedStore !== 'ALL') {
      try {
        const { data: advList } = await db.from('advisors').select('id, name');
        const match = (advList || []).find((a: any) => a.name.toLowerCase().trim() === fullName.toLowerCase().trim());
        if (match) {
          await db.from('advisors').update({ home_location: assignedStore }).eq('id', match.id);
        } else {
          await db.from('advisors').insert({ name: fullName, home_location: assignedStore, is_active: true });
        }
      } catch (e) {
        console.error('Error syncing advisor store:', e);
      }
    }

    revalidatePath('/user-access');
    return { ...data, assigned_store: assignedStore } as DashboardUser;
  });
}

export async function updateUserAction(id: number, changes: { role?: Role; assigned_store?: string; is_active?: boolean }) {
  return run(async () => {
    const { db, actor, target } = await targetUser(id);
    if (changes.role !== undefined && !isRole(changes.role)) throw new Error('Select a valid role.');
    if (changes.assigned_store !== undefined && !(STORES as readonly string[]).includes(changes.assigned_store)) throw new Error('Select a valid store.');
    if (changes.is_active !== undefined && typeof changes.is_active !== 'boolean') throw new Error('Invalid account status.');
    assertUserChange(actor, target, changes);

    // 1. Sync store assignment to advisors table
    if (changes.assigned_store !== undefined) {
      try {
        const { data: advList } = await db.from('advisors').select('id, name');
        const match = (advList || []).find((a: any) => a.name.toLowerCase().trim() === target.full_name.toLowerCase().trim());
        if (match) {
          await db.from('advisors').update({ home_location: changes.assigned_store }).eq('id', match.id);
        } else {
          await db.from('advisors').insert({ name: target.full_name, home_location: changes.assigned_store, is_active: true });
        }
      } catch (e) {
        console.error('Error syncing advisor store:', e);
      }
    }

    // 2. Update role and status in dashboard_users
    const payload: { role?: Role; is_active?: boolean } = {};
    if (changes.role !== undefined) payload.role = changes.role;
    if (changes.is_active !== undefined) payload.is_active = changes.is_active;

    let updatedRow = target;
    if (Object.keys(payload).length > 0) {
      const { data, error } = await db.from('dashboard_users').update(payload).eq('id', id).eq('role', target.role).select(USER_FIELDS).single();
      checkDb(error);
      if (!data) throw new Error('Account update failed.');
      updatedRow = { ...target, ...data };
    }

    revalidatePath('/user-access');
    return {
      ...updatedRow,
      assigned_store: changes.assigned_store !== undefined ? changes.assigned_store : target.assigned_store
    } as DashboardUser;
  });
}

export async function resetUserPasswordAction(id: number, password: string) {
  return run(async () => {
    const { db, actor, target } = await targetUser(id);
    assertUserChange(actor, target, {});
    validatePassword(password);
    const { error } = await db.from('dashboard_users').update({ password: await hashPassword(password) }).eq('id', id).eq('role', target.role).select('id').single();
    checkDb(error);
    revalidatePath('/user-access');
    return null;
  });
}

export async function deleteUserAction(id: number) {
  return run(async () => {
    const { db, actor, target } = await targetUser(id);
    assertUserChange(actor, target, {}, true);
    const { error } = await db.from('dashboard_users').delete().eq('id', id).eq('role', target.role).select('id').single();
    checkDb(error);
    revalidatePath('/user-access');
    return null;
  });
}

export async function savePermissionsAction(role: Role, rows: { menu_path: string; allowed: boolean }[]) {
  return run(async () => {
    const { db } = await requireAccessAdmin();
    if (!CONFIGURABLE_ROLES.includes(role)) throw new Error('This role uses a fixed access policy.');
    const paths = new Set(MENU_GROUPS.flatMap(group => group.items.map(item => item.path)));
    if (!Array.isArray(rows) || rows.length > paths.size) throw new Error('Invalid permission list.');
    if (new Set(rows.map(row => row.menu_path)).size !== rows.length) throw new Error('Duplicate permission paths.');
    for (const row of rows) {
      if (!paths.has(row.menu_path) || typeof row.allowed !== 'boolean' || isFixedPermission(role, row.menu_path)) throw new Error('This permission cannot be changed.');
    }
    if (rows.length) {
      const { error } = await db.from('role_menu_access').upsert(rows.map(row => ({ ...row, role })), { onConflict: 'role,menu_path' });
      checkDb(error);
    }
    revalidatePath('/user-access');
    return null;
  });
}

export async function loadAuditAction(input: { page: number; search: string; action: string }) {
  return run(async () => {
    const { db } = await requireAccessAdmin();
    if (!Number.isSafeInteger(input.page) || input.page < 1 || !['ALL', 'INSERT', 'UPDATE', 'DELETE'].includes(input.action) || typeof input.search !== 'string' || input.search.length > 254) throw new Error('Invalid audit filters.');
    let query = db.from('audit_logs').select('id,user_email,action_type,table_name,record_id,created_at,old_values,new_values', { count: 'exact' });
    if (input.search.trim()) query = query.ilike('user_email', `%${input.search.trim().replace(/[\\%_]/g, '\\$&')}%`);
    if (input.action !== 'ALL') query = query.eq('action_type', input.action);
    const { data, error, count } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).range((input.page - 1) * 15, input.page * 15 - 1);
    checkDb(error);
    return { total: count || 0, logs: (data || []).map(row => ({ ...row, old_values: redactAuditValue(row.old_values), new_values: redactAuditValue(row.new_values) })) as AuditLog[] };
  });
}
