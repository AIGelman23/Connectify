// src/components/search/EmptySearchState.jsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { POPULAR_SEARCHES } from "@/lib/searchUtils";

/**
 * Empty state component shown when no search results are found
 * 
 * @param {string} query - The search query that returned no results
 * @param {string} type - The active filter type (all, users, posts, groups)
 * @param {Function} onSearchChange - Callback to update search query
 */
export default function EmptySearchState({ query, type = "all", onSearchChange }) {
  const router = useRouter();

  const handlePopularSearch = (term) => {
    if (onSearchChange) {
      onSearchChange(term);
    } else {
      router.push(`/search?q=${encodeURIComponent(term)}`);
    }
  };

  const handleBrowse = (path) => {
    router.push(path);
  };

  // Tips based on the search type
  const getTips = () => {
    switch (type) {
      case "users":
        return [
          "Try searching by name, job title, or company",
          "Use fewer keywords for broader results",
          "Check the spelling of names",
        ];
      case "posts":
        return [
          "Try different keywords or phrases",
          "Search for topics instead of specific words",
          "Remove date filters to see more results",
        ];
      case "groups":
        return [
          "Try searching by group topic or interest",
          "Use broader terms like 'technology' or 'marketing'",
          "Browse public groups to discover communities",
        ];
      default:
        return [
          "Try different keywords or phrases",
          "Use fewer or more general keywords",
          "Check for spelling mistakes",
        ];
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700 p-8 text-center">
      {/* Icon */}
      <div className="mx-auto w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-6">
        <i className="fas fa-search text-3xl text-gray-400 dark:text-slate-500"></i>
      </div>

      {/* Message */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
        No results found
      </h3>
      <p className="text-gray-600 dark:text-slate-400 mb-6">
        {query ? (
          <>
            We couldn't find any {type !== "all" ? type : "results"} matching "
            <span className="font-medium text-gray-900 dark:text-slate-200">
              {query}
            </span>
            "
          </>
        ) : (
          "Enter a search term to find people, posts, and groups"
        )}
      </p>

      {/* Search Tips */}
      {query && (
        <div className="mb-8">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            Search Tips
          </h4>
          <ul className="text-sm text-gray-500 dark:text-slate-400 space-y-2">
            {getTips().map((tip, index) => (
              <li key={index} className="flex items-center justify-center gap-2">
                <i className="fas fa-lightbulb text-yellow-500 text-xs"></i>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Popular Searches */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
          Popular Searches
        </h4>
        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR_SEARCHES.map((term) => (
            <button
              key={term}
              onClick={() => handlePopularSearch(term)}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-full text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Browse Links */}
      <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">
          Or browse
        </h4>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => handleBrowse("/network")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <i className="fas fa-user-friends"></i>
            My Network
          </button>
          <button
            onClick={() => handleBrowse("/groups")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <i className="fas fa-users"></i>
            Groups
          </button>
          <button
            onClick={() => handleBrowse("/dashboard")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <i className="fas fa-home"></i>
            Feed
          </button>
        </div>
      </div>
    </div>
  );
}
