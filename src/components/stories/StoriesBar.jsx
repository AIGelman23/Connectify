// src/components/stories/StoriesBar.jsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

export default function StoriesBar({ userId }) {
  const router = useRouter();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Fetch stories feed
  const { data, isLoading, error } = useQuery({
    queryKey: ["stories-feed"],
    queryFn: async () => {
      const res = await fetch("/api/stories?type=feed");
      if (!res.ok) throw new Error("Failed to fetch stories");
      return res.json();
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });

  const storyGroups = data?.storyGroups || [];

  // Check scroll position
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [storyGroups]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 300);
    }
  };

  const handleStoryClick = (storyGroup) => {
    if (storyGroup.user.isCurrentUser && storyGroup.storyCount === 0) {
      // No stories yet, go to create
      router.push("/stories/create");
    } else {
      // View stories
      router.push(`/stories/view/${storyGroup.user.id}`);
    }
  };

  const handleAddStory = () => {
    router.push("/stories/create");
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700 p-4 mb-4">
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-700" />
              <div className="w-12 h-3 rounded bg-gray-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return null; // Silently fail if stories can't be loaded
  }

  // Find current user's story group or create placeholder
  const currentUserGroup = storyGroups.find((g) => g.user.isCurrentUser);
  const otherGroups = storyGroups.filter((g) => !g.user.isCurrentUser);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700 p-4 mb-4 relative">
      {/* Scroll Buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-700 shadow-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
        >
          <i className="fas fa-chevron-left text-gray-600 dark:text-slate-300 text-sm"></i>
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-700 shadow-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
        >
          <i className="fas fa-chevron-right text-gray-600 dark:text-slate-300 text-sm"></i>
        </button>
      )}

      {/* Stories Row */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
        onScroll={checkScroll}
      >
        {/* Add Story Button (Current User) */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <button
            onClick={handleAddStory}
            className="relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center group hover:scale-105 transition-transform"
          >
            {currentUserGroup && currentUserGroup.storyCount > 0 ? (
              <>
                <img
                  src={currentUserGroup.user.image || "/default-avatar.png"}
                  alt="Your story"
                  className="w-full h-full rounded-full object-cover"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white dark:border-slate-800">
                  <i className="fas fa-plus text-white text-xs"></i>
                </div>
              </>
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <i className="fas fa-plus text-white text-xl"></i>
              </div>
            )}
          </button>
          <span className="text-xs text-gray-600 dark:text-slate-400 font-medium truncate w-16 text-center">
            Your Story
          </span>
        </div>

        {/* Other Users' Stories */}
        {otherGroups.map((group) => (
          <StoryAvatar
            key={group.user.id}
            group={group}
            onClick={() => handleStoryClick(group)}
          />
        ))}

        {/* Empty state message */}
        {otherGroups.length === 0 && (
          <div className="flex items-center justify-center flex-1 py-2 px-4">
            <p className="text-sm text-gray-400 dark:text-slate-500">
              No stories from your connections yet
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// Individual Story Avatar Component
function StoryAvatar({ group, onClick }) {
  const hasUnviewed = group.hasUnviewed;
  
  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      <button
        onClick={onClick}
        className={`relative w-16 h-16 rounded-full p-[3px] hover:scale-105 transition-transform ${
          hasUnviewed
            ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
            : "bg-gray-300 dark:bg-slate-600"
        }`}
      >
        <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 p-[2px]">
          <img
            src={group.user.image || "/default-avatar.png"}
            alt={group.user.name}
            className="w-full h-full rounded-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(group.user.name || "User")}&background=random`;
            }}
          />
        </div>
        {/* Story count badge */}
        {group.storyCount > 1 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium border-2 border-white dark:border-slate-800">
            {group.storyCount}
          </div>
        )}
      </button>
      <span className="text-xs text-gray-600 dark:text-slate-400 font-medium truncate w-16 text-center">
        {group.user.name?.split(" ")[0] || "User"}
      </span>
    </div>
  );
}
