'use server'

import { getSessionUser } from '../../lib/auth'
import { prisma } from '../../lib/db'
import { revalidatePath } from 'next/cache'

async function requireUser() {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('You must be logged in to participate.')
  }
  if (!user.display_name) {
    throw new Error('Onboarding incomplete. Choose a display name first.')
  }
  return user
}

export async function addCommentAction(
  postId: string,
  blockId: string,
  text: string,
  parentId: string | null = null
) {
  const user = await requireUser()

  if (!text.trim()) {
    throw new Error('Comment text cannot be empty.')
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        user_id: user.id,
        post_id: postId,
        block_id: blockId,
        text: text.trim(),
        parent_id: parentId,
      },
      include: {
        user: true,
      },
    })

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { slug: true } })
    if (post) {
      revalidatePath(`/posts/${post.slug}`)
      revalidatePath(`/community`)
    }

    return { success: true, comment }
  } catch (err: any) {
    console.error('Add comment error:', err)
    throw new Error(err.message || 'Failed to submit comment.')
  }
}

export async function toggleReactionAction(postId: string, blockId: string, emoji: string) {
  const user = await requireUser()

  if (!emoji.trim()) throw new Error('Emoji is required.')

  try {
    // Check if reaction already exists
    const existing = await prisma.reaction.findUnique({
      where: {
        user_id_post_id_block_id_emoji: {
          user_id: user.id,
          post_id: postId,
          block_id: blockId,
          emoji,
        },
      },
    })

    let action: 'added' | 'removed'

    if (existing) {
      // Remove it
      await prisma.reaction.delete({
        where: { id: existing.id },
      })
      action = 'removed'
    } else {
      // Add it
      await prisma.reaction.create({
        data: {
          user_id: user.id,
          post_id: postId,
          block_id: blockId,
          emoji,
        },
      })
      action = 'added'
    }

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { slug: true } })
    if (post) {
      revalidatePath(`/posts/${post.slug}`)
      revalidatePath(`/community`)
    }

    return { success: true, action }
  } catch (err: any) {
    console.error('Toggle reaction error:', err)
    throw new Error(err.message || 'Failed to toggle reaction.')
  }
}
