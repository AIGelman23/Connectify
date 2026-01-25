// src/components/search/PostSearchResult.jsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { highlightMatch, formatRelativeTime } from "@/lib/searchUtils";

export default function PostSearchResult({ post, query, onLike, onSave }) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(!!post.currentUserReaction);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);

  const handlePostClick = () => {
    router.push(`/dashboard?postId=${post.id}`);
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const action = isLiked ? "unreact" : "react";
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, action }),
      });

      if (res.ok) {
        setIsLiked(!isLiked);
        setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
        onLike?.(post.id, !isLiked);
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    try {
      const action = isSaved ? "unsave" : "save";
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, action }),
      });

      if (res.ok) {
        setIsSaved(!isSaved);
        onSave?.(post.id, !isSaved);
      }
    } catch (error) {
      console.error("Error saving post:", error);
    }
  };

  const handleAuthorClick = (e) => {
    e.stopPropagation();
    router.push(`/profile/${post.author.id}`);
  };

  // Determine media preview
  const hasImage = post.imageUrl || (post.imageUrls && post.imageUrls.length > 0);
  const hasVideo = post.videoUrl;
  const previewImage = post.thumbnailUrl || post.imageUrl || post.imageUrls?.[0];

  return (
    <div
      onClick={handlePostClick}
      className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="p-4">
        {/* Author Info */}
        <div className="flex items-center gap-3 mb-3">
          <img
            src={post.author.imageUrl}
            alt={post.author.name}
            onClick={handleAuthorClick}
            className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://placehold.co/40x40/3B82F6/ffffff?text=${
                post.author.name ? post.author.name[0].toUpperCase() : "U"
              }`;
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                onClick={handleAuthorClick}
                className="font-semibold text-gray-900 dark:text-slate-100 hover:underline cursor-pointer"
              >
                {post.author.name}
              </span>
              {post.group && (
                <>
                  <span className="text-gray-400">in</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {post.group.name}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
              {post.author.headline && (
                <span className="truncate max-w-[200px]">
                  {post.author.headline}
                </span>
              )}
              <span>·</span>
              <span>{formatRelativeTime(post.createdAt)}</span>
              {post.visibility !== "PUBLIC" && (
                <>
                  <span>·</span>
                  <span className="flex items-center">
                    <i
                      className={`fas ${
                        post.visibility === "FRIENDS"
                          ? "fa-user-friends"
                          : post.visibility === "PRIVATE"
                          ? "fa-lock"
                          : "fa-users"
                      } text-xs mr-1`}
                    ></i>
                    {post.visibility === "FRIENDS"
                      ? "Friends"
                      : post.visibility === "PRIVATE"
                      ? "Private"
                      : "Specific friends"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Post Content */}
        {post.title && (
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">
            {highlightMatch(post.title, query)}
          </h3>
        )}
        {post.content && (
          <p className="text-gray-800 dark:text-slate-200 whitespace-pre-wrap line-clamp-4">
            {highlightMatch(post.snippet || post.content, query)}
          </p>
        )}

        {/* Tagged Friends */}
        {post.taggedFriends && post.taggedFriends.length > 0 && (
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            <i className="fas fa-tag mr-1"></i>
            with{" "}
            {post.taggedFriends.map((friend, i) => (
              <span key={friend.id}>
                <span className="text-blue-600 dark:text-blue-400">
                  {friend.name}
                </span>
                {i < post.taggedFriends.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        )}

        {/* Poll Preview */}
        {post.isPoll && post.pollOptions && (
          <div className="mt-3 space-y-2">
            {post.pollOptions.slice(0, 3).map((option) => (
              <div
                key={option.id}
                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded"
              >
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-slate-500"></div>
                <span className="text-sm text-gray-700 dark:text-slate-300">
                  {option.text}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {option.votes} votes
                </span>
              </div>
            ))}
            {post.pollOptions.length > 3 && (
              <p className="text-sm text-gray-400">
                +{post.pollOptions.length - 3} more options
              </p>
            )}
          </div>
        )}
      </div>

      {/* Media Preview */}
      {(hasImage || hasVideo) && previewImage && (
        <div className="relative">
          <img
            src={previewImage}
            alt="Post media"
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          {hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <i className="fas fa-play text-gray-800 ml-1"></i>
              </div>
            </div>
          )}
          {post.isReel && (
            <span className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
              <i className="fas fa-film mr-1"></i>
              Reel
            </span>
          )}
        </div>
      )}

      {/* Engagement Stats & Actions */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <i className="fas fa-thumbs-up text-blue-500"></i>
              {likesCount}
            </span>
            <span>{post.commentsCount} comments</span>
            {post.sharesCount > 0 && <span>{post.sharesCount} shares</span>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className={`p-2 rounded-full transition-colors ${
                isLiked
                  ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
              title={isLiked ? "Unlike" : "Like"}
            >
              <i className={`fas fa-thumbs-up`}></i>
            </button>
            <button
              onClick={handleSave}
              className={`p-2 rounded-full transition-colors ${
                isSaved
                  ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
              title={isSaved ? "Unsave" : "Save"}
            >
              <i className={`fas fa-bookmark`}></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
