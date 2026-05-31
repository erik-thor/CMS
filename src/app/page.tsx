import { prisma } from '../lib/db'
import CampaignClient from './CampaignClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Query pledge tiers
  const tiers = await prisma.inventoryItem.findMany({
    orderBy: { price: 'asc' },
  })

  // Calculate stats
  const paidOrders = await prisma.order.findMany({
    where: { status: 'PAID' },
    select: { total_amount: true },
  })

  const totalRaised = paidOrders.reduce((sum, order) => sum + order.total_amount, 0)
  const backersCount = paidOrders.length

  return (
    <CampaignClient 
      tiers={JSON.parse(JSON.stringify(tiers))} 
      totalRaised={totalRaised} 
      backersCount={backersCount} 
    />
  )
}
