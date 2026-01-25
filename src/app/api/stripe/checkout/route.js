// src/app/api/stripe/checkout/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { stripe, SUBSCRIPTION_PLANS } from '@/lib/stripe';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      console.error('Stripe is not configured. Check STRIPE_SECRET_KEY env var.');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await request.json();
    
    // Validate plan
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan || planId === 'free') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Check if price ID is configured
    if (!plan.priceId) {
      console.error(`Price ID not configured for plan: ${planId}`);
      return NextResponse.json(
        { error: `Price not configured for ${plan.name} plan` },
        { status: 500 }
      );
    }

    console.log(`Creating checkout for plan: ${planId}, priceId: ${plan.priceId}`);

    // Get or create Stripe customer
    let subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      // Create new Stripe customer
      console.log('Creating new Stripe customer for:', session.user.email);
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name,
        metadata: {
          userId: session.user.id,
        },
      });
      customerId = customer.id;
      console.log('Created Stripe customer:', customerId);

      // Create subscription record
      subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          stripeCustomerId: customerId,
          status: 'inactive',
          plan: 'free',
        },
      });
    }

    // Check if user already has an active subscription
    if (subscription.status === 'active' && subscription.plan !== 'free') {
      // Redirect to billing portal for upgrades/downgrades
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXTAUTH_URL}/settings?tab=billing`,
      });
      return NextResponse.json({ url: portalSession.url });
    }

    // Create checkout session
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/settings?tab=billing&success=true`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          userId: session.user.id,
          planId: planId,
        },
      },
      allow_promotion_codes: true,
    });

    console.log('Checkout session created:', checkoutSession.id);
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout error:', error.message);
    console.error('Full error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
