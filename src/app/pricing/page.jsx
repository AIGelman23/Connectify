// src/app/pricing/page.jsx
"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/NavBar";
import ConnectifyLogo from "@/components/ConnectifyLogo";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Basic features for everyone",
    features: [
      "Create posts and stories",
      "Connect with friends",
      "Join groups",
      "Basic messaging",
      "5 reels per day",
    ],
    badge: null,
    popular: false,
  },
  {
    id: "basic",
    name: "Basic",
    price: 4.99,
    description: "More features for active users",
    features: [
      "Everything in Free",
      "Blue verified badge",
      "Ad-free experience",
      "20 reels per day",
      "Story analytics",
      "Priority support",
    ],
    badge: "blue",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 9.99,
    description: "Advanced features for creators",
    features: [
      "Everything in Basic",
      "Gold verified badge",
      "Advanced analytics & insights",
      "Boosted post visibility",
      "Unlimited reels",
      "Schedule posts & stories",
      "Custom profile themes",
    ],
    badge: "gold",
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: 19.99,
    description: "For professionals and businesses",
    features: [
      "Everything in Pro",
      "Purple verified badge",
      "Team collaboration tools",
      "API access",
      "Dedicated account manager",
      "White-label options",
      "Advanced security features",
    ],
    badge: "purple",
    popular: false,
  },
];

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(null);
  const [error, setError] = useState(null);
  const canceled = searchParams.get("canceled");

  // Fetch current subscription
  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscription");
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    enabled: status === "authenticated",
  });

  const currentPlan = subscriptionData?.subscription?.plan || "free";

  const handleSubscribe = async (planId) => {
    if (status !== "authenticated") {
      router.push("/auth/login?redirect=/pricing");
      return;
    }

    if (planId === "free") return;

    setIsLoading(planId);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start checkout");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setIsLoading(null);
    }
  };

  const getBadgeColor = (badge) => {
    switch (badge) {
      case "blue":
        return "text-blue-500";
      case "gold":
        return "text-yellow-500";
      case "purple":
        return "text-purple-500";
      default:
        return "";
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ConnectifyLogo width={200} height={200} className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar session={session} router={router} />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
            Unlock premium features and take your social experience to the next level
          </p>
        </div>

        {/* Canceled notice */}
        {canceled && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-center">
            <p className="text-yellow-800 dark:text-yellow-200">
              Checkout was canceled. Feel free to try again when you&apos;re ready.
            </p>
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                plan.popular ? "ring-2 ring-pink-500" : ""
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-center py-1 text-sm font-medium">
                  Most Popular
                </div>
              )}

              <div className={`p-6 ${plan.popular ? "pt-10" : ""}`}>
                {/* Plan name and badge */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                  {plan.badge && (
                    <i className={`fas fa-check-circle ${getBadgeColor(plan.badge)}`}></i>
                  )}
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-500 dark:text-slate-400">/month</span>
                  )}
                </div>

                {/* Description */}
                <p className="text-gray-600 dark:text-slate-400 mb-6">
                  {plan.description}
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <i className="fas fa-check text-green-500 mt-1 flex-shrink-0"></i>
                      <span className="text-gray-700 dark:text-slate-300 text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isLoading === plan.id || currentPlan === plan.id}
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    currentPlan === plan.id
                      ? "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-default"
                      : plan.popular
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90"
                      : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90"
                  } disabled:opacity-50`}
                >
                  {isLoading === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : currentPlan === plan.id ? (
                    "Current Plan"
                  ) : plan.id === "free" ? (
                    "Get Started"
                  ) : (
                    "Subscribe"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-gray-600 dark:text-slate-400">
                Yes! You can cancel your subscription at any time. You&apos;ll continue to have access to premium features until the end of your billing period.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 dark:text-slate-400">
                We accept all major credit cards (Visa, MasterCard, American Express) through our secure payment processor, Stripe.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I upgrade or downgrade my plan?
              </h3>
              <p className="text-gray-600 dark:text-slate-400">
                Absolutely! You can change your plan at any time. When upgrading, you&apos;ll be charged the prorated difference. When downgrading, the change takes effect at the start of your next billing cycle.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600 dark:text-slate-400">
                New subscribers can enjoy a 7-day free trial of any paid plan. You won&apos;t be charged until the trial ends, and you can cancel anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">
            Secure payment powered by
          </p>
          <div className="flex items-center justify-center gap-6">
            <i className="fab fa-cc-stripe text-4xl text-gray-400"></i>
            <i className="fab fa-cc-visa text-4xl text-gray-400"></i>
            <i className="fab fa-cc-mastercard text-4xl text-gray-400"></i>
            <i className="fab fa-cc-amex text-4xl text-gray-400"></i>
          </div>
        </div>
      </main>
    </div>
  );
}
