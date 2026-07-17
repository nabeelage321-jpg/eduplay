// src/lib/stripe/stripe.ts
// Stripe server-side client — never import in client components

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing env var: STRIPE_SECRET_KEY')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
})

/** Retrieve or create a Stripe customer for a user */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name: string,
): Promise<string> {
  // Search for existing customer by metadata
  const existing = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  })

  if (existing.data.length > 0) {
    return existing.data[0].id
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId },
  })

  return customer.id
}

/** Safely verify Stripe webhook signature — throws on failure */
export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('Missing env var: STRIPE_WEBHOOK_SECRET')
  return stripe.webhooks.constructEvent(rawBody, signature, secret)
}
