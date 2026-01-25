// src/app/api/subscription/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { getPlan, getVerifiedBadgeColor } from '@/lib/stripe';
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
