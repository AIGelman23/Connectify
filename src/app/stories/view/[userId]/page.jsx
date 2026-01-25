// src/app/stories/view/[userId]/page.jsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import StoryViewer from "@/components/stories/StoryViewer";
import ConnectifyLogo from "@/components/ConnectifyLogo";

export default function ViewStoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const userId = params.userId;

  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [allUserIds, setAllUserIds] = useState([]);

  // Fetch stories for the specific user
  const { data, isLoading, error } = useQuery({
    queryKey: ["user-stories", userId],
    queryFn: async () => {
      const res = await fetch(`/api/stories?type=user&userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch stories");
      return res.json();
    },
    enabled: !!userId && status === "authenticated",
  });

  // Also fetch the feed to get the list of all users with stories for navigation
  const { data: feedData } = useQuery({
    queryKey: ["stories-feed"],
    queryFn: async () => {
      const res = await fetch("/api/stories?type=feed");
      if (!res.ok) throw new Error("Failed to fetch stories feed");
      return res.json();
    },
    enabled: status === "authenticated",
    staleTime: 30000,
  });

  // Set up all user IDs for navigation between users' stories
  useEffect(() => {
    if (feedData?.storyGroups) {
      const userIds = feedData.storyGroups
        .filter((g) => !g.user.isCurrentUser && g.storyCount > 0)
        .map((g) => g.user.id);
      
      setAllUserIds(userIds);
      
      // Find current user's position
      const currentIndex = userIds.indexOf(userId);
      if (currentIndex !== -1) {
        setCurrentUserIndex(currentIndex);
      }
    }
  }, [feedData, userId]);

  // Transform stories for the viewer
  const stories = data?.stories?.map((story) => ({
    id: story.id,
    mediaUrl: story.mediaUrl,
    mediaType: story.mediaType || "image",
    thumbnailUrl: story.thumbnailUrl,
    caption: story.caption,
    location: story.location,
    duration: story.duration || 5000,
    createdAt: story.createdAt,
    viewsCount: story._count?.views || story.viewsCount || 0,
    isOwn: story.author?.id === session?.user?.id,
    // Parse JSON fields
    textOverlays: story.textOverlays ? (typeof story.textOverlays === 'string' ? JSON.parse(story.textOverlays) : story.textOverlays) : [],
    stickers: story.stickers ? (typeof story.stickers === 'string' ? JSON.parse(story.stickers) : story.stickers) : [],
    filters: story.filters ? (typeof story.filters === 'string' ? JSON.parse(story.filters) : story.filters) : null,
    author: {
      id: story.author?.id,
      name: story.author?.name || story.author?.profile?.displayName,
      image: story.author?.image || story.author?.profile?.avatarUrl,
    },
  })) || [];

  // Handle close - go back to previous page
  const handleClose = useCallback(() => {
    // Invalidate stories feed to refresh view counts
    queryClient.invalidateQueries({ queryKey: ["stories-feed"] });
    router.back();
  }, [router, queryClient]);

  // Handle navigation to next user's stories
  const handleNextUser = useCallback(() => {
    if (currentUserIndex < allUserIds.length - 1) {
      const nextUserId = allUserIds[currentUserIndex + 1];
      router.replace(`/stories/view/${nextUserId}`);
    } else {
      // No more users, close the viewer
      handleClose();
    }
  }, [currentUserIndex, allUserIds, router, handleClose]);

  // Handle navigation to previous user's stories
  const handlePreviousUser = useCallback(() => {
    if (currentUserIndex > 0) {
      const prevUserId = allUserIds[currentUserIndex - 1];
      router.replace(`/stories/view/${prevUserId}`);
    }
  }, [currentUserIndex, allUserIds, router]);

  // Handle story change within the same user
  const handleStoryChange = useCallback((index) => {
    // Story changed within the same user - handled by StoryViewer
  }, []);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <ConnectifyLogo width={200} height={200} className="animate-pulse" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-8">
        <i className="fas fa-exclamation-circle text-4xl mb-4 text-red-500"></i>
        <p className="text-center mb-4">Failed to load stories</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-white/20 rounded-lg hover:bg-white/30"
        >
          Go Back
        </button>
      </div>
    );
  }

  // No stories found
  if (!stories || stories.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-8">
        <i className="fas fa-camera text-4xl mb-4 opacity-50"></i>
        <p className="text-center mb-4">No stories available</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-white/20 rounded-lg hover:bg-white/30"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <StoryViewer
      stories={stories}
      initialIndex={0}
      userId={userId}
      onClose={handleClose}
      onStoryChange={handleStoryChange}
      onNextUser={handleNextUser}
      onPreviousUser={handlePreviousUser}
    />
  );
}
