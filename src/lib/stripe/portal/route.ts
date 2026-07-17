// src/app/api/stripe/portal/route.ts
// Redirects to Stripe Customer Portal for subscription management

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { stripe } from '@/lib/stripe/stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  void req
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const customers = await stripe.customers.search({
    query: `metadata['userId']:'${session.user.email}'`,
    limit: 1,
  })

  if (customers.data.length === 0) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id,
    return_url: `${baseUrl}/dashboard/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}
