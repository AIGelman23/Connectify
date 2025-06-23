// This file should NOT exist in a Next.js app using the /app directory structure.
// The correct file is layout.jsx, not layout.js.
// Remove this file to resolve the "Invalid or unexpected token" error.
//
// If you need a layout, use /src/app/layout.jsx only.
//

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(10); // 10 second countdown to auto-redirect

  const router = useRouter();

  // Add countdown effect after successful submission
  useEffect(() => {
    let timer;
    if (submitted && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (submitted && countdown === 0) {
      router.push("/auth/login");
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [submitted, countdown, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      setMessage(
        data.message ||
          "If your email exists in our system, you will receive a password reset link shortly."
      );
      setSubmitted(true);
      // Start the countdown
      setCountdown(10);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add this function before any auth redirect logic
  function shouldSkipAuthRedirect() {
    if (typeof window === "undefined") return false;

    // Check current pathname
    const pathname = window.location.pathname;
    if (pathname.startsWith("/auth/reset-password")) return true;

    // Check session flags
    if (sessionStorage.getItem("reset_password_in_progress") === "true")
      return true;
    if (sessionStorage.getItem("skip_auth_redirect") === "true") return true;
    if (localStorage.getItem("password_reset_active") === "true") return true;

    // Check global flag
    if (window.passwordResetActive) return true;

    return false;
  }

  // Then in your auth redirect logic:
  // if (!user && !shouldSkipAuthRedirect()) {
  //   router.push('/auth/login');
  // }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-10 max-w-md w-full border border-gray-200 animate-fade-in-up">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 text-center">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Forgot Password
          </span>
        </h1>

        {!submitted ? (
          <>
            <p className="text-gray-600 mb-8 text-center text-md sm:text-lg">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 text-sm flex items-center shadow-sm">
                <svg
                  className="h-5 w-5 text-red-500 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586l-1.293-1.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="block">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="appearance-none block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-base transition duration-150 ease-in-out"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-6 text-sm flex items-center shadow-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="block">{message}</span>
            </div>

            <p className="text-gray-600 mb-4 text-center">
              If you don't see the email, check your spam folder.
            </p>

            <div className="bg-blue-50 rounded-lg p-4 text-center mb-6">
              <p className="text-gray-700">
                Redirecting to login in{" "}
                <span className="font-semibold">{countdown}</span> seconds
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(countdown / 10) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => router.push("/auth/login")}
                className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Return to Login Now
              </button>
            </div>
          </>
        )}

        {!submitted && (
          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition duration-150 ease-in-out"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
