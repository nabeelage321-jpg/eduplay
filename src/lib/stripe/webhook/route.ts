// src/app/api/stripe/webhook/route.ts
// Handles Stripe webhook events — subscription lifecycle management
// Verifies signature to prevent replay attacks

import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

// Must disable body parsing so we get raw Buffer for signature verification
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function updateUserTier(
  userId: string,
  tierId: 'free' | 'pro' | 'school',
  subscriptionId: string | null,
  subscriptionStatus: string,
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      tier: tierId,
      stripe_subscription_id: subscriptionId,
      subscription_status: subscriptionStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('email', userId)

  if (error) {
    console.error('Failed to update user tier:', error)
    throw error
  }
}

async function handleSubscriptionCreatedOrUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata.userId
  const tierId = (subscription.metadata.tierId as 'pro' | 'school') ?? 'pro'
  const status = subscription.status

  if (!userId) {
    console.warn('Subscription missing userId metadata:', subscription.id)
    return
  }

  const activeTier =
    status === 'active' || status === 'trialing' ? tierId : 'free'

  await updateUserTier(userId, activeTier, subscription.id, status)

  // Log to ai_generations table? No — log subscription event separately
  await supabase.from('subscription_events').insert({
    stripe_subscription_id: subscription.id,
    user_email: userId,
    tier_id: activeTier,
    status,
    created_at: new Date().toISOString(),
  })
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata.userId
  if (!userId) return
  await updateUserTier(userId, 'free', null, 'canceled')
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  // subscription lifecycle is handled by subscription.updated event
  // Here we can send a welcome email etc.
  console.log('Checkout completed for customer:', session.customer)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.arrayBuffer()
  const buffer = Buffer.from(rawBody)
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(buffer, signature)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionCreatedOrUpdated(
          event.data.object as Stripe.Subscription,
        )
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        // Could trigger email notification
        console.log('Payment failed for subscription:', event.data.object)
        break

      default:
        // Unhandled event type — ignore silently
        break
    }
  } catch (err) {
    console.error(`Error handling event ${event.type}:`, err)
    // Return 500 so Stripe retries
    return NextResponse.json(
      { error: 'Webhook handler error' },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}
