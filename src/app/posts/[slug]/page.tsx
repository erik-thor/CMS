import { getSessionUser } from '../../../lib/auth'
import { prisma } from '../../../lib/db'
import { notFound } from 'next/navigation'
import PostReaderClient from '../../../components/PostReaderClient'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Generate dynamic metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { title: true },
  })

  if (!post) {
    return { title: 'Post Not Found | The Age of Self-Realization' }
  }

  return {
    title: `${post.title} | The Age of Self-Realization`,
    description: `Read and join the discussion on ${post.title}.`,
  }
}

export default async function PostReaderPage({ params }: PageProps) {
  const { slug } = await params

  // 1. Fetch Post with comments and reactions
  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      comments: {
        include: {
          user: {
            select: { id: true, display_name: true, avatar_url: true },
          },
        },
        orderBy: { created_at: 'asc' },
      },
      reactions: {
        select: { id: true, block_id: true, emoji: true, user_id: true },
      },
    },
  })

  if (!post || (!post.is_published && (await getSessionUser())?.role !== 'ADMIN')) {
    notFound()
  }

  // 2. Fetch current user
  const currentUser = await getSessionUser()

  // 3. Gating logic evaluation
  let hasAccess = true
  let requiredTierName: string | null = null

  if (post.gated_tier_requirement) {
    const requiredItem = await prisma.inventoryItem.findUnique({
      where: { id: post.gated_tier_requirement },
    })

    if (requiredItem) {
      requiredTierName = requiredItem.name
      
      // Admin bypasses gating
      if (currentUser?.role === 'ADMIN') {
        hasAccess = true
      } else if (!currentUser) {
        hasAccess = false
      } else {
        // Look up paid orders for the user containing items costing at least the required price
        const paidOrders = await prisma.order.findMany({
          where: {
            user_id: currentUser.id,
            status: 'PAID',
          },
          include: {
            line_items: {
              include: {
                item: true,
              },
            },
          },
        })

        const userMaxPledgePrice = Math.max(
          0,
          ...paidOrders.flatMap((order) => order.line_items.map((line) => line.item.price))
        )

        if (userMaxPledgePrice < requiredItem.price) {
          hasAccess = false
        }
      }
    }
  }

  return (
    <PostReaderClient
      postId={post.id}
      postTitle={post.title}
      postSlug={post.slug}
      contentJson={post.content_json}
      comments={JSON.parse(JSON.stringify(post.comments))}
      reactions={post.reactions}
      currentUser={currentUser ? { id: currentUser.id, display_name: currentUser.display_name, avatar_url: currentUser.avatar_url } : null}
      hasAccess={hasAccess}
      requiredTierName={requiredTierName}
    />
  )
}
