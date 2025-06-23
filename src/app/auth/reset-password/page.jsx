"use client";

// Add this at the very top before any imports
if (typeof window !== 'undefined') {
  console.log('RESET PAGE: Setting emergency flags before component loads');
  window.localStorage.setItem('emergency_reset_bypass', 'true');
  window.sessionStorage.setItem('emergency_reset_bypass', 'true');
  window.RESET_PASSWORD_BYPASS = true;
}

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ConnectifyLogo from '@/components/ConnectifyLogo';
import AnimatedBackground from '@/components/AnimatedBackground';

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [validating, setValidating] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    console.log("Reset password page mounted");

    // IMMEDIATELY set flags to prevent redirects
    if (typeof window !== 'undefined') {
      // Set flags synchronously
      sessionStorage.setItem('reset_password_in_progress', 'true');
      sessionStorage.setItem('skip_auth_redirect', 'true');
      localStorage.setItem('password_reset_active', 'true');
      window.passwordResetActive = true;

      // Also try to block any pending navigation
      const preventNavigation = (e) => {
        console.log("Preventing navigation away from reset page");
        e.preventDefault();
        return false;
      };

      // Block beforeunload events temporarily
      window.addEventListener('beforeunload', preventNavigation);

      // Clean up after a short delay
      setTimeout(() => {
        window.removeEventListener('beforeunload', preventNavigation);
      }, 2000);
    }

    // Get the token from URL immediately to prevent any redirects
    const tokenFromUrl = searchParams.get('token');
    console.log("Token from URL:", tokenFromUrl ? "exists (value hidden)" : "missing");

    if (!tokenFromUrl) {
      setError('Reset token is missing');
      setValidating(false);
      return;
    }

    setToken(tokenFromUrl);

    // Validate token with the API
    const validateToken = async () => {
      try {
        console.log("Validating token with API...");
        const response = await fetch(`/api/auth/validate-reset-token?token=${tokenFromUrl}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Invalid or expired token');
        }

        console.log("Token validation successful");
        setTokenValid(true);
      } catch (err) {
        console.error("Token validation error:", err);
        setError(err.message);
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    validateToken();

    // Cleanup function
    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('reset_password_in_progress');
        sessionStorage.removeItem('skip_auth_redirect');
        localStorage.removeItem('password_reset_active');
        window.passwordResetActive = false;
      }
    };
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setError('Both password fields are required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('Reset token is missing');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      setMessage('Password has been reset successfully');

      // Redirect to login after a brief delay
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen flex items-center justify-center bg-transparent py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white bg-opacity-95 py-8 px-6 shadow-lg rounded-lg sm:px-10 backdrop-blur-sm text-center">
              <div className="flex justify-center mb-6">
                <ConnectifyLogo width={300} height={120} />
              </div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Validating your reset token...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!tokenValid && !validating) {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen flex items-center justify-center bg-transparent py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white bg-opacity-95 py-8 px-6 shadow-lg rounded-lg sm:px-10 backdrop-blur-sm">
              <div className="flex justify-center mb-6">
                <ConnectifyLogo width={300} height={120} />
              </div>
              <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-4">
                Invalid Link
              </h1>
              <p className="text-gray-600 mb-8 text-center text-sm">
                This password reset link is invalid or has expired.
              </p>
              <div className="text-center">
                <Link
                  href="/auth/forgot-password"
                  className="inline-flex justify-center py-3 px-6 border-none rounded-md shadow-lg text-base font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-all duration-200"
                  style={{
                    minHeight: 48,
                    letterSpacing: '0.03em'
                  }}
                >
                  Request a New Link
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

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
              Reset Password
            </h2>
            <p className="text-gray-600 mb-8 text-center text-sm">
              Please enter your new password below.
            </p>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 text-sm flex items-center shadow-sm">
                <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586l-1.293-1.293z" clipRule="evenodd" />
                </svg>
                <span className="block">{error}</span>
              </div>
            )}

            {message && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6 text-sm flex items-center shadow-sm">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="block">{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">New Password</label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="auth-input appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base pr-10 bg-white text-gray-900"
                    placeholder="••••••••"
                    style={{ WebkitAppearance: 'none', backgroundColor: 'white !important', color: '#111827 !important' }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 touch-manipulation"
                    style={{ minWidth: '44px', minHeight: '44px' }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowPassword(!showPassword);
                    }}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="auth-input appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base bg-white text-gray-900"
                    placeholder="••••••••"
                    style={{ WebkitAppearance: 'none', backgroundColor: 'white !important', color: '#111827 !important' }}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border-none text-base font-bold rounded-md text-white bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 shadow-lg hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  style={{
                    minHeight: 48,
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    letterSpacing: '0.03em',
                    WebkitAppearance: 'none'
                  }}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
