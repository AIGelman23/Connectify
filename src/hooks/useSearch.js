// src/hooks/useSearch.js
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for search functionality with debouncing
 * 
 * @param {string} query - The search query
 * @param {Object} options - Search options
 * @param {string} options.type - Type of search: 'all', 'users', 'posts', 'groups', 'hashtags'
 * @param {number} options.limit - Number of results to fetch
 * @param {number} options.debounceMs - Debounce delay in milliseconds
 * @param {boolean} options.enabled - Whether the search is enabled
 * 
 * @returns {Object} - Search results, loading state, and error
 */
export function useSearch(query, options = {}) {
  const {
    type = "all",
    limit = 5,
    debounceMs = 300,
    enabled = true,
  } = options;

  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const timeoutRef = useRef(null);

  const performSearch = useCallback(async (searchQuery) => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        q: searchQuery,
        type,
        limit: limit.toString(),
      });

      const response = await fetch(`/api/search?${params}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Search failed");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message);
        setResults(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [type, limit]);

  useEffect(() => {
    // Clear timeout on cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset if query is too short or disabled
    if (!enabled || !query || query.trim().length < 2) {
      setResults(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Set loading state immediately for UI feedback
    setIsLoading(true);

    // Debounce the search
    timeoutRef.current = setTimeout(() => {
      performSearch(query.trim());
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, enabled, debounceMs, performSearch]);

  // Function to clear results
  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    clearResults,
    // Convenience accessors
    users: results?.users?.results || [],
    posts: results?.posts?.results || [],
    groups: results?.groups?.results || [],
    hashtags: results?.hashtags?.results || [],
    totalResults: results?.totalResults || 0,
    hasUsers: (results?.users?.results?.length || 0) > 0,
    hasPosts: (results?.posts?.results?.length || 0) > 0,
    hasGroups: (results?.groups?.results?.length || 0) > 0,
    hasHashtags: (results?.hashtags?.results?.length || 0) > 0,
    hasResults: (results?.totalResults || 0) > 0,
  };
}

/**
 * Hook to manage recent searches in localStorage
 */
export function useRecentSearches(maxItems = 5) {
  const [recentSearches, setRecentSearches] = useState([]);
  const STORAGE_KEY = "connectify_recent_searches";

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load recent searches:", err);
    }
  }, []);

  // Add a search to recent
  const addRecentSearch = useCallback((query) => {
    if (!query || query.trim().length < 2) return;

    setRecentSearches((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter(
        (s) => s.query.toLowerCase() !== query.toLowerCase()
      );
      // Add to beginning
      const updated = [
        { query: query.trim(), timestamp: Date.now() },
        ...filtered,
      ].slice(0, maxItems);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save recent searches:", err);
      }

      return updated;
    });
  }, [maxItems]);

  // Remove a specific search
  const removeRecentSearch = useCallback((query) => {
    setRecentSearches((prev) => {
      const updated = prev.filter(
        (s) => s.query.toLowerCase() !== query.toLowerCase()
      );

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to update recent searches:", err);
      }

      return updated;
    });
  }, []);

  // Clear all recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear recent searches:", err);
    }
  }, []);

  return {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  };
}

export default useSearch;
