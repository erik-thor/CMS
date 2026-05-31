import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_secret_key', {
  apiVersion: '2026-05-27.dahlia', // Matches Stripe SDK types version
})
