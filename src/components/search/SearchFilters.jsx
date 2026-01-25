// src/components/search/SearchFilters.jsx
"use client";

import React, { useState } from "react";

/**
 * SearchFilters component - sidebar with filter options
 * 
 * @param {Object} filters - Current filter values from useAdvancedSearch
 * @param {Function} updateFilter - Function to update a single filter
 * @param {Function} resetFilters - Function to reset all filters
 * @param {string} activeType - Current active type (all, users, posts, groups)
 */
export default function SearchFilters({
  filters,
  updateFilter,
  resetFilters,
  activeType = "all",
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Check if any filters are active (besides default values)
  const hasActiveFilters =
    filters.sort !== "relevance" ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.postType ||
    filters.hasMedia ||
    filters.groupPrivacy;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <i className="fas fa-sliders-h text-blue-500"></i>
          Filters
        </h3>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 lg:hidden"
          >
            <i className={`fas fa-chevron-${isExpanded ? "up" : "down"}`}></i>
          </button>
        </div>
      </div>

      {/* Filter Content */}
      <div className={`${isExpanded ? "block" : "hidden lg:block"}`}>
        {/* Sort By */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-slate-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Sort by
          </label>
          <select
            value={filters.sort}
            onChange={(e) => updateFilter("sort", e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="relevance">Most Relevant</option>
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>

        {/* Date Range - Only for posts */}
        {(activeType === "all" || activeType === "posts") && (
          <div className="px-4 py-4 border-b border-gray-100 dark:border-slate-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Date Range
            </label>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) =>
                    updateFilter("dateFrom", e.target.value || null)
                  }
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) =>
                    updateFilter("dateTo", e.target.value || null)
                  }
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Post Type - Only for posts */}
        {(activeType === "all" || activeType === "posts") && (
          <div className="px-4 py-4 border-b border-gray-100 dark:border-slate-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
              Post Type
            </label>
            <div className="space-y-2">
              {[
                { value: null, label: "All Types", icon: "fas fa-th" },
                { value: "POST", label: "Posts", icon: "fas fa-file-alt" },
                { value: "POLL", label: "Polls", icon: "fas fa-poll" },
                { value: "REEL", label: "Reels", icon: "fas fa-film" },
                { value: "NEWS", label: "News", icon: "fas fa-newspaper" },
              ].map((option) => (
                <label
                  key={option.value || "all"}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="postType"
                    checked={filters.postType === option.value}
                    onChange={() => updateFilter("postType", option.value)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
                  />
                  <i
                    className={`${option.icon} text-gray-400 dark:text-slate-500 group-hover:text-blue-500 w-4`}
                  ></i>
                  <span className="text-sm text-gray-700 dark:text-slate-300">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Has Media - Only for posts */}
        {(activeType === "all" || activeType === "posts") && (
          <div className="px-4 py-4 border-b border-gray-100 dark:border-slate-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasMedia}
                onChange={(e) => updateFilter("hasMedia", e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
              />
              <div className="flex items-center gap-2">
                <i className="fas fa-image text-gray-400 dark:text-slate-500"></i>
                <span className="text-sm text-gray-700 dark:text-slate-300">
                  Has media (photos/videos)
                </span>
              </div>
            </label>
          </div>
        )}

        {/* Group Privacy - Only for groups */}
        {(activeType === "all" || activeType === "groups") && (
          <div className="px-4 py-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
              Group Privacy
            </label>
            <div className="space-y-2">
              {[
                { value: null, label: "All Groups", icon: "fas fa-users" },
                { value: "PUBLIC", label: "Public", icon: "fas fa-globe" },
                { value: "PRIVATE", label: "Private", icon: "fas fa-lock" },
              ].map((option) => (
                <label
                  key={option.value || "all"}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="groupPrivacy"
                    checked={filters.groupPrivacy === option.value}
                    onChange={() => updateFilter("groupPrivacy", option.value)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
                  />
                  <i
                    className={`${option.icon} text-gray-400 dark:text-slate-500 group-hover:text-blue-500 w-4`}
                  ></i>
                  <span className="text-sm text-gray-700 dark:text-slate-300">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
