'use server'

import { prisma } from '../../lib/db'
import { stripe } from '../../lib/stripe'

export async function createCheckoutSessionAction(email: string, itemId: string) {
  if (!email || !email.includes('@')) {
    throw new Error('Valid email address is required.')
  }
  if (!itemId) {
    throw new Error('Reward tier selection is required.')
  }

  const cleanEmail = email.trim().toLowerCase()

  try {
    // Execute everything in a raw Postgres transaction to ensure row-locking is respected
    const sessionUrl = await prisma.$transaction(async (tx) => {
      
      // 1. Row-level lock on the InventoryItem
      // Using raw query because Prisma Client doesn't support FOR UPDATE natively
      const items = await tx.$queryRaw<any[]>`
        SELECT * FROM "InventoryItem" WHERE id = ${itemId} FOR UPDATE
      `
      const item = items[0]
      if (!item) {
        throw new Error('Selected pledge tier was not found.')
      }

      // 2. Check stock allocation constraints
      if (item.max_limit !== null && item.stock_allocated >= item.max_limit) {
        throw new Error(`The tier "${item.name}" is sold out!`)
      }

      // 3. Temporarily reserve stock by incrementing stock_allocated
      await tx.$executeRaw`
        UPDATE "InventoryItem" SET stock_allocated = stock_allocated + 1 WHERE id = ${itemId}
      `

      // 4. Find or create the user
      let user = await tx.user.findUnique({
        where: { email: cleanEmail },
      })
      if (!user) {
        user = await tx.user.create({
          data: {
            email: cleanEmail,
            role: 'USER',
          },
        })
      }

      // 5. Create PENDING Order
      const order = await tx.order.create({
        data: {
          user_id: user.id,
          status: 'PENDING',
          total_amount: item.price,
        },
      })

      // 6. Create LineItem
      await tx.lineItem.create({
        data: {
          order_id: order.id,
          item_id: item.id,
          price_paid: item.price,
        },
      })

      // 7. Create Stripe Checkout Session
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      
      // Expire session after 30 minutes (minimum allowed by Stripe) to release inventory on abandonment
      const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60 

      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: cleanEmail,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: item.name,
              },
              unit_amount: item.price,
            },
            quantity: 1,
          },
        ],
        automatic_tax: { enabled: true },
        billing_address_collection: 'required',
        shipping_address_collection: item.type === 'physical' ? {
          allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'SE', 'NO', 'DK'],
        } : undefined,
        expires_at: expiresAt,
        metadata: {
          order_id: order.id,
          item_id: item.id,
          action_type: 'checkout',
        },
        success_url: `${appUrl}/dashboard?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/?checkout_cancel=true&order_id=${order.id}`,
      })

      // 8. Associate Stripe Session ID as stripe_intent_id on the Order
      await tx.order.update({
        where: { id: order.id },
        data: {
          stripe_intent_id: stripeSession.id,
        },
      })

      return stripeSession.url
    })

    if (!sessionUrl) {
      throw new Error('Failed to generate checkout session url.')
    }

    return { success: true, url: sessionUrl }
  } catch (err: any) {
    console.error('Checkout session creation error:', err)
    throw new Error(err.message || 'Payment initiation failed.')
  }
}
