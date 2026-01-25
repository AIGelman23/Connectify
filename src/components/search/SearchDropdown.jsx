// src/components/search/SearchDropdown.jsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearch, useRecentSearches } from "@/hooks/useSearch";
import { highlightMatch } from "@/lib/searchUtils";

const TABS = [
  { id: "all", label: "All" },
  { id: "users", label: "People" },
  { id: "posts", label: "Posts" },
  { id: "groups", label: "Groups" },
];

export default function SearchDropdown({ onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } =
    useRecentSearches(5);

  const {
    results,
    isLoading,
    error,
    users,
    posts,
    groups,
    hasResults,
    clearResults,
  } = useSearch(query, {
    type: activeTab,
    limit: activeTab === "all" ? 3 : 5,
    debounceMs: 300,
    enabled: isOpen && query.length >= 2,
  });

  // Get all results in a flat array for keyboard navigation
  const getAllResults = useCallback(() => {
    if (activeTab === "all") {
      return [
        ...users.map((u) => ({ ...u, type: "user" })),
        ...posts.map((p) => ({ ...p, type: "post" })),
        ...groups.map((g) => ({ ...g, type: "group" })),
      ];
    }
    if (activeTab === "users") return users.map((u) => ({ ...u, type: "user" }));
    if (activeTab === "posts") return posts.map((p) => ({ ...p, type: "post" }));
    if (activeTab === "groups") return groups.map((g) => ({ ...g, type: "group" }));
    return [];
  }, [activeTab, users, posts, groups]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const allResults = getAllResults();

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < allResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && allResults[selectedIndex]) {
        handleResultClick(allResults[selectedIndex]);
      } else if (query.trim().length >= 2) {
        handleSearchSubmit();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Navigate to result
  const handleResultClick = (result) => {
    addRecentSearch(query);
    setIsOpen(false);
    setQuery("");

    if (result.type === "user") {
      router.push(`/profile/${result.id}`);
    } else if (result.type === "post") {
      router.push(`/dashboard?postId=${result.id}`);
    } else if (result.type === "group") {
      router.push(`/groups/${result.id}`);
    }
  };

  // Navigate to full search page
  const handleSearchSubmit = () => {
    if (query.trim().length >= 2) {
      addRecentSearch(query);
      router.push(`/search?q=${encodeURIComponent(query.trim())}&type=${activeTab}`);
      setIsOpen(false);
      setQuery("");
    }
  };

  // Handle recent search click
  const handleRecentSearchClick = (searchQuery) => {
    setQuery(searchQuery);
    setIsOpen(true);
  };

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results, activeTab]);

  const showRecentSearches = isOpen && !query && recentSearches.length > 0;
  const showResults = isOpen && query.length >= 2;
  const showNoResults = showResults && !isLoading && !hasResults && !error;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <i className="fas fa-search text-gray-400 dark:text-slate-500"></i>
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="block w-full pl-10 pr-4 py-2 rounded-full text-sm bg-gray-100 dark:bg-slate-700 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              clearResults();
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <i className="fas fa-times text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"></i>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50 overflow-hidden min-w-[320px] animate-fade-in-down">
          {/* Category Tabs */}
          {query.length >= 2 && (
            <div className="flex border-b border-gray-200 dark:border-slate-700">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                  {results && tab.id !== "all" && (
                    <span className="ml-1 text-xs">
                      ({results[tab.id === "users" ? "users" : tab.id]?.total || 0})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {showRecentSearches && (
            <div className="p-2">
              <div className="flex justify-between items-center px-2 mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                  Recent Searches
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear all
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-2 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer group"
                  onClick={() => handleRecentSearchClick(search.query)}
                >
                  <div className="flex items-center gap-2">
                    <i className="fas fa-clock text-gray-400 dark:text-slate-500"></i>
                    <span className="text-sm text-gray-700 dark:text-slate-200">
                      {search.query}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentSearch(search.query);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    <i className="fas fa-times text-xs"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 text-center text-red-500 dark:text-red-400">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          {/* No Results */}
          {showNoResults && (
            <div className="p-6 text-center">
              <i className="fas fa-search text-3xl text-gray-300 dark:text-slate-600 mb-2"></i>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No results found for "{query}"
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Try different keywords or check spelling
              </p>
            </div>
          )}

          {/* Search Results */}
          {showResults && !isLoading && hasResults && (
            <div className="max-h-[400px] overflow-y-auto">
              {/* Users Section */}
              {(activeTab === "all" || activeTab === "users") && users.length > 0 && (
                <ResultSection
                  title="People"
                  show={activeTab === "all"}
                >
                  {users.map((user, index) => (
                    <UserResultItem
                      key={user.id}
                      user={user}
                      query={query}
                      isSelected={
                        selectedIndex === index &&
                        (activeTab === "users" || activeTab === "all")
                      }
                      onClick={() => handleResultClick({ ...user, type: "user" })}
                    />
                  ))}
                </ResultSection>
              )}

              {/* Posts Section */}
              {(activeTab === "all" || activeTab === "posts") && posts.length > 0 && (
                <ResultSection
                  title="Posts"
                  show={activeTab === "all"}
                >
                  {posts.map((post, index) => (
                    <PostResultItem
                      key={post.id}
                      post={post}
                      query={query}
                      isSelected={
                        selectedIndex ===
                          (activeTab === "all" ? users.length + index : index) &&
                        (activeTab === "posts" || activeTab === "all")
                      }
                      onClick={() => handleResultClick({ ...post, type: "post" })}
                    />
                  ))}
                </ResultSection>
              )}

              {/* Groups Section */}
              {(activeTab === "all" || activeTab === "groups") && groups.length > 0 && (
                <ResultSection
                  title="Groups"
                  show={activeTab === "all"}
                >
                  {groups.map((group, index) => (
                    <GroupResultItem
                      key={group.id}
                      group={group}
                      query={query}
                      isSelected={
                        selectedIndex ===
                          (activeTab === "all"
                            ? users.length + posts.length + index
                            : index) &&
                        (activeTab === "groups" || activeTab === "all")
                      }
                      onClick={() => handleResultClick({ ...group, type: "group" })}
                    />
                  ))}
                </ResultSection>
              )}
            </div>
          )}

          {/* See All Results Footer */}
          {showResults && hasResults && (
            <div className="border-t border-gray-200 dark:border-slate-700 p-2">
              <button
                onClick={handleSearchSubmit}
                className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <i className="fas fa-search mr-2"></i>
                See all results for "{query}"
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

// Result Section Component
function ResultSection({ title, show, children }) {
  if (!show) return <>{children}</>;

  return (
    <div className="border-b border-gray-100 dark:border-slate-700 last:border-b-0">
      <div className="px-3 py-2 bg-gray-50 dark:bg-slate-700/50">
        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// User Result Item
function UserResultItem({ user, query, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20"
          : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
      }`}
    >
      <img
        src={user.imageUrl}
        alt={user.name}
        className="w-10 h-10 rounded-full object-cover"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = `https://placehold.co/40x40/3B82F6/ffffff?text=${
            user.name ? user.name[0].toUpperCase() : "U"
          }`;
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
          {highlightMatch(user.name, query)}
        </p>
        {user.headline && (
          <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
            {highlightMatch(user.headline, query)}
          </p>
        )}
        {user.mutualConnections > 0 && (
          <p className="text-xs text-gray-400 dark:text-slate-500">
            {user.mutualConnections} mutual connection
            {user.mutualConnections > 1 ? "s" : ""}
          </p>
        )}
      </div>
      {user.connectionStatus === "CONNECTED" && (
        <span className="text-xs text-green-600 dark:text-green-400">
          <i className="fas fa-user-check"></i>
        </span>
      )}
    </div>
  );
}

// Post Result Item
function PostResultItem({ post, query, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 cursor-pointer transition-colors ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20"
          : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <img
          src={post.author.imageUrl}
          alt={post.author.name}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://placehold.co/32x32/3B82F6/ffffff?text=${
              post.author.name ? post.author.name[0].toUpperCase() : "U"
            }`;
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            <span className="font-medium text-gray-700 dark:text-slate-300">
              {post.author.name}
            </span>
            <span className="mx-1">·</span>
            {formatTimeAgo(post.createdAt)}
          </p>
          <p className="text-sm text-gray-900 dark:text-slate-100 line-clamp-2">
            {highlightMatch(post.snippet || post.content, query)}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-slate-500">
            {post.likesCount > 0 && (
              <span>
                <i className="fas fa-thumbs-up mr-1"></i>
                {post.likesCount}
              </span>
            )}
            {post.commentsCount > 0 && (
              <span>
                <i className="fas fa-comment mr-1"></i>
                {post.commentsCount}
              </span>
            )}
            {post.imageUrl && <i className="fas fa-image"></i>}
            {post.videoUrl && <i className="fas fa-video"></i>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Group Result Item
function GroupResultItem({ group, query, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20"
          : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
      }`}
    >
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {group.coverImage ? (
          <img
            src={group.coverImage}
            alt={group.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <i className="fas fa-users text-white text-sm"></i>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
          {highlightMatch(group.name, query)}
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {group.memberCount.toLocaleString()} member
          {group.memberCount !== 1 ? "s" : ""} ·{" "}
          <span
            className={
              group.privacy === "Private"
                ? "text-yellow-600 dark:text-yellow-400"
                : ""
            }
          >
            {group.privacy}
          </span>
        </p>
      </div>
      {group.membershipStatus !== "NOT_MEMBER" && (
        <span className="text-xs text-green-600 dark:text-green-400">
          <i className="fas fa-check-circle"></i>
        </span>
      )}
    </div>
  );
}

// Helper function to format time ago
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d`;
  return date.toLocaleDateString();
}
