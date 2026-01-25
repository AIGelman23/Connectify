"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConnectifyLogo from '@/components/ConnectifyLogo';
import AnimatedBackground from '@/components/AnimatedBackground';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!name || !email || !password) {
      setError('Name, email and password are required.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      setMessage(data.message || 'Account created. Redirecting to login...');
      setTimeout(() => router.push('/auth/login'), 1500);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen flex items-center justify-center bg-transparent py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white dark:bg-slate-800 bg-opacity-95 dark:bg-opacity-95 py-8 px-6 shadow-lg rounded-lg sm:px-10 backdrop-blur-sm">
            <div className="flex justify-center mb-6">
              <ConnectifyLogo width={300} height={120} />
            </div>

            <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white mb-6">
              Create your account
            </h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 text-sm flex items-center shadow-sm">
                <span className="block">{error}</span>
              </div>
            )}

            {message && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6 text-sm flex items-center shadow-sm">
                <span className="block">{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Full Name</label>
                <div className="mt-1">
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="auth-input block w-full px-3 py-3 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Email Address</label>
                <div className="mt-1">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="auth-input block w-full px-3 py-3 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Password</label>
                <div className="mt-1">
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="auth-input block w-full px-3 py-3 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    placeholder="At least 8 characters"
                    minLength={8}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Confirm Password</label>
                <div className="mt-1">
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="auth-input block w-full px-3 py-3 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    placeholder="Re-enter password"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border-none text-base font-bold rounded-md text-white bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 shadow-lg hover:from-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  style={{ minHeight: 48 }}
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Already have an account?{" "}
                <Link href="/auth/login" className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}