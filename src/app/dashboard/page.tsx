import { getSessionUser } from '../../lib/auth'
import { prisma } from '../../lib/db'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import { OrderStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getSessionUser()
  
  if (!user) {
    redirect('/login')
  }

  // 1. Fetch user's active paid order with line items and ledger history
  const activeOrder = await prisma.order.findFirst({
    where: {
      user_id: user.id,
      status: OrderStatus.PAID,
    },
    include: {
      line_items: {
        include: {
          item: true,
        },
      },
      ledger_entries: {
        orderBy: {
          created_at: 'desc',
        },
      },
    },
  })

  // 2. Fetch all pledge tiers
  const tiers = await prisma.inventoryItem.findMany({
    orderBy: { price: 'asc' },
  })

  // 3. Fetch all published posts
  const posts = await prisma.post.findMany({
    where: { is_published: true },
    orderBy: { created_at: 'asc' },
  })

  // 4. Calculate maximum pledge level paid by the user
  const userMaxPledgePrice = activeOrder
    ? Math.max(0, ...activeOrder.line_items.map((li) => li.item.price))
    : 0

  return (
    <div className="min-h-screen bg-[#08080c] text-white">
      <DashboardClient
        user={{ id: user.id, email: user.email, display_name: user.display_name, role: user.role }}
        activeOrder={activeOrder ? JSON.parse(JSON.stringify(activeOrder)) : null}
        tiers={JSON.parse(JSON.stringify(tiers))}
        posts={JSON.parse(JSON.stringify(posts))}
        userMaxPledgePrice={userMaxPledgePrice}
      />
    </div>
  )
}
