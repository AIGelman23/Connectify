"use client";

import { useState, useRef, useEffect, useMemo } from "react";

export default function ChatSearch({
  messages = [],
  onResultClick,
  onClose,
  isOpen,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // Filter messages based on search term
  const results = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase();
    return messages
      .filter(
        (msg) =>
          msg.content?.toLowerCase().includes(term) ||
          msg.sender?.name?.toLowerCase().includes(term)
      )
      .reverse(); // Most recent first
  }, [messages, searchTerm]);

  // Navigate through results
  const goToResult = (index) => {
    if (results.length === 0) return;
    const newIndex = Math.max(0, Math.min(index, results.length - 1));
    setCurrentIndex(newIndex);
    onResultClick?.(results[newIndex]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        goToResult(currentIndex + 1);
      } else {
        goToResult(currentIndex);
      }
    } else if (e.key === "Escape") {
      onClose?.();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      goToResult(currentIndex - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      goToResult(currentIndex + 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-lg z-20 animate-slide-down">
      <div className="flex items-center gap-2 p-2">
        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search messages..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Results Counter */}
        {searchTerm && (
          <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
            {results.length > 0
              ? `${currentIndex + 1} of ${results.length}`
              : "No results"}
          </span>
        )}

        {/* Navigation Buttons */}
        {results.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToResult(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous (Arrow Up)"
            >
              <svg
                className="w-4 h-4 text-gray-600 dark:text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
            <button
              onClick={() => goToResult(currentIndex + 1)}
              disabled={currentIndex >= results.length - 1}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next (Arrow Down)"
            >
              <svg
                className="w-4 h-4 text-gray-600 dark:text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          title="Close (Esc)"
        >
          <svg
            className="w-4 h-4 text-gray-600 dark:text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Results Preview */}
      {searchTerm && results.length > 0 && (
        <div className="max-h-48 overflow-y-auto border-t border-gray-100 dark:border-slate-700">
          {results.slice(0, 5).map((msg, idx) => (
            <button
              key={msg.id}
              onClick={() => {
                setCurrentIndex(idx);
                onResultClick?.(msg);
              }}
              className={`w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                idx === currentIndex ? "bg-blue-50 dark:bg-blue-900/20" : ""
              }`}
            >
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {msg.sender?.name} -{" "}
                {new Date(msg.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-900 dark:text-slate-100 truncate">
                {highlightMatch(msg.content, searchTerm)}
              </p>
            </button>
          ))}
          {results.length > 5 && (
            <p className="px-4 py-2 text-xs text-gray-500 dark:text-slate-400 text-center">
              + {results.length - 5} more results
            </p>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

// Helper to highlight matching text
function highlightMatch(text, term) {
  if (!text || !term) return text;

  const regex = new RegExp(`(${term})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
