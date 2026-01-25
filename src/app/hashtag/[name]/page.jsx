"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Navbar from "@/components/NavBar";
import { Spinner, Tabs, TabsList, TabsTrigger, Button } from "@/components/ui";
import ConnectifyLogo from "@/components/ConnectifyLogo";

export default function HashtagPage() {
  const { name } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("all");

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
    queryKey: ["hashtag", name, activeTab],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams({
        limit: "20",
        type: activeTab,
      });
      if (pageParam) params.set("cursor", pageParam);

      const res = await fetch(`/api/hashtags/${name}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: status === "authenticated",
  });

  const hashtag = data?.pages[0]?.hashtag;
  const posts = data?.pages.flatMap((page) => page.posts) || [];

  const formatCount = (count) => {
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

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <ConnectifyLogo width={350} height={350} className="animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Navbar session={session} router={router} />
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <i className="fas fa-hashtag text-3xl text-gray-400 dark:text-slate-500"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Hashtag Not Found
          </h2>
          <p className="text-gray-500 dark:text-slate-400 mb-6">
            #{name} doesn't exist or has no posts yet.
          </p>
          <Button onClick={() => router.push("/dashboard")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar session={session} router={router} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Hashtag Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <i className="fas fa-hashtag text-white text-2xl"></i>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                #{hashtag?.name || name}
              </h1>
              <p className="text-gray-500 dark:text-slate-400">
                {formatCount(hashtag?.usageCount || 0)} posts
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="reels">
              <i className="fas fa-video mr-1.5"></i>
              Reels
            </TabsTrigger>
            <TabsTrigger value="posts">
              <i className="fas fa-image mr-1.5"></i>
              Posts
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content Grid */}
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
              <i className="fas fa-photo-video text-2xl text-gray-400 dark:text-slate-500"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No content yet
            </h3>
            <p className="text-gray-500 dark:text-slate-400">
              Be the first to post with #{name}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="relative aspect-square bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() =>
                    router.push(post.isReel ? `/reels/${post.id}` : `/post/${post.id}`)
                  }
                >
                  {/* Thumbnail */}
                  {post.isReel ? (
                    post.thumbnailUrl ? (
                      <img
                        src={post.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={post.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                    )
                  ) : post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : post.imageUrls?.[0] ? (
                    <img
                      src={post.imageUrls[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800">
                      <i className="fas fa-align-left text-gray-400 dark:text-slate-500 text-xl"></i>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                    <div className="flex items-center gap-1">
                      <i className="fas fa-heart"></i>
                      <span className="font-medium">{formatCount(post.likesCount)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <i className="fas fa-comment"></i>
                      <span className="font-medium">{formatCount(post.commentsCount)}</span>
                    </div>
                  </div>

                  {/* Reel indicator */}
                  {post.isReel && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-white text-xs">
                      <i className="fas fa-play"></i>
                      {post.videoDuration && (
                        <span>{formatDuration(post.videoDuration)}</span>
                      )}
                    </div>
                  )}

                  {/* Multiple images indicator */}
                  {!post.isReel && post.imageUrls?.length > 1 && (
                    <div className="absolute top-2 right-2">
                      <i className="fas fa-clone text-white drop-shadow-lg"></i>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Load more */}
            {hasNextPage && (
              <div className="mt-6 text-center">
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
      </main>
    </div>
  );
}
