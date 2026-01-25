"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/NavBar";
import { Spinner, SearchInput, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import ConnectifyLogo from "@/components/ConnectifyLogo";

export default function ExplorePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("trending");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Fetch trending hashtags
  const { data: trendingHashtags, isLoading: loadingHashtags } = useQuery({
    queryKey: ["trendingHashtags"],
    queryFn: async () => {
      const res = await fetch("/api/hashtags?type=trending&limit=20");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: status === "authenticated",
  });

  // Fetch trending reels
  const { data: trendingReels, isLoading: loadingReels } = useQuery({
    queryKey: ["trendingReels"],
    queryFn: async () => {
      const res = await fetch("/api/reels?feed=foryou&take=12");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: status === "authenticated",
  });

  // Search hashtags
  const { data: searchResults, isLoading: loadingSearch } = useQuery({
    queryKey: ["searchHashtags", searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/hashtags?type=search&q=${encodeURIComponent(searchQuery)}&limit=10`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: status === "authenticated" && searchQuery.length > 0,
  });

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

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <ConnectifyLogo width={350} height={350} className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar session={session} router={router} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <SearchInput
            placeholder="Search hashtags, sounds, users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Search Results */}
        {searchQuery.length > 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Search Results for "{searchQuery}"
              </h2>
            </div>
            {loadingSearch ? (
              <div className="p-8 text-center">
                <Spinner size="lg" />
              </div>
            ) : searchResults?.hashtags?.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {searchResults.hashtags.map((hashtag) => (
                  <button
                    key={hashtag.id}
                    onClick={() => router.push(`/hashtag/${hashtag.name}`)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-hashtag text-white"></i>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        #{hashtag.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {formatCount(hashtag.usageCount)} posts
                      </p>
                    </div>
                    <i className="fas fa-chevron-right text-gray-400"></i>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                No results found
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="trending">
                  <i className="fas fa-fire mr-1.5 text-orange-500"></i>
                  Trending
                </TabsTrigger>
                <TabsTrigger value="reels">
                  <i className="fas fa-video mr-1.5"></i>
                  Reels
                </TabsTrigger>
                <TabsTrigger value="hashtags">
                  <i className="fas fa-hashtag mr-1.5"></i>
                  Hashtags
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Trending Tab */}
            {activeTab === "trending" && (
              <div className="space-y-6">
                {/* Trending Hashtags Section */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <i className="fas fa-fire text-orange-500"></i>
                      Trending Hashtags
                    </h2>
                    <button
                      onClick={() => setActiveTab("hashtags")}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      See all
                    </button>
                  </div>
                  {loadingHashtags ? (
                    <div className="p-8 text-center">
                      <Spinner size="lg" />
                    </div>
                  ) : trendingHashtags?.hashtags?.length > 0 ? (
                    <div className="p-4 flex flex-wrap gap-2">
                      {trendingHashtags.hashtags.slice(0, 10).map((hashtag, index) => (
                        <button
                          key={hashtag.id}
                          onClick={() => router.push(`/hashtag/${hashtag.name}`)}
                          className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full transition-colors flex items-center gap-2"
                        >
                          <span className="text-sm font-medium text-orange-500">
                            #{index + 1}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            #{hashtag.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {formatCount(hashtag.usageCount)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-hashtag text-2xl text-gray-400 dark:text-slate-500"></i>
                      </div>
                      <p className="text-gray-500 dark:text-slate-400 font-medium">No trending hashtags yet</p>
                      <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Be the first to start a trend!</p>
                    </div>
                  )}
                </div>

                {/* Trending Reels Section */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <i className="fas fa-play-circle text-pink-500"></i>
                      Popular Reels
                    </h2>
                    <button
                      onClick={() => router.push("/reels")}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Watch all
                    </button>
                  </div>
                  {loadingReels ? (
                    <div className="p-8 text-center">
                      <Spinner size="lg" />
                    </div>
                  ) : trendingReels?.reels?.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1 p-1">
                      {trendingReels.reels.slice(0, 9).map((reel) => (
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
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-video text-2xl text-gray-400 dark:text-slate-500"></i>
                      </div>
                      <p className="text-gray-500 dark:text-slate-400 font-medium">No reels yet</p>
                      <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Be the first to create a reel!</p>
                      <button
                        onClick={() => router.push("/reels/create")}
                        className="mt-4 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Create Reel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reels Tab */}
            {activeTab === "reels" && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                {loadingReels ? (
                  <div className="p-8 text-center">
                    <Spinner size="lg" />
                  </div>
                ) : trendingReels?.reels?.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1 p-1">
                    {trendingReels.reels.map((reel) => (
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
                          <div className="flex items-center justify-between text-white text-xs">
                            <div className="flex items-center gap-1">
                              <i className="fas fa-play"></i>
                              <span>{formatCount(reel.viewsCount)}</span>
                            </div>
                            {reel.videoDuration && (
                              <span>{formatDuration(reel.videoDuration)}</span>
                            )}
                          </div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                          <i className="fas fa-play text-white text-2xl"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-orange-100 dark:from-pink-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-film text-3xl text-pink-500"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Reels Yet</h3>
                    <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                      Be a trendsetter! Create the first reel and start sharing your moments with the world.
                    </p>
                    <button
                      onClick={() => router.push("/reels/create")}
                      className="px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Create Your First Reel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Hashtags Tab */}
            {activeTab === "hashtags" && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                {loadingHashtags ? (
                  <div className="p-8 text-center">
                    <Spinner size="lg" />
                  </div>
                ) : trendingHashtags?.hashtags?.length > 0 ? (
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {trendingHashtags.hashtags.map((hashtag, index) => (
                      <button
                        key={hashtag.id}
                        onClick={() => router.push(`/hashtag/${hashtag.name}`)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            #{hashtag.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {formatCount(hashtag.usageCount)} posts
                          </p>
                        </div>
                        {index < 3 && (
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full">
                            <i className="fas fa-fire mr-1"></i>
                            Hot
                          </span>
                        )}
                        <i className="fas fa-chevron-right text-gray-400"></i>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-hashtag text-3xl text-blue-500"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Hashtags Yet</h3>
                    <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                      Start a trend! Use hashtags in your posts to help others discover your content.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
