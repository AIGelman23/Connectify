// src/lib/searchUtils.js

import React from "react";

/**
 * Highlights matching text within a string
 * 
 * @param {string} text - The text to search within
 * @param {string} query - The search query to highlight
 * @param {string} highlightClass - CSS class for highlighted text
 * @returns {React.ReactNode} - Text with highlighted matches
 */
export function highlightMatch(text, query, highlightClass = "bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded") {
  if (!text || !query || query.length < 2) {
    return text;
  }

  try {
    // Escape special regex characters in query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <mark key={index} className={highlightClass}>
            {part}
          </mark>
        );
      }
      return part;
    });
  } catch {
    return text;
  }
}

/**
 * Creates a snippet of text around the first match
 * 
 * @param {string} text - The full text
 * @param {string} query - The search query
 * @param {number} contextLength - Characters to show before/after match
 * @returns {string} - Truncated text with ellipsis
 */
export function createSnippet(text, query, contextLength = 50) {
  if (!text) return "";
  if (!query || query.length < 2) {
    return text.length > contextLength * 2
      ? text.substring(0, contextLength * 2) + "..."
      : text;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return text.length > contextLength * 2
      ? text.substring(0, contextLength * 2) + "..."
      : text;
  }

  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(text.length, matchIndex + query.length + contextLength);

  let snippet = text.substring(start, end);

  if (start > 0) {
    snippet = "..." + snippet;
  }
  if (end < text.length) {
    snippet = snippet + "...";
  }

  return snippet;
}

/**
 * Formats a number for display (e.g., 1500 -> 1.5K)
 * 
 * @param {number} num - The number to format
 * @returns {string} - Formatted string
 */
export function formatNumber(num) {
  if (!num || num < 1000) return num?.toString() || "0";
  if (num < 1000000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
}

/**
 * Formats a date to relative time (e.g., "2h ago")
 * 
 * @param {string|Date} dateString - The date to format
 * @returns {string} - Relative time string
 */
export function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
  if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 604800)}w ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Debounce function for search input
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Suggested/popular search terms (can be fetched from API in future)
 */
export const POPULAR_SEARCHES = [
  "Technology",
  "Design",
  "Marketing",
  "Engineering",
  "Product",
  "Sales",
  "Finance",
  "Healthcare",
];

/**
 * Returns popular search suggestions based on partial input
 * 
 * @param {string} query - Partial search query
 * @param {number} limit - Max suggestions to return
 * @returns {string[]} - Array of suggestions
 */
export function getSuggestions(query, limit = 5) {
  if (!query || query.length < 1) return POPULAR_SEARCHES.slice(0, limit);

  const lowerQuery = query.toLowerCase();
  return POPULAR_SEARCHES.filter((s) =>
    s.toLowerCase().startsWith(lowerQuery)
  ).slice(0, limit);
}
