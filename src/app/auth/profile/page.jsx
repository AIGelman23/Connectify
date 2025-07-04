"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

export default function AuthProfileRedirect() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      // Redirect to edit profile page instead of trying to hit a non-existent /profile endpoint
      router.push('/edit-profile');
    } else if (status === 'unauthenticated') {
      // If not logged in, redirect to login
      router.push('/auth/login');
    }
  }, [status, router, session]);

  // Loading state while waiting for session or redirect
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading profile editor...</p>
      </div>
    </div>
  );
}
