'use server'

import { getSessionUser } from '../../lib/auth'
import { prisma } from '../../lib/db'
import { stripe } from '../../lib/stripe'
import { LedgerType, OrderStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function createUpgradeSessionAction(newTierId: string) {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('Authentication required to perform upgrades.')
  }

  try {
    // 1. Fetch user's active paid order
    const order = await prisma.order.findFirst({
      where: { user_id: user.id, status: OrderStatus.PAID },
      include: { line_items: { include: { item: true } } },
    })

    if (!order || order.line_items.length === 0) {
      throw new Error('No active paid order found to upgrade.')
    }

    const currentLineItem = order.line_items[0]
    const currentTier = currentLineItem.item

    // 2. Fetch new tier
    const newTier = await prisma.inventoryItem.findUnique({
      where: { id: newTierId },
    })

    if (!newTier) {
      throw new Error('Selected upgrade tier was not found.')
    }

    // 3. Verify it is a true upgrade (price increase)
    const deltaPrice = newTier.price - currentTier.price
    if (deltaPrice <= 0) {
      throw new Error('Invalid upgrade request. The new tier must cost more than your current tier.')
    }

    // 4. Row-level lock on the new tier to ensure stock exists
    await prisma.$transaction(async (tx) => {
      const items = await tx.$queryRaw<any[]>`
        SELECT * FROM "InventoryItem" WHERE id = ${newTierId} FOR UPDATE
      `
      const item = items[0]
      if (!item) {
        throw new Error('Upgrade tier not found during lock verification.')
      }

      if (item.max_limit !== null && item.stock_allocated >= item.max_limit) {
        throw new Error(`The tier "${item.name}" is sold out!`)
      }

      // Temporarily reserve stock for the upgrade
      await tx.$executeRaw`
        UPDATE "InventoryItem" SET stock_allocated = stock_allocated + 1 WHERE id = ${newTierId}
      `
    })

    // 5. Create Stripe Checkout Session for the Upgrade Delta
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60 // 30 mins expiry

    // Retrieve original payment reference from ledger to track session references
    const ledgerCharge = await prisma.ledger.findFirst({
      where: { order_id: order.id, type: LedgerType.CHARGE },
    })

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Upgrade: ${currentTier.name} ➔ ${newTier.name}`,
              description: `Upgrade delta pricing payment.`,
            },
            unit_amount: deltaPrice,
          },
          quantity: 1,
        },
      ],
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      shipping_address_collection: newTier.type === 'physical' ? {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'SE', 'NO', 'DK'],
      } : undefined,
      expires_at: expiresAt,
      metadata: {
        order_id: order.id,
        action_type: 'upgrade',
        old_item_id: currentTier.id,
        new_item_id: newTier.id,
        delta_price: deltaPrice.toString(),
      },
      success_url: `${appUrl}/dashboard?upgrade_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard?upgrade_cancel=true`,
    })

    return { success: true, url: stripeSession.url }
  } catch (err: any) {
    console.error('Create upgrade session error:', err)
    throw new Error(err.message || 'Upgrade session generation failed.')
  }
}

export async function executeDowngradeAction(newTierId: string) {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('Authentication required to perform downgrades.')
  }

  try {
    // 1. Fetch user's active paid order
    const order = await prisma.order.findFirst({
      where: { user_id: user.id, status: OrderStatus.PAID },
      include: { line_items: { include: { item: true } } },
    })

    if (!order || order.line_items.length === 0) {
      throw new Error('No active paid order found to downgrade.')
    }

    const currentLineItem = order.line_items[0]
    const currentTier = currentLineItem.item

    // 2. Fetch new tier
    const newTier = await prisma.inventoryItem.findUnique({
      where: { id: newTierId },
    })

    if (!newTier) {
      throw new Error('Selected downgrade tier was not found.')
    }

    // 3. Verify it is a true downgrade (price decrease)
    const refundDelta = currentTier.price - newTier.price
    if (refundDelta <= 0) {
      throw new Error('Invalid downgrade request. The new tier must cost less than your current tier.')
    }

    // 4. Retrieve original PaymentIntent charge ID from Ledger records
    // Standard charges have LedgerType.CHARGE
    const charges = await prisma.ledger.findMany({
      where: { order_id: order.id, type: LedgerType.CHARGE },
      orderBy: { created_at: 'desc' },
    })

    if (charges.length === 0) {
      throw new Error('Original payment charge reference not found in audit logs.')
    }

    const chargeStripeId = charges[0].stripe_id
    if (!chargeStripeId) {
      throw new Error('Invalid charge reference. Refund cannot be processed.')
    }

    // 5. Execute Stripe Refund API
    let refundId = 'ch_mock_refund_' + Math.random().toString(36).slice(2)

    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('mock')) {
      const refund = await stripe.refunds.create({
        payment_intent: chargeStripeId.startsWith('cs_') ? undefined : chargeStripeId,
        charge: chargeStripeId.startsWith('ch_') || chargeStripeId.startsWith('py_') ? chargeStripeId : undefined,
        amount: refundDelta,
      })
      refundId = refund.id
    } else {
      console.warn('⚠️ Stripe Warning: Mocking Stripe Refund API call in dev mode.')
    }

    // 6. Execute atomic DB updates inside Postgres transaction
    await prisma.$transaction(async (tx) => {
      // Re-verify under lock inside transaction to protect inventory
      const items = await tx.$queryRaw<any[]>`
        SELECT * FROM "InventoryItem" WHERE id = ${newTierId} FOR UPDATE
      `
      const item = items[0]
      if (item && item.max_limit !== null && item.stock_allocated >= item.max_limit) {
        throw new Error(`The tier "${item.name}" is sold out!`)
      }

      // Update LineItem: change item_id and decrease price_paid
      await tx.lineItem.update({
        where: { id: currentLineItem.id },
        data: {
          item_id: newTierId,
          price_paid: { decrement: refundDelta },
        },
      })

      // Update Order: decrease total_amount
      await tx.order.update({
        where: { id: order.id },
        data: {
          total_amount: { decrement: refundDelta },
        },
      })

      // Add Ledger DOWNGRADE refund record
      await tx.ledger.create({
        data: {
          order_id: order.id,
          type: LedgerType.DOWNGRADE,
          amount: -refundDelta, // Negative to represent refund
          stripe_id: refundId,
        },
      })

      // Transfer stock allocations:
      // Release current (old) tier stock
      await tx.$executeRaw`
        UPDATE "InventoryItem" SET stock_allocated = GREATEST(0, stock_allocated - 1) WHERE id = ${currentTier.id}
      `
      // Claim new tier stock
      await tx.$executeRaw`
        UPDATE "InventoryItem" SET stock_allocated = stock_allocated + 1 WHERE id = ${newTierId}
      `
    })

    revalidatePath('/dashboard')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Execute downgrade error:', err)
    throw new Error(err.message || 'Downgrade transaction failed.')
  }
}
