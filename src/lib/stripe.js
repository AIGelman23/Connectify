// src/lib/stripe.js
import Stripe from 'stripe';

// Initialize Stripe with API key (only if available)
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Basic features for everyone',
    price: 0,
    priceId: null, // No Stripe price for free tier
    features: [
      'Create posts and stories',
      'Connect with friends',
      'Join groups',
      'Basic messaging',
      '5 reels per day',
    ],
    limits: {
      reelsPerDay: 5,
      storiesPerDay: 10,
      groupsCanCreate: 2,
      messageAttachmentSizeMB: 10,
    },
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'More features for active users',
    price: 499, // $4.99 in cents
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    features: [
      'Everything in Free',
      'Blue verified badge',
      'Ad-free experience',
      '20 reels per day',
      'Story analytics',
      'Priority support',
    ],
    limits: {
      reelsPerDay: 20,
      storiesPerDay: 25,
      groupsCanCreate: 5,
      messageAttachmentSizeMB: 25,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Advanced features for creators',
    price: 999, // $9.99 in cents
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      'Everything in Basic',
      'Gold verified badge',
      'Advanced analytics & insights',
      'Boosted post visibility',
      'Unlimited reels',
      'Schedule posts & stories',
      'Custom profile themes',
    ],
    limits: {
      reelsPerDay: -1, // unlimited
      storiesPerDay: -1, // unlimited
      groupsCanCreate: 15,
      messageAttachmentSizeMB: 50,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'For professionals and businesses',
    price: 1999, // $19.99 in cents
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID,
    features: [
      'Everything in Pro',
      'Purple verified badge',
      'Team collaboration tools',
      'API access',
      'Dedicated account manager',
      'White-label options',
      'Advanced security features',
    ],
    limits: {
      reelsPerDay: -1, // unlimited
      storiesPerDay: -1, // unlimited
      groupsCanCreate: -1, // unlimited
      messageAttachmentSizeMB: 100,
    },
  },
};

// Get plan by ID
export function getPlan(planId) {
  return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.free;
}

// Get all plans as array
export function getAllPlans() {
  return Object.values(SUBSCRIPTION_PLANS);
}

// Check if user has access to a feature
export function hasFeatureAccess(userPlan, feature) {
  const planOrder = ['free', 'basic', 'pro', 'business'];
  const featureRequiredPlan = {
    verified_badge: 'basic',
    ad_free: 'basic',
    story_analytics: 'basic',
    advanced_analytics: 'pro',
    boosted_visibility: 'pro',
    schedule_posts: 'pro',
    custom_themes: 'pro',
    team_tools: 'business',
    api_access: 'business',
  };

  const requiredPlan = featureRequiredPlan[feature];
  if (!requiredPlan) return true; // Feature not restricted

  const userPlanIndex = planOrder.indexOf(userPlan);
  const requiredPlanIndex = planOrder.indexOf(requiredPlan);

  return userPlanIndex >= requiredPlanIndex;
}

// Get verified badge color based on plan
export function getVerifiedBadgeColor(plan) {
  const badgeColors = {
    free: null,
    basic: '#3B82F6', // Blue
    pro: '#F59E0B', // Gold
    business: '#8B5CF6', // Purple
  };
  return badgeColors[plan] || null;
}

// Format price for display
export function formatPrice(priceInCents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceInCents / 100);
}
