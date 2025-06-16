// src/app/auth/signup/page.jsx
"use client"; // This component runs on the client side

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use 'next/navigation' for App Router
import { signIn } from 'next-auth/react'; // Import signIn to optionally log in after signup

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // State for name
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }), // Include name in the request
      });

      const data = await response.json();

      if (!response.ok) {
        // If the response status is not 2xx, it's an error
        setError(data.message || 'Registration failed.');
        setLoading(false);
        return;
      }

      // If registration is successful
      console.log('Registration successful:', data.message);

      // Automatically sign the user in after successful registration
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false, // Prevents immediate redirect, allows custom handling
      });

      if (signInResult?.error) {
        setError(signInResult.error);
        console.error('Auto sign-in failed:', signInResult.error);
        setLoading(false);
      } else {
        // Successfully registered AND signed in
        // Now, fetch the user's profile to check if it's complete
        try {
          const profileRes = await fetch('/api/profile');
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData.profile && profileData.profile.isProfileComplete) {
              // Profile is complete, redirect to dashboard
              router.push('/dashboard');
            } else {
              // Profile is not complete (e.g., brand new user), redirect to profile setup
              router.push('/edit-profile'); // UPDATED: Redirect to the dedicated edit profile page
            }
          } else {
            // If fetching profile fails (e.g., 404), assume it's incomplete or needs creation
            // and redirect to profile page as a fallback
            console.warn('Failed to fetch profile after signup (e.g., 404), redirecting to profile setup.');
            router.push('/edit-profile'); // UPDATED: Redirect to the dedicated edit profile page
          }
        } catch (profileFetchError) {
          console.error('Error fetching profile after signup:', profileFetchError);
          // Fallback redirect to profile page if profile fetch fails
          router.push('/edit-profile'); // UPDATED: Redirect to the dedicated edit profile page
        }
      }

    } catch (err) {
      console.error('An unexpected error occurred during signup:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-10 max-w-md w-full border border-gray-200 animate-fade-in-up">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 text-center">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Create Your Account
          </span>
        </h1>
        <p className="text-gray-600 mb-8 text-center text-md sm:text-lg">Join us today and unlock new possibilities!</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 text-sm flex items-center shadow-sm">
            <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586l-1.293-1.293z" clipRule="evenodd" />
            </svg>
            <span className="block">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="appearance-none block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-base transition duration-150 ease-in-out"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="appearance-none block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-base transition duration-150 ease-in-out"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="appearance-none block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-base transition duration-150 ease-in-out"
              placeholder="••••••••"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Registering...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/auth/login')}
            className="font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none focus:underline transition duration-150 ease-in-out"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
}
