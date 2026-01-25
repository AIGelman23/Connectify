"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Navbar from "@/components/NavBar";
import { Spinner, Button } from "@/components/ui";
import ConnectifyLogo from "@/components/ConnectifyLogo";

export default function SoundPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ["sound", id],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams({ limit: "20" });
      if (pageParam) params.set("cursor", pageParam);

      const res = await fetch(`/api/sounds/${id}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: status === "authenticated",
  });

  const sound = data?.pages[0]?.sound;
  const reels = data?.pages.flatMap((page) => page.reels) || [];

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString() || "0";
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleUseSound = () => {
    // Navigate to create reel with this sound pre-selected
    router.push(`/reels/create?soundId=${id}`);
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <ConnectifyLogo width={350} height={350} className="animate-pulse" />
      </div>
    );
  }

  if (error || !sound) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Navbar session={session} router={router} />
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <i className="fas fa-music text-3xl text-gray-400 dark:text-slate-500"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Sound Not Found
          </h2>
          <p className="text-gray-500 dark:text-slate-400 mb-6">
            This sound doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push("/explore")}>Explore</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar session={session} router={router} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Sound Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Sound Icon / Play Button */}
            <button
              onClick={togglePlayback}
              className="relative w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 group"
            >
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-white text-2xl ${!isPlaying && 'ml-1'}`}></i>
              {isPlaying && (
                <div className="absolute inset-0 rounded-xl border-2 border-white/50 animate-pulse"></div>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {sound.name}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <i className="fas fa-clock"></i>
                  {formatDuration(sound.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <i className="fas fa-video"></i>
                  {formatCount(sound.usageCount)} reels
                </span>
              </div>

              <div className="mt-4 flex gap-3">
                <Button onClick={handleUseSound}>
                  <i className="fas fa-plus mr-2"></i>
                  Use This Sound
                </Button>
                <Button variant="outline" onClick={togglePlayback}>
                  <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} mr-2`}></i>
                  {isPlaying ? 'Pause' : 'Preview'}
                </Button>
              </div>
            </div>
          </div>

          {/* Hidden audio element */}
          <audio
            ref={audioRef}
            src={sound.audioUrl}
            onEnded={() => setIsPlaying(false)}
            preload="metadata"
          />
        </div>

        {/* Reels Using This Sound */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Reels Using This Sound
            </h2>
          </div>

          {reels.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <i className="fas fa-video text-2xl text-gray-400 dark:text-slate-500"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No reels yet
              </h3>
              <p className="text-gray-500 dark:text-slate-400 mb-4">
                Be the first to create a reel with this sound!
              </p>
              <Button onClick={handleUseSound}>Create Reel</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1 p-1">
                {reels.map((reel) => (
                  <div
                    key={reel.id}
                    onClick={() => router.push(`/reels/${reel.id}`)}
                    className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden cursor-pointer group"
                  >
                    {reel.thumbnailUrl ? (
                      <img
                        src={reel.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={reel.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex items-center gap-1 text-white text-xs">
                        <i className="fas fa-play"></i>
                        <span>{formatCount(reel.viewsCount)}</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <i className="fas fa-play text-white text-2xl"></i>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasNextPage && (
                <div className="p-4 text-center border-t border-gray-100 dark:border-slate-700">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    loading={isFetchingNextPage}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
