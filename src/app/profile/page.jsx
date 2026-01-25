"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ConnectifyLogo from "@/components/ConnectifyLogo";

export const dynamic = 'force-dynamic';

export default function ProfileRedirect() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      // Redirect to user's own profile page using their ID
      router.push(`/profile/${session.user.id}`);
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
      </div>
    </div>
  );
}
