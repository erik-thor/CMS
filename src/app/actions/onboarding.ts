'use server'

import { getSessionUser } from '../../lib/auth'
import { prisma } from '../../lib/db'
import { revalidatePath } from 'next/cache'

export async function updateDisplayNameAction(prevState: any, formData: FormData) {
  const user = await getSessionUser()
  if (!user) {
    return { success: false, error: 'You must be logged in.' }
  }

  const displayName = formData.get('displayName') as string
  if (!displayName || displayName.trim().length < 2) {
    return { success: false, error: 'Display name must be at least 2 characters long.' }
  }

  if (displayName.trim().length > 30) {
    return { success: false, error: 'Display name cannot exceed 30 characters.' }
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { display_name: displayName.trim() },
    })

    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Update display name error:', err)
    return { success: false, error: 'Failed to update profile. Name might already be taken or invalid.' }
  }
}
