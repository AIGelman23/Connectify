// src/app/search/page.jsx
"use client";

import React, { useEffect, useCallback, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import ConnectifyLogo from "@/components/ConnectifyLogo";
import { useAdvancedSearch } from "@/hooks/useAdvancedSearch";
import UserSearchResult from "@/components/search/UserSearchResult";
import PostSearchResult from "@/components/search/PostSearchResult";
import GroupSearchResult from "@/components/search/GroupSearchResult";
import HashtagSearchResult from "@/components/search/HashtagSearchResult";
import SearchFilters from "@/components/search/SearchFilters";
import EmptySearchState from "@/components/search/EmptySearchState";

// Category tabs configuration
const CATEGORIES = [
  { key: "all", label: "All", icon: "fas fa-th" },
  { key: "users", label: "People", icon: "fas fa-user" },
  { key: "posts", label: "Posts", icon: "fas fa-file-alt" },
  { key: "groups", label: "Groups", icon: "fas fa-users" },
  { key: "hashtags", label: "Hashtags", icon: "fas fa-hashtag" },
];

function SearchPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const loadMoreRef = useRef(null);

  // Get query parameters
  const query = searchParams.get("q") || "";
  const typeParam = searchParams.get("type") || "all";
  const sortParam = searchParams.get("sort") || "relevance";

  // Initialize search with URL params
  const {
    results,
    currentResults,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    filters,
    updateFilter,
    resetFilters,
    usersTotal,
    postsTotal,
    groupsTotal,
    hashtagsTotal,
    totalResults,
  } = useAdvancedSearch(query, {
    type: typeParam,
    sort: sortParam,
  });

  // Update URL when filters change
  const updateURL = useCallback(
    (newFilters) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (newFilters.type && newFilters.type !== "all")
        params.set("type", newFilters.type);
      if (newFilters.sort && newFilters.sort !== "relevance")
        params.set("sort", newFilters.sort);

      const newURL = `/search${params.toString() ? `?${params.toString()}` : ""}`;
      router.replace(newURL, { scroll: false });
    },
    [query, router]
  );

  // Handle category change
  const handleCategoryChange = (category) => {
    updateFilter("type", category);
    updateURL({ ...filters, type: category });
  };

  // Handle filter updates with URL sync
  const handleFilterUpdate = (key, value) => {
    updateFilter(key, value);
    if (key === "sort" || key === "type") {
      updateURL({ ...filters, [key]: value });
    }
  };

  // Handle reset with URL sync
  const handleReset = () => {
    resetFilters();
    router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
  };

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Handle connect action
  const handleConnect = useCallback((userId) => {
    // Refresh results after connection
    console.log("Connected to user:", userId);
  }, []);

  // Handle group join action
  const handleJoinGroup = useCallback((groupId) => {
    console.log("Joined group:", groupId);
  }, []);

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <ConnectifyLogo width={350} height={350} className="animate-pulse" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  // Get count for each category
  const getCategoryCount = (category) => {
    switch (category) {
      case "users":
        return usersTotal;
      case "posts":
        return postsTotal;
      case "groups":
        return groupsTotal;
      case "hashtags":
        return hashtagsTotal;
      case "all":
      default:
        return totalResults;
    }
  };

  // Render individual result based on type
  const renderResult = (item) => {
    switch (item.resultType) {
      case "user":
        return (
          <UserSearchResult
            key={`user-${item.id}`}
            user={item}
            query={query}
            onConnect={handleConnect}
          />
        );
      case "post":
        return (
          <PostSearchResult key={`post-${item.id}`} post={item} query={query} />
        );
      case "group":
        return (
          <GroupSearchResult
            key={`group-${item.id}`}
            group={item}
            query={query}
            onJoin={handleJoinGroup}
          />
        );
      case "hashtag":
        return (
          <HashtagSearchResult
            key={`hashtag-${item.id}`}
            hashtag={item}
            query={query}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <NavBar session={session} router={router} />
      <div className="min-h-screen bg-gray-100 dark:bg-slate-900 px-2 sm:px-6 lg:px-12 pt-4 pb-safe">
        <div className="max-w-6xl mx-auto">
          {/* Search Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              {query ? (
                <>
                  Search results for "
                  <span className="text-blue-600 dark:text-blue-400">
                    {query}
                  </span>
                  "
                </>
              ) : (
                "Search"
              )}
            </h1>
            {query && !isLoading && (
              <p className="text-gray-600 dark:text-slate-400">
                {totalResults} result{totalResults !== 1 ? "s" : ""} found
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          {/* Main Layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Sidebar - Filters */}
            <aside className="w-full lg:w-64 flex-shrink-0 order-2 lg:order-1">
              <SearchFilters
                filters={filters}
                updateFilter={handleFilterUpdate}
                resetFilters={handleReset}
                activeType={filters.type}
              />
            </aside>

            {/* Main Content */}
            <main className="flex-1 order-1 lg:order-2">
              {/* Category Tabs */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700 mb-6 overflow-x-auto">
                <div className="flex">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.key}
                      onClick={() => handleCategoryChange(category.key)}
                      className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
                        ${
                          filters.type === category.key
                            ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                            : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                        }`}
                    >
                      <i className={category.icon}></i>
                      <span>{category.label}</span>
                      {query && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            filters.type === category.key
                              ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300"
                              : "bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-slate-400"
                          }`}
                        >
                          {getCategoryCount(category.key)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results */}
              {isLoading && !isLoadingMore ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 animate-pulse"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                        <div className="flex-1 space-y-3">
                          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
                          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
                          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : currentResults.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {currentResults.map(renderResult)}
                  </div>

                  {/* Load More Trigger */}
                  {hasMore && (
                    <div
                      ref={loadMoreRef}
                      className="py-8 flex justify-center"
                    >
                      {isLoadingMore ? (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          <span>Loading more results...</span>
                        </div>
                      ) : (
                        <button
                          onClick={loadMore}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Load More
                        </button>
                      )}
                    </div>
                  )}

                  {/* End of Results */}
                  {!hasMore && currentResults.length > 0 && (
                    <div className="py-8 text-center text-gray-500 dark:text-slate-400 text-sm">
                      <i className="fas fa-check-circle mr-2 text-green-500"></i>
                      You've seen all results
                    </div>
                  )}
                </>
              ) : (
                !isLoading && (
                  <EmptySearchState
                    query={query}
                    type={filters.type}
                    onSearchChange={(term) => router.push(`/search?q=${encodeURIComponent(term)}`)}
                  />
                )
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

// Wrap with Suspense for useSearchParams
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <ConnectifyLogo width={350} height={350} className="animate-pulse" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
