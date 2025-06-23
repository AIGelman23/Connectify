"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConnectifyLogo from '@/components/ConnectifyLogo';
import AnimatedBackground from '@/components/AnimatedBackground';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(10); // 10 second countdown to auto-redirect
  const [resetLink, setResetLink] = useState('');
  const [showCopiedModal, setShowCopiedModal] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const router = useRouter();

  // Add countdown effect after successful submission
  useEffect(() => {
    let timer;
    if (submitted && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (submitted && countdown === 0) {
      router.push('/auth/login');
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [submitted, countdown, router]);

  // Add effect for rate limit countdown
  useEffect(() => {
    let timer;
    if (rateLimited && rateLimitCountdown > 0) {
      timer = setTimeout(() => {
        setRateLimitCountdown(prevCount => prevCount - 1);
      }, 1000);
    } else if (rateLimited && rateLimitCountdown === 0) {
      setRateLimited(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [rateLimited, rateLimitCountdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.status === 429) {
        // Handle rate limit error
        setRateLimited(true);
        setRateLimitCountdown(60 * 60); // 1 hour countdown
        setError('Too many password reset attempts. Please try again later.');
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      setMessage(data.message || "If your email exists in our system, you will receive a password reset link shortly.");

      // Store reset link if in development
      if (data.resetLink) {
        setResetLink(data.resetLink);
      }

      setSubmitted(true);
      setCountdown(10);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen flex items-center justify-center bg-transparent py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white bg-opacity-95 py-8 px-6 shadow-lg rounded-lg sm:px-10 backdrop-blur-sm">
            {/* Logo at the top */}
            <div className="flex justify-center mb-6">
              <ConnectifyLogo width={300} height={120} />
            </div>

            <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-6">
              Forgot Password
            </h2>

            {!submitted ? (
              <>
                <p className="text-gray-600 mb-8 text-center text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 text-sm flex items-center shadow-sm">
                    <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586l-1.293-1.293z" clipRule="evenodd" />
                    </svg>
                    <span className="block">{error}</span>
                  </div>
                )}

                {rateLimited && (
                  <div className="bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded relative mb-6 text-sm">
                    <p className="font-medium">Rate limit exceeded</p>
                    <p className="mt-1">
                      For security reasons, you can only request a password reset a few times per hour.
                      {rateLimitCountdown > 0 && (
                        <span className="block mt-2">
                          You can try again in: <span className="font-bold">{Math.floor(rateLimitCountdown / 60)}m {rateLimitCountdown % 60}s</span>
                        </span>
                      )}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                    <div className="mt-1">
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="auth-input appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base bg-white text-gray-900"
                        placeholder="you@example.com"
                        style={{ WebkitAppearance: 'none', backgroundColor: 'white !important', color: '#111827 !important' }}
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading || rateLimited}
                      className="group relative w-full flex justify-center py-3 px-4 border-none text-base font-bold rounded-md text-white bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 shadow-lg hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      style={{
                        minHeight: 48,
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        letterSpacing: '0.03em',
                        WebkitAppearance: 'none'
                      }}
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>

                {resetLink && (
                  <div className="mt-4 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="text-sm font-medium text-yellow-800 mb-1">Development Mode Only</h3>
                    <p className="text-xs text-yellow-700 mb-2">
                      In production, an email would be sent. For now, copy this link and paste it into your browser:
                    </p>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={resetLink}
                        readOnly
                        className="auth-input text-xs p-2 bg-white border border-gray-300 rounded-md flex-grow text-gray-900"
                        style={{ backgroundColor: 'white !important', color: '#111827 !important' }}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(resetLink);
                          setShowCopiedModal(true);
                          setTimeout(() => setShowCopiedModal(false), 2000);
                        }}
                        className="ml-2 p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-xs"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-6 text-center">
                  <Link
                    href="/auth/login"
                    className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 transition-all duration-200"
                    style={{ letterSpacing: '0.03em' }}
                  >
                    Back to Login
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6 text-sm flex items-center shadow-sm">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="block">{message}</span>
                </div>

                {resetLink && (
                  <div className="mt-4 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="text-sm font-medium text-yellow-800 mb-1">Development Mode Only</h3>
                    <p className="text-xs text-yellow-700 mb-2">
                      In production, an email would be sent. For now, copy this link and paste it into your browser:
                    </p>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={resetLink}
                        readOnly
                        className="auth-input text-xs p-2 bg-white border border-gray-300 rounded-md flex-grow text-gray-900"
                        style={{ backgroundColor: 'white !important', color: '#111827 !important' }}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(resetLink);
                          setShowCopiedModal(true);
                          setTimeout(() => setShowCopiedModal(false), 2000);
                        }}
                        className="ml-2 p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-xs"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-gray-600 mb-4 text-center text-sm">
                  If you don't see the email, check your spam folder.
                </p>

                <div className="bg-blue-50 rounded-lg p-4 text-center mb-6">
                  <p className="text-gray-700 text-sm">Redirecting to login in <span className="font-semibold">{countdown}</span> seconds</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(countdown / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="inline-flex justify-center py-2 px-4 border-none rounded-md shadow-sm text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-all duration-200"
                  >
                    Return to Login Now
                  </button>
                </div>
              </>
            )}

            {/* Simple overlay modal for copied link */}
            {showCopiedModal && (
              <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="bg-opacity-50 fixed inset-0"></div>
                <div className="bg-white rounded-lg p-4 shadow-2xl z-50 relative border border-gray-100">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-800 font-medium">Reset link copied!</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
