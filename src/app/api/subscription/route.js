// src/app/api/subscription/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { getPlan, getVerifiedBadgeColor, SUBSCRIPTION_PLANS } from '@/lib/stripe';
import prisma from '@/lib/prisma';

// GET - Get current user's subscription
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!subscription) {
      // Return free tier info
      const freePlan = getPlan('free');
      return NextResponse.json({
        subscription: null,
        plan: freePlan,
        status: 'free',
        verifiedBadge: null,
      });
    }

    const plan = getPlan(subscription.plan);
    const verifiedBadge = getVerifiedBadgeColor(subscription.plan);

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        trialEnd: subscription.trialEnd,
      },
      plan,
      verifiedBadge,
      invoices: subscription.invoices.map((invoice) => ({
        id: invoice.id,
        amount: invoice.amountPaid,
        currency: invoice.currency,
        status: invoice.status,
        pdfUrl: invoice.invoicePdf,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        paidAt: invoice.paidAt,
      })),
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}

// PUT - Admin-only: Switch subscription plan for free
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role === 'USER') {
      return NextResponse.json(
        { error: 'Forbidden. Admin access required.' },
        { status: 403 }
      );
    }

    const { plan } = await request.json();

    // Validate plan
    if (!plan || !SUBSCRIPTION_PLANS[plan]) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be one of: free, basic, pro, business' },
        { status: 400 }
      );
    }

    // Set subscription period (1 year for admin free subscriptions)
    const now = new Date();
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    if (plan === 'free') {
      // Delete subscription if switching to free
      await prisma.subscription.deleteMany({
        where: { userId: session.user.id },
      });

      return NextResponse.json({
        message: 'Switched to free plan successfully',
        subscription: null,
        plan: getPlan('free'),
      });
    }

    // Upsert subscription for paid plans
    // Generate a placeholder stripeCustomerId for admin free subscriptions
    const adminCustomerId = `admin_${session.user.id}`;
    
    const subscription = await prisma.subscription.upsert({
      where: { userId: session.user.id },
      update: {
        plan: plan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: oneYearFromNow,
        cancelAtPeriodEnd: false,
        // Clear Stripe subscription ID since this is a free admin subscription
        stripeSubscriptionId: null,
      },
      create: {
        userId: session.user.id,
        stripeCustomerId: adminCustomerId,
        plan: plan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: oneYearFromNow,
        cancelAtPeriodEnd: false,
      },
    });

    const planDetails = getPlan(plan);
    const verifiedBadge = getVerifiedBadgeColor(plan);

    return NextResponse.json({
      message: `Switched to ${planDetails.name} plan successfully`,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      plan: planDetails,
      verifiedBadge,
    });
  } catch (error) {
    console.error('Admin switch subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to switch subscription', details: error.message },
      { status: 500 }
    );
  }
}
