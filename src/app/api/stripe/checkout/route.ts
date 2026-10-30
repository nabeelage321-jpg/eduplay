// src/app/api/stripe/checkout/route.ts
// Creates a Stripe Checkout Session for plan upgrades

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe/stripe'
import { TIERS, TierId } from '@/lib/stripe/tiers'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { tierId: TierId; yearly?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { tierId, yearly = false } = body

  if (tierId === 'free') {
    return NextResponse.json({ error: 'Cannot checkout free tier' }, { status: 400 })
  }

  const tier = TIERS[tierId]
  if (!tier) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  const priceId = yearly ? tier.stripePriceIdYearly : tier.stripePriceIdMonthly
  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const customerId = await getOrCreateStripeCustomer(
    session.user.email,
    session.user.email,
    session.user.name ?? '',
  )

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?upgraded=1`,
    cancel_url: `${baseUrl}/pricing`,
    subscription_data: {
      metadata: {
        userId: session.user.email,
        tierId,
      },
    },
    allow_promotion_codes: true,
    tax_id_collection: { enabled: true },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
