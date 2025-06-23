"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to the console
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="mb-4">Error details: {error.message}</p>
        <button
          onClick={() => reset()}
          className="p-2 bg-blue-500 text-white rounded"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
