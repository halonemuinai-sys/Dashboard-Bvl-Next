'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { hashPassword } from '@/utils/auth'
import { revalidatePath } from 'next/cache'

export async function createUserAction(formData: { email: string; fullName: string; role: string; assignedStore?: string; password?: string }) {
  const supabase = createAdminClient()

  let hashedPassword = null
  if (formData.password) {
    hashedPassword = await hashPassword(formData.password)
  }

  const payload: any = {
    email: formData.email.trim().toLowerCase(),
    full_name: formData.fullName.trim(),
    role: formData.role,
    password: hashedPassword,
    is_active: true,
  }

  let { error } = await supabase.from('dashboard_users').insert({
    ...payload,
    assigned_store: formData.assignedStore || 'ALL',
  })

  if (error && error.message.includes('assigned_store')) {
    const fallback = await supabase.from('dashboard_users').insert(payload)
    error = fallback.error
  }

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/user-access')
}

export async function resetUserPasswordAction(userId: number, password: string) {
  const supabase = createAdminClient()
  const hashedPassword = await hashPassword(password)

  const { error } = await supabase
    .from('dashboard_users')
    .update({ password: hashedPassword })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/user-access')
}

/**
 * Reads users (excluding password hash) + role_menu_access rows.
 * dashboard_users/role_menu_access are RLS-locked (anon has zero access),
 * so this read must happen server-side with the Service Role key.
 */
export async function getUserAccessDataAction() {
  const supabase = createAdminClient()

  const [usersRes, accessRes, advisorsRes] = await Promise.all([
    supabase.from('dashboard_users')
      .select('id, email, full_name, role, assigned_store, is_active')
      .order('full_name'),
    supabase.from('role_menu_access').select('*'),
    supabase.from('advisors').select('name, home_location'),
  ])

  if (usersRes.error) throw new Error(usersRes.error.message)
  if (accessRes.error) throw new Error(accessRes.error.message)

  const advisorMap = new Map<string, string>()
  ;(advisorsRes.data || []).forEach((a: any) => {
    if (a.name && a.home_location) advisorMap.set(a.name.toLowerCase().trim(), a.home_location)
  })

  const users = (usersRes.data || []).map((u: any) => ({
    ...u,
    assigned_store: advisorMap.get(u.full_name.toLowerCase().trim()) || u.assigned_store || 'ALL',
  }))

  return { users, menuAccess: accessRes.data || [] }
}

export async function toggleUserActiveAction(userId: number, nextActive: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('dashboard_users').update({ is_active: nextActive }).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/user-access')
}

export async function changeUserRoleAction(userId: number, role: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('dashboard_users').update({ role }).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/user-access')
}

export async function changeUserStoreAction(userId: number, fullName: string, assignedStore: string) {
  const supabase = createAdminClient()

  // Keep advisors table in sync (same behavior as before)
  const { data: advList } = await supabase.from('advisors').select('id, name')
  const matchAdv = (advList || []).find((a: any) => a.name.toLowerCase().trim() === fullName.toLowerCase().trim())
  if (matchAdv) {
    await supabase.from('advisors').update({ home_location: assignedStore }).eq('id', matchAdv.id)
  } else {
    await supabase.from('advisors').insert({ name: fullName, home_location: assignedStore, is_active: true })
  }

  const { error } = await supabase.from('dashboard_users').update({ assigned_store: assignedStore }).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/user-access')
}

export async function deleteUserAction(userId: number) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('dashboard_users').delete().eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/user-access')
}

export async function savePermissionsAction(rows: { role: string; menu_path: string; allowed: boolean }[]) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('role_menu_access').upsert(rows, { onConflict: 'role,menu_path' })
  if (error) throw new Error(error.message)
  revalidatePath('/user-access')
}
