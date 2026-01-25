// src/components/search/HashtagSearchResult.jsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { highlightMatch, formatNumber } from "@/lib/searchUtils";

export default function HashtagSearchResult({ hashtag, query }) {
  const router = useRouter();

  const handleHashtagClick = () => {
    router.push(`/hashtag/${hashtag.name}`);
  };

  const postCount = hashtag.usageCount || hashtag.postCount || 0;
  const displayName = hashtag.displayName || hashtag.name;

  return (
    <div
      onClick={handleHashtagClick}
      className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Hashtag Icon */}
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <i className="fas fa-hashtag text-white text-2xl"></i>
          </div>

          {/* Hashtag Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {highlightMatch(`#${displayName}`, query)}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              {formatNumber(postCount)} post{postCount !== 1 ? "s" : ""}
            </p>

            {/* Preview Images */}
            {hashtag.previewImages && hashtag.previewImages.length > 0 && (
              <div className="mt-3 flex gap-2">
                {hashtag.previewImages.slice(0, 4).map((img, index) => (
                  <div
                    key={index}
                    className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700"
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                ))}
                {postCount > 4 && (
                  <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
                      +{formatNumber(postCount - 4)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Arrow indicator */}
          <div className="flex-shrink-0 self-center">
            <i className="fas fa-chevron-right text-gray-400 dark:text-slate-500"></i>
          </div>
        </div>

        {/* Trending indicator (if hashtag is popular) */}
        {postCount >= 100 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800 dark:from-pink-900/30 dark:to-purple-900/30 dark:text-pink-300">
              <i className="fas fa-fire-alt mr-1.5 text-orange-500"></i>
              Trending
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
