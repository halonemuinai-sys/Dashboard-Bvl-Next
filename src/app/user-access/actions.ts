'use server'

import { createClient } from '@/utils/supabase/server'
import { hashPassword } from '@/utils/auth'
import { revalidatePath } from 'next/cache'

export async function createUserAction(formData: { email: string; fullName: string; role: string; assignedStore?: string; password?: string }) {
  const supabase = await createClient()

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
  const supabase = await createClient()
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
