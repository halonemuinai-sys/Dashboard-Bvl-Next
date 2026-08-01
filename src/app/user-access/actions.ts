'use server'

import { createClient } from '@/utils/supabase/server'
import { hashPassword } from '@/utils/auth'
import { revalidatePath } from 'next/cache'

export async function createUserAction(formData: { email: string; fullName: string; role: string; password?: string }) {
  const supabase = await createClient()

  let hashedPassword = null
  if (formData.password) {
    hashedPassword = await hashPassword(formData.password)
  }

  const { error } = await supabase.from('dashboard_users').insert({
    email: formData.email.trim().toLowerCase(),
    full_name: formData.fullName.trim(),
    role: formData.role,
    password: hashedPassword,
    is_active: true,
  })

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
