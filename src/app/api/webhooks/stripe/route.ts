import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '../../../../lib/stripe'
import { prisma } from '../../../../lib/db'
import { LedgerType, OrderStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  try {
    if (sig && webhookSecret && !webhookSecret.includes('mock')) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } else {
      // Dev mode fallback: Parse JSON directly if secret or signature is mock/missing
      if (process.env.NODE_ENV === 'development') {
        event = JSON.parse(body)
        console.warn('⚠️ Stripe Webhook warning: Processing unsigned event payload in development mode.')
      } else {
        throw new Error('Missing webhook signature verification credentials.')
      }
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const session = event.data?.object as any
  const eventType = event.type

  console.log(`🔔 Stripe Webhook Received event: ${eventType}`)

  try {
    if (eventType === 'checkout.session.completed') {
      const orderId = session.metadata?.order_id
      const actionType = session.metadata?.action_type
      const itemId = session.metadata?.item_id

      if (!orderId) {
        console.error('No order_id in session metadata.')
        return NextResponse.json({ received: true })
      }

      const shippingAddress = session.shipping_details 
        ? {
            name: session.shipping_details.name,
            line1: session.shipping_details.address?.line1,
            line2: session.shipping_details.address?.line2,
            city: session.shipping_details.address?.city,
            state: session.shipping_details.address?.state,
            postal_code: session.shipping_details.address?.postal_code,
            country: session.shipping_details.address?.country,
          }
        : null

      if (actionType === 'checkout') {
        // Find order
        const order = await prisma.order.findUnique({
          where: { id: orderId },
        })

        if (!order) {
          console.error(`Order ${orderId} not found.`)
          return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Avoid double processing (idempotency check)
        if (order.status === OrderStatus.PAID) {
          console.log(`Order ${orderId} is already paid. Skipping.`)
          return NextResponse.json({ received: true })
        }

        // Execute DB updates inside a transaction
        await prisma.$transaction(async (tx) => {
          // Update Order Status
          await tx.order.update({
            where: { id: orderId },
            data: {
              status: OrderStatus.PAID,
            },
          })

          // Save shipping address on User profile
          if (shippingAddress) {
            await tx.user.update({
              where: { id: order.user_id },
              data: {
                shipping_address: shippingAddress as any,
              },
            })
          }

          // Create Ledger Charge entry
          await tx.ledger.create({
            data: {
              order_id: orderId,
              type: LedgerType.CHARGE,
              amount: session.amount_total || order.total_amount,
              stripe_id: session.payment_intent || session.id,
            },
          })
        })

        console.log(`✅ Order ${orderId} successfully completed and ledgered via webhook.`)
      } 
      
      else if (actionType === 'upgrade') {
        const oldItemId = session.metadata?.old_item_id
        const newItemId = session.metadata?.new_item_id
        const deltaPrice = parseInt(session.metadata?.delta_price || '0', 10)

        // Upgrade transaction
        await prisma.$transaction(async (tx) => {
          
          // 1. Swap LineItem item_id
          const lineItem = await tx.lineItem.findFirst({
            where: { order_id: orderId, item_id: oldItemId },
          })
          
          if (lineItem) {
            await tx.lineItem.update({
              where: { id: lineItem.id },
              data: {
                item_id: newItemId,
                price_paid: { increment: deltaPrice }, // Record price paid increments
              },
            })
          }

          // 2. Add delta to Order total_amount
          await tx.order.update({
            where: { id: orderId },
            data: {
              total_amount: { increment: deltaPrice },
            },
          })

          // 3. Write Ledger UPGRADE entry
          await tx.ledger.create({
            data: {
              order_id: orderId,
              type: LedgerType.UPGRADE,
              amount: deltaPrice,
              stripe_id: session.payment_intent || session.id,
            },
          })

          // 4. Release old tier stock & lock in new tier stock
          // Decrement old stock allocation
          await tx.$executeRaw`
            UPDATE "InventoryItem" SET stock_allocated = GREATEST(0, stock_allocated - 1) WHERE id = ${oldItemId}
          `
          // New stock allocation was already incremented during upgrade generation to reserve it.
          // We don't need to increment it again!
        })

        console.log(`✅ Order ${orderId} upgraded from ${oldItemId} to ${newItemId} successfully.`)
      }
    } 
    
    else if (eventType === 'checkout.session.expired') {
      const orderId = session.metadata?.order_id
      const actionType = session.metadata?.action_type
      const itemId = session.metadata?.item_id

      if (orderId && actionType) {
        console.log(`⏳ Stripe Session expired for order ${orderId} (${actionType}). Releasing inventory...`)

        if (actionType === 'checkout') {
          // Revert stock increment
          await prisma.$transaction(async (tx) => {
            // Decrement stock allocation
            await tx.$executeRaw`
              UPDATE "InventoryItem" SET stock_allocated = GREATEST(0, stock_allocated - 1) WHERE id = ${itemId}
            `
            // Set order status to REFUNDED or CANCELLED, or delete pending order
            await tx.order.update({
              where: { id: orderId },
              data: { status: OrderStatus.PENDING }, // Let it remain pending, or delete line items
            })
          })
          console.log(`Inventory released for item ${itemId} from expired session.`)
        } 
        
        else if (actionType === 'upgrade') {
          const newItemId = session.metadata?.new_item_id
          // Revert reserved upgrade stock on new item
          await prisma.$executeRaw`
            UPDATE "InventoryItem" SET stock_allocated = GREATEST(0, stock_allocated - 1) WHERE id = ${newItemId}
          `
          console.log(`Inventory released for new upgrade item ${newItemId} from expired session.`)
        }
      }
    }
  } catch (dbErr: any) {
    console.error('Database updates in Stripe Webhook failed:', dbErr)
    return NextResponse.json({ error: `Webhook DB Error: ${dbErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
