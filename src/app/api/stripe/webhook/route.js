// src/app/api/stripe/webhook/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

export async function POST(request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session) {
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Get subscription details from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const planId = stripeSubscription.metadata.planId || 'basic';

  // Update our database
  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscriptionId,
      stripePriceId: stripeSubscription.items.data[0].price.id,
      status: stripeSubscription.status,
      plan: planId,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
  });

  console.log(`Subscription activated for customer: ${customerId}`);
}

async function handleSubscriptionUpdate(stripeSubscription) {
  const customerId = stripeSubscription.customer;
  
  // Determine plan from price ID
  let plan = 'free';
  const priceId = stripeSubscription.items.data[0]?.price.id;
  
  if (priceId === process.env.STRIPE_BASIC_PRICE_ID) plan = 'basic';
  else if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro';
  else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) plan = 'business';

  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
      status: stripeSubscription.status,
      plan: stripeSubscription.status === 'active' ? plan : 'free',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      trialStart: stripeSubscription.trial_start 
        ? new Date(stripeSubscription.trial_start * 1000) 
        : null,
      trialEnd: stripeSubscription.trial_end 
        ? new Date(stripeSubscription.trial_end * 1000) 
        : null,
    },
  });

  console.log(`Subscription updated for customer: ${customerId}, status: ${stripeSubscription.status}`);
}

async function handleSubscriptionDeleted(stripeSubscription) {
  const customerId = stripeSubscription.customer;

  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      status: 'canceled',
      plan: 'free',
      cancelAtPeriodEnd: false,
    },
  });

  console.log(`Subscription deleted for customer: ${customerId}`);
}

async function handleInvoicePaid(invoice) {
  if (!invoice.subscription) return;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription },
  });

  if (!subscription) return;

  await prisma.invoice.create({
    data: {
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      amountPaid: invoice.amount_paid,
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      status: invoice.status,
      invoicePdf: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      periodStart: new Date(invoice.period_start * 1000),
      periodEnd: new Date(invoice.period_end * 1000),
      paidAt: invoice.status_transitions?.paid_at 
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
    },
  });

  console.log(`Invoice paid: ${invoice.id}`);
}

async function handleInvoicePaymentFailed(invoice) {
  if (!invoice.subscription) return;

  const customerId = invoice.customer;

  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      status: 'past_due',
    },
  });

  // TODO: Send email notification to user about failed payment
  console.log(`Invoice payment failed for customer: ${customerId}`);
}
