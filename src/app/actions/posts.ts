'use server'

import { getSessionUser } from '../../lib/auth'
import { prisma } from '../../lib/db'
import { enrichBlockIds, renderTipTapToHtml } from '../../lib/blocks'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_api_key')

async function requireAdmin() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    throw new Error('Unauthorized. Admin role required.')
  }
  return user
}

export async function savePostAction(
  id: string | null,
  title: string,
  slug: string,
  contentJsonStr: string,
  gatedTierRequirement: string | null,
  isPublished: boolean
) {
  await requireAdmin()

  if (!title.trim()) throw new Error('Title is required.')
  if (!slug.trim()) throw new Error('Slug is required.')

  const parsedJson = JSON.parse(contentJsonStr)
  const enrichedJson = enrichBlockIds(parsedJson)

  try {
    let post
    let shouldSendNewsletter = false

    if (id) {
      // Get previous state to see if it's transitioning to published
      const prevPost = await prisma.post.findUnique({ where: { id } })
      shouldSendNewsletter = isPublished && !prevPost?.is_published

      post = await prisma.post.update({
        where: { id },
        data: {
          title: title.trim(),
          slug: slug.trim().toLowerCase(),
          content_json: enrichedJson,
          is_published: isPublished,
          gated_tier_requirement: gatedTierRequirement || null,
        },
      })
    } else {
      shouldSendNewsletter = isPublished

      post = await prisma.post.create({
        data: {
          title: title.trim(),
          slug: slug.trim().toLowerCase(),
          content_json: enrichedJson,
          is_published: isPublished,
          gated_tier_requirement: gatedTierRequirement || null,
        },
      })
    }

    // Trigger Substack-style newsletter blast if transitioning to published
    if (shouldSendNewsletter) {
      // Run as a background action
      const users = await prisma.user.findMany({ select: { email: true } })
      const emailHtml = renderTipTapToHtml(enrichedJson)

      console.log(`\n========================================`);
      console.log(`[NEWSLETTER BROADCAST FOR POST: "${post.title}"]`);
      console.log(`Broadcasting to ${users.length} subscribers...`);
      console.log(`========================================\n`);

      if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('mock')) {
        for (const u of users) {
          try {
            await resend.emails.send({
              from: 'Age of Self-Realization <newsletter@erikthor.com>',
              to: u.email,
              subject: post.title,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 20px; color: #111;">${post.title}</h1>
                  <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                  ${emailHtml}
                  <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                  <p style="font-size: 12px; color: #666; text-align: center;">
                    You are receiving this because you backed The Age of Self-Realization. 
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/posts/${post.slug}" style="color: #6366f1;">Read in browser</a> and join the discussion!
                  </p>
                </div>
              `,
            })
          } catch (emailErr) {
            console.error(`Failed to send newsletter to ${u.email}:`, emailErr)
          }
        }
      }
    }

    revalidatePath('/')
    revalidatePath(`/posts/${post.slug}`)
    return { success: true, post }
  } catch (err: any) {
    console.error('Save post action error:', err)
    throw new Error(err.message || 'Failed to save post.')
  }
}

export async function deletePostAction(id: string) {
  await requireAdmin()
  await prisma.post.delete({ where: { id } })
  revalidatePath('/')
  return { success: true }
}
