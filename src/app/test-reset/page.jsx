"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestResetPage() {
  const [token, setToken] = useState('');
  const router = useRouter();

  const testReset = () => {
    if (token) {
      const resetUrl = `/auth/reset-password?token=${token}`;
      console.log('Navigating to:', resetUrl);
      router.push(resetUrl);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="max-w-md w-full p-6 bg-gray-100 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Test Password Reset</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Enter Token:</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter reset token"
            />
          </div>
          <button
            onClick={testReset}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Test Reset Page
          </button>
          <div className="text-sm text-gray-600">
            <p>Or try a direct link:</p>
            <a
              href="/auth/reset-password?token=test-token-123"
              className="text-blue-500 underline"
            >
              /auth/reset-password?token=test-token-123
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
