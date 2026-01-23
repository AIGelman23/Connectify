"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConnectifyLogo from '@/components/ConnectifyLogo';
import AnimatedBackground from '@/components/AnimatedBackground';

export default function ForgotPasswordPage() {
  // Step management: 1 = email, 2 = code, 3 = password
  const [step, setStep] = useState(1);

  // Step 1 state
  const [email, setEmail] = useState('');

  // Step 2 state
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(60);
  const codeInputRefs = useRef([]);

  // Step 3 state
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Shared state
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Development mode code display
  const [devCode, setDevCode] = useState('');

  const router = useRouter();

  // Rate limit countdown effect
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

  // Resend countdown effect
  useEffect(() => {
    let timer;
    if (step === 2 && resendCountdown > 0) {
      timer = setTimeout(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
    } else if (resendCountdown === 0) {
      setResendDisabled(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [step, resendCountdown]);

  // Focus first code input when entering step 2
  useEffect(() => {
    if (step === 2 && codeInputRefs.current[0]) {
      codeInputRefs.current[0].focus();
    }
  }, [step]);

  // Step 1: Request verification code
  const handleRequestCode = async (e) => {
    e?.preventDefault();

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
        setRateLimited(true);
        setRateLimitCountdown(data.retryAfter || 3600);
        setError('Too many password reset attempts. Please try again later.');
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      // Store dev code if provided
      if (data.code) {
        setDevCode(data.code);
      }

      setMessage('Verification code sent! Check your email.');
      setStep(2);
      setResendCountdown(60);
      setResendDisabled(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle code input
  const handleCodeInput = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take last character
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    const fullCode = newCode.join('');
    if (fullCode.length === 6 && !newCode.includes('')) {
      handleVerifyCode(fullCode);
    }
  };

  // Handle backspace in code input
  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste in code input
  const handleCodePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      codeInputRefs.current[5]?.focus();
      handleVerifyCode(pastedData);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (codeValue) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeValue }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setError('Too many attempts. Please request a new code.');
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || 'Invalid code');
      }

      setResetToken(data.resetToken);
      setMessage('Code verified! Set your new password.');
      setStep(3);
    } catch (err) {
      setError(err.message);
      // Clear the code on error
      setCode(['', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    setCode(['', '', '', '', '', '']);
    setDevCode('');
    await handleRequestCode();
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/auth/login?reset=success');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Go back to previous step
  const handleBack = () => {
    setError('');
    setMessage('');
    if (step === 2) {
      setStep(1);
      setCode(['', '', '', '', '', '']);
      setDevCode('');
    } else if (step === 3) {
      setStep(2);
      setPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen flex items-center justify-center bg-transparent py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white bg-opacity-95 dark:bg-gray-800 dark:bg-opacity-95 py-8 px-6 shadow-lg dark:shadow-xl rounded-lg sm:px-10 backdrop-blur-sm">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <ConnectifyLogo width={300} height={120} />
            </div>

            {/* Title */}
            <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
              {step === 1 && 'Forgot Password'}
              {step === 2 && 'Enter Verification Code'}
              {step === 3 && 'Set New Password'}
            </h2>

            {/* Step indicator */}
            <div className="flex justify-center items-center gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-8 h-1 rounded-full transition-colors ${
                    s <= step ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative mb-6 text-sm flex items-center shadow-sm">
                <svg className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586l-1.293-1.293z" clipRule="evenodd" />
                </svg>
                <span className="block">{error}</span>
              </div>
            )}

            {/* Success message */}
            {message && (
              <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded relative mb-6 text-sm flex items-center shadow-sm">
                <svg className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="block">{message}</span>
              </div>
            )}

            {/* Rate limit warning */}
            {rateLimited && (
              <div className="bg-orange-100 dark:bg-orange-900 border border-orange-400 dark:border-orange-700 text-orange-700 dark:text-orange-200 px-4 py-3 rounded relative mb-6 text-sm">
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

            {/* Step 1: Email Entry */}
            {step === 1 && (
              <>
                <p className="text-gray-600 dark:text-gray-300 mb-8 text-center text-sm">
                  Enter your email address and we'll send you a verification code.
                </p>

                <form onSubmit={handleRequestCode} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Email Address
                    </label>
                    <div className="mt-1">
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="appearance-none block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || rateLimited}
                    className="w-full flex justify-center py-3 px-4 border-none text-base font-bold rounded-md text-white bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 shadow-lg hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      'Send Verification Code'
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/auth/login"
                    className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 transition-all duration-200"
                  >
                    Back to Login
                  </Link>
                </div>
              </>
            )}

            {/* Step 2: Code Entry */}
            {step === 2 && (
              <>
                <p className="text-gray-600 dark:text-gray-300 mb-2 text-center text-sm">
                  We sent a 6-digit code to
                </p>
                <p className="text-gray-900 dark:text-gray-100 font-medium mb-6 text-center text-sm">
                  {email}
                </p>

                {/* Development mode code display */}
                {devCode && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-6">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">Development Mode</p>
                    <p className="text-lg font-mono font-bold text-yellow-800 dark:text-yellow-300 tracking-widest">{devCode}</p>
                  </div>
                )}

                {/* 6-digit code input */}
                <div className="flex justify-center gap-2 mb-6" onPaste={handleCodePaste}>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      ref={(el) => (codeInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={code[index]}
                      onChange={(e) => handleCodeInput(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      disabled={loading}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                    />
                  ))}
                </div>

                {loading && (
                  <div className="flex justify-center mb-6">
                    <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}

                {/* Resend code */}
                <div className="text-center mb-6">
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Didn't receive the code?</p>
                  <button
                    onClick={handleResendCode}
                    disabled={resendDisabled || loading}
                    className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed text-sm"
                  >
                    {resendDisabled ? `Resend code in ${resendCountdown}s` : 'Resend code'}
                  </button>
                </div>

                {/* Back button */}
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="w-full py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 font-medium text-sm transition-colors"
                >
                  ← Use a different email
                </button>
              </>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <>
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-center text-sm">
                  Create a new password for your account.
                </p>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      New Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="appearance-none block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pr-10"
                        placeholder="At least 6 characters"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 touch-manipulation"
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
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Confirm Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="appearance-none block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pr-10"
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 touch-manipulation"
                        style={{ minWidth: '44px', minHeight: '44px' }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowConfirmPassword(!showConfirmPassword);
                        }}
                      >
                        {showConfirmPassword ? (
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border-none text-base font-bold rounded-md text-white bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 shadow-lg hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Resetting...
                      </span>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </form>

                {/* Back button */}
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="w-full mt-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 font-medium text-sm transition-colors"
                >
                  ← Back
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
