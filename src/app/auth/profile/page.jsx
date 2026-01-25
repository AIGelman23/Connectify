"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ConnectifyLogo from "@/components/ConnectifyLogo";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="text-center">
        <ConnectifyLogo width={350} height={350} className="mx-auto animate-pulse" />
        <p className="mt-4 text-gray-600">Loading profile editor...</p>
      </div>
    </div>
  );
}
