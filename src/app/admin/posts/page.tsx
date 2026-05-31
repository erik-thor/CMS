import { getSessionUser } from '../../../lib/auth'
import { prisma } from '../../../lib/db'
import { redirect } from 'next/navigation'
import AdminPostsClient from './AdminPostsClient'

export const dynamic = 'force-dynamic'

export default async function AdminPostsPage() {
  const user = await getSessionUser()
  
  // Guard admin access
  if (!user || user.role !== 'ADMIN') {
    redirect('/')
  }

  // Query existing posts and inventory tiers
  const posts = await prisma.post.findMany({
    orderBy: { created_at: 'desc' },
  })

  const tiers = await prisma.inventoryItem.findMany({
    orderBy: { price: 'asc' },
  })

  return (
    <div className="min-h-screen bg-[#08080c] text-white">
      <AdminPostsClient posts={JSON.parse(JSON.stringify(posts))} tiers={tiers} />
    </div>
  )
}
