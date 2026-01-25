// src/hooks/useSubscription.js
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

// Plan configurations (client-side copy for immediate access)
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    badgeColor: null,
    features: ['verified_badge', 'ad_free', 'story_analytics', 'advanced_analytics', 'boosted_visibility', 'schedule_posts', 'custom_themes', 'team_tools', 'api_access'].reduce((acc, f) => ({ ...acc, [f]: false }), {}),
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 499,
    badgeColor: '#3B82F6', // Blue
    features: {
      verified_badge: true,
      ad_free: true,
      story_analytics: true,
      advanced_analytics: false,
      boosted_visibility: false,
      schedule_posts: false,
      custom_themes: false,
      team_tools: false,
      api_access: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 999,
    badgeColor: '#F59E0B', // Gold
    features: {
      verified_badge: true,
      ad_free: true,
      story_analytics: true,
      advanced_analytics: true,
      boosted_visibility: true,
      schedule_posts: true,
      custom_themes: true,
      team_tools: false,
      api_access: false,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 1999,
    badgeColor: '#8B5CF6', // Purple
    features: {
      verified_badge: true,
      ad_free: true,
      story_analytics: true,
      advanced_analytics: true,
      boosted_visibility: true,
      schedule_posts: true,
      custom_themes: true,
      team_tools: true,
      api_access: true,
    },
  },
};

/**
 * Hook to get and manage the user's subscription
 * @returns {Object} subscription data and utilities
 */
export function useSubscription() {
  const { data: session, status: sessionStatus } = useSession();
  const queryClient = useQueryClient();

  // Fetch subscription data
  const {
    data: subscription,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscription");
      if (!res.ok) {
        if (res.status === 401) {
          return { plan: "free", status: "inactive" };
        }
        throw new Error("Failed to fetch subscription");
      }
      return res.json();
    },
    enabled: sessionStatus === "authenticated",
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Get current plan details
  const plan = subscription?.plan || "free";
  const planDetails = PLANS[plan] || PLANS.free;

  // Check if user has a paid subscription
  const isPaid = plan !== "free" && subscription?.status === "active";

  // Check if subscription is active
  const isActive = subscription?.status === "active";

  // Check if subscription is in trial
  const isTrialing = subscription?.status === "trialing";

  // Check if subscription is canceled but still active until period end
  const isCanceled = subscription?.cancelAtPeriodEnd === true;

  // Get subscription end date
  const currentPeriodEnd = subscription?.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd) 
    : null;

  // Check if user has access to a specific feature
  const hasFeature = (feature) => {
    return planDetails.features[feature] === true;
  };

  // Get the badge color for verified badge
  const getBadgeColor = () => {
    if (!isPaid) return null;
    return planDetails.badgeColor;
  };

  // Create checkout session mutation
  const checkoutMutation = useMutation({
    mutationFn: async (planId) => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) throw new Error("Failed to create checkout session");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  // Open billing portal mutation
  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to create portal session");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  // Start checkout for a plan
  const startCheckout = (planId) => {
    checkoutMutation.mutate(planId);
  };

  // Open billing portal
  const openBillingPortal = () => {
    portalMutation.mutate();
  };

  return {
    // Subscription data
    subscription,
    plan,
    planDetails,
    isLoading: isLoading || sessionStatus === "loading",
    error,

    // Status checks
    isPaid,
    isActive,
    isTrialing,
    isCanceled,
    currentPeriodEnd,

    // Feature checks
    hasFeature,
    getBadgeColor,

    // Actions
    startCheckout,
    openBillingPortal,
    refetch,

    // Mutation states
    isCheckoutLoading: checkoutMutation.isPending,
    isPortalLoading: portalMutation.isPending,
  };
}

/**
 * Hook to check if user has access to a specific feature
 * Lightweight version for simple feature gates
 */
export function useFeatureAccess(feature) {
  const { hasFeature, isPaid, isLoading } = useSubscription();
  
  return {
    hasAccess: hasFeature(feature),
    isPaid,
    isLoading,
  };
}

/**
 * Hook to get verified badge info for a user
 * @param {string} userId - The user ID to check
 * @param {string} userPlan - The user's plan (if known)
 */
export function useVerifiedBadge(userPlan = null) {
  const { plan: currentUserPlan, getBadgeColor, isPaid } = useSubscription();
  
  // Use provided plan or fall back to current user's plan
  const effectivePlan = userPlan || currentUserPlan;
  const planDetails = PLANS[effectivePlan] || PLANS.free;
  
  return {
    showBadge: planDetails.badgeColor !== null,
    color: planDetails.badgeColor,
    planName: planDetails.name,
  };
}

export default useSubscription;
