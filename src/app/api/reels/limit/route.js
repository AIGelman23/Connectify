// src/app/api/reels/limit/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SUBSCRIPTION_PLANS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * GET /api/reels/limit
 * Returns the user's daily reel limit and usage
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's subscription
    const userWithSubscription = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscription: {
          select: {
            plan: true,
            status: true,
          },
        },
      },
    });

    // Determine user's plan (default to 'free' if no active subscription)
    const userPlan =
      userWithSubscription?.subscription?.status === "active"
        ? userWithSubscription.subscription.plan.toLowerCase()
        : "free";

    // Get plan details
    const planConfig = SUBSCRIPTION_PLANS[userPlan] || SUBSCRIPTION_PLANS.free;
    const dailyLimit = planConfig.limits?.reelsPerDay ?? 5;
    const isUnlimited = dailyLimit === -1;

    // Count reels created by user today (since midnight UTC)
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const todayReelCount = await prisma.post.count({
      where: {
        authorId: userId,
        isReel: true,
        createdAt: { gte: startOfToday },
      },
    });

    const remaining = isUnlimited ? null : Math.max(0, dailyLimit - todayReelCount);
    const canCreate = isUnlimited || todayReelCount < dailyLimit;

    return NextResponse.json(
      {
        plan: userPlan,
        planName: planConfig.name,
        limits: {
          daily: dailyLimit,
          used: todayReelCount,
          remaining: remaining,
          unlimited: isUnlimited,
          canCreate: canCreate,
        },
        upgradeUrl: "/settings/subscription",
        // Include next tier info for upgrade prompts
        nextTier: getNextTierInfo(userPlan),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching reel limit:", error);
    return NextResponse.json(
      { message: "Failed to fetch reel limit.", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get info about the next subscription tier for upgrade prompts
 */
function getNextTierInfo(currentPlan) {
  const tierOrder = ["free", "basic", "pro", "business"];
  const currentIndex = tierOrder.indexOf(currentPlan);

  if (currentIndex === -1 || currentIndex >= tierOrder.length - 1) {
    return null; // Already at highest tier or unknown plan
  }

  const nextPlanId = tierOrder[currentIndex + 1];
  const nextPlan = SUBSCRIPTION_PLANS[nextPlanId];

  return {
    id: nextPlanId,
    name: nextPlan.name,
    price: nextPlan.price,
    reelsPerDay: nextPlan.limits.reelsPerDay,
    unlimited: nextPlan.limits.reelsPerDay === -1,
  };
}
