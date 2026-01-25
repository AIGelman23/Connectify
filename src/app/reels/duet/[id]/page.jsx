// src/app/reels/duet/[id]/page.jsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DuetCreator from "@/components/reels/DuetCreator";
import ConnectifyLogo from "@/components/ConnectifyLogo";

export default function DuetPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const reelId = params.id;

  // Fetch original reel
  const { data, isLoading, error } = useQuery({
    queryKey: ["reel", reelId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${reelId}`);
      if (!res.ok) throw new Error("Failed to fetch reel");
      return res.json();
    },
    enabled: !!reelId && status === "authenticated",
  });

  // Auth check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <ConnectifyLogo width={200} height={200} className="animate-pulse" />
      </div>
    );
  }

  if (error || !data?.post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <p className="text-red-500 mb-4">Could not load reel</p>
        <button
          onClick={() => router.push("/reels")}
          className="px-6 py-3 bg-gray-800 text-white rounded-xl"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Check if reel is valid for duet
  if (!data.post.isReel || !data.post.videoUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <p className="text-yellow-500 mb-4">This content is not available for duet</p>
        <button
          onClick={() => router.push("/reels")}
          className="px-6 py-3 bg-gray-800 text-white rounded-xl"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Format reel data for DuetCreator
  const originalReel = {
    id: data.post.id,
    videoUrl: data.post.videoUrl,
    content: data.post.content,
    author: {
      id: data.post.author.id,
      name: data.post.author.name,
      imageUrl: data.post.author.profile?.profilePictureUrl || data.post.author.image,
    },
    sound: data.post.sound,
  };

  return (
    <DuetCreator
      originalReel={originalReel}
      onClose={() => router.push("/reels")}
    />
  );
}
