"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";

export default function ProfileReelsGrid({ userId }) {
  const router = useRouter();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReels = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/${userId}/reels`);
        if (!res.ok) throw new Error("Failed to fetch reels");
        const data = await res.json();
        setReels(data.reels || []);
      } catch (err) {
        console.error("Error fetching reels:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchReels();
    }
  }, [userId]);

  const formatViews = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
          <i className="fas fa-video text-3xl text-gray-400 dark:text-slate-500"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Reels Yet
        </h3>
        <p className="text-gray-500 dark:text-slate-400">
          Short videos will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
      {reels.map((reel) => (
        <div
          key={reel.id}
          className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => router.push(`/reels/${reel.id}`)}
        >
          {/* Thumbnail */}
          {reel.thumbnailUrl ? (
            <img
              src={reel.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : reel.videoUrl ? (
            <video
              src={reel.videoUrl}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <i className="fas fa-video text-gray-600 text-2xl"></i>
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Play icon on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
              <i className="fas fa-play text-white text-lg ml-1"></i>
            </div>
          </div>

          {/* Duration badge */}
          {reel.videoDuration && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-white text-xs font-medium">
              {formatDuration(reel.videoDuration)}
            </div>
          )}

          {/* Views count */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-sm">
            <i className="fas fa-play text-xs"></i>
            <span className="font-medium">{formatViews(reel.viewsCount || 0)}</span>
          </div>

          {/* Pinned indicator */}
          {reel.isPinned && (
            <div className="absolute top-2 left-2">
              <i className="fas fa-thumbtack text-white text-sm drop-shadow-lg"></i>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
