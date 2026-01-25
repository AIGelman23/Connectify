// src/hooks/useAdvancedSearch.js
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for advanced search with filters and pagination
 * 
 * @param {string} query - The search query
 * @param {Object} initialFilters - Initial filter values
 * 
 * @returns {Object} - Search results, loading state, error, and filter management
 */
export function useAdvancedSearch(query, initialFilters = {}) {
  const [filters, setFilters] = useState({
    type: "all",
    sort: "relevance",
    dateFrom: null,
    dateTo: null,
    postType: null,
    hasMedia: false,
    groupPrivacy: null,
    ...initialFilters,
  });

  const [results, setResults] = useState({
    users: { results: [], total: 0, hasMore: false },
    posts: { results: [], total: 0, hasMore: false },
    groups: { results: [], total: 0, hasMore: false },
    hashtags: { results: [], total: 0, hasMore: false },
    totalResults: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const LIMIT = 10;

  const abortControllerRef = useRef(null);

  // Build query params from filters
  const buildQueryParams = useCallback(
    (currentOffset = 0) => {
      const params = new URLSearchParams({
        q: query,
        type: filters.type,
        limit: LIMIT.toString(),
        offset: currentOffset.toString(),
        sort: filters.sort,
      });

      if (filters.dateFrom) {
        params.append("dateFrom", filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append("dateTo", filters.dateTo);
      }
      if (filters.postType) {
        params.append("postType", filters.postType);
      }
      if (filters.hasMedia) {
        params.append("hasMedia", "true");
      }
      if (filters.groupPrivacy) {
        params.append("groupPrivacy", filters.groupPrivacy);
      }

      return params;
    },
    [query, filters]
  );

  // Perform search
  const performSearch = useCallback(
    async (isLoadMore = false) => {
      if (!query || query.trim().length < 2) {
        setResults({
          users: { results: [], total: 0, hasMore: false },
          posts: { results: [], total: 0, hasMore: false },
          groups: { results: [], total: 0, hasMore: false },
          hashtags: { results: [], total: 0, hasMore: false },
          totalResults: 0,
        });
        return;
      }

      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        if (isLoadMore) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          setError(null);
        }

        const currentOffset = isLoadMore ? offset : 0;
        const params = buildQueryParams(currentOffset);

        const response = await fetch(`/api/search?${params}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Search failed");
        }

        const data = await response.json();

        if (isLoadMore) {
          // Append results
          setResults((prev) => ({
            users: {
              results: [...prev.users.results, ...data.users.results],
              total: data.users.total,
              hasMore: data.users.hasMore,
            },
            posts: {
              results: [...prev.posts.results, ...data.posts.results],
              total: data.posts.total,
              hasMore: data.posts.hasMore,
            },
            groups: {
              results: [...prev.groups.results, ...data.groups.results],
              total: data.groups.total,
              hasMore: data.groups.hasMore,
            },
            hashtags: {
              results: [...prev.hashtags.results, ...(data.hashtags?.results || [])],
              total: data.hashtags?.total || 0,
              hasMore: data.hashtags?.hasMore || false,
            },
            totalResults: data.totalResults,
          }));
          setOffset(currentOffset + LIMIT);
        } else {
          // Ensure hashtags exists in data
          const normalizedData = {
            ...data,
            hashtags: data.hashtags || { results: [], total: 0, hasMore: false },
          };
          setResults(normalizedData);
          setOffset(LIMIT);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [query, buildQueryParams, offset]
  );

  // Initial search and on filter change
  useEffect(() => {
    setOffset(0);
    performSearch(false);
  }, [query, filters.type, filters.sort, filters.dateFrom, filters.dateTo, filters.postType, filters.hasMedia, filters.groupPrivacy]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load more function
  const loadMore = useCallback(() => {
    const currentCategory =
      filters.type === "all" ? null : filters.type;
    
    // Check if there are more results to load
    let hasMore = false;
    if (currentCategory === "users" || filters.type === "all") {
      hasMore = hasMore || results.users.hasMore;
    }
    if (currentCategory === "posts" || filters.type === "all") {
      hasMore = hasMore || results.posts.hasMore;
    }
    if (currentCategory === "groups" || filters.type === "all") {
      hasMore = hasMore || results.groups.hasMore;
    }
    if (currentCategory === "hashtags" || filters.type === "all") {
      hasMore = hasMore || results.hashtags.hasMore;
    }

    if (hasMore && !isLoadingMore) {
      performSearch(true);
    }
  }, [filters.type, results, isLoadingMore, performSearch]);

  // Update a single filter
  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({
      type: "all",
      sort: "relevance",
      dateFrom: null,
      dateTo: null,
      postType: null,
      hasMedia: false,
      groupPrivacy: null,
    });
  }, []);

  // Check if there are more results
  const hasMore =
    results.users.hasMore || results.posts.hasMore || results.groups.hasMore || results.hashtags.hasMore;

  // Get current results based on active filter
  const getCurrentResults = useCallback(() => {
    if (filters.type === "all") {
      return [
        ...results.users.results.map((u) => ({ ...u, resultType: "user" })),
        ...results.posts.results.map((p) => ({ ...p, resultType: "post" })),
        ...results.groups.results.map((g) => ({ ...g, resultType: "group" })),
        ...results.hashtags.results.map((h) => ({ ...h, resultType: "hashtag" })),
      ];
    }
    if (filters.type === "users") {
      return results.users.results.map((u) => ({ ...u, resultType: "user" }));
    }
    if (filters.type === "posts") {
      return results.posts.results.map((p) => ({ ...p, resultType: "post" }));
    }
    if (filters.type === "groups") {
      return results.groups.results.map((g) => ({ ...g, resultType: "group" }));
    }
    if (filters.type === "hashtags") {
      return results.hashtags.results.map((h) => ({ ...h, resultType: "hashtag" }));
    }
    return [];
  }, [filters.type, results]);

  return {
    results,
    currentResults: getCurrentResults(),
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    // Convenience accessors
    users: results.users.results,
    posts: results.posts.results,
    groups: results.groups.results,
    hashtags: results.hashtags.results,
    totalResults: results.totalResults,
    usersTotal: results.users.total,
    postsTotal: results.posts.total,
    groupsTotal: results.groups.total,
    hashtagsTotal: results.hashtags.total,
  };
}

export default useAdvancedSearch;
