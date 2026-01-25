// src/components/search/GroupSearchResult.jsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { highlightMatch, formatNumber } from "@/lib/searchUtils";

export default function GroupSearchResult({ group, query, onJoin }) {
  const router = useRouter();
  const [membershipStatus, setMembershipStatus] = useState(group.membershipStatus);
  const [isJoining, setIsJoining] = useState(false);

  const handleGroupClick = () => {
    router.push(`/groups/${group.id}`);
  };

  const handleJoin = async (e) => {
    e.stopPropagation();
    if (isJoining) return;

    try {
      setIsJoining(true);

      if (group.privacy === "Public") {
        // Direct join for public groups
        const res = await fetch(`/api/groups/${group.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          setMembershipStatus("MEMBER");
          onJoin?.(group.id, "MEMBER");
        }
      } else {
        // Request to join for private groups
        const res = await fetch(`/api/groups/${group.id}/join-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          setMembershipStatus("PENDING");
          onJoin?.(group.id, "PENDING");
        }
      }
    } catch (error) {
      console.error("Error joining group:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async (e) => {
    e.stopPropagation();
    if (isJoining) return;

    try {
      setIsJoining(true);
      const res = await fetch(`/api/groups/${group.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setMembershipStatus("NOT_MEMBER");
        onJoin?.(group.id, "NOT_MEMBER");
      }
    } catch (error) {
      console.error("Error leaving group:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const isMember = ["ADMIN", "MODERATOR", "MEMBER"].includes(membershipStatus);
  const isPending = membershipStatus === "PENDING";

  return (
    <div
      onClick={handleGroupClick}
      className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Cover Image */}
      <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600 relative">
        {group.coverImage && (
          <img
            src={group.coverImage}
            alt={group.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}
        {/* Privacy Badge */}
        <span
          className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
            group.privacy === "Private"
              ? "bg-yellow-500/90 text-white"
              : "bg-white/90 text-gray-800"
          }`}
        >
          <i
            className={`fas ${
              group.privacy === "Private" ? "fa-lock" : "fa-globe"
            } mr-1`}
          ></i>
          {group.privacy}
        </span>
      </div>

      <div className="p-4">
        {/* Group Info */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">
              {highlightMatch(group.name, query)}
            </h3>
            {group.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-300 line-clamp-2">
                {highlightMatch(group.descriptionSnippet || group.description, query)}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <i className="fas fa-users"></i>
            {formatNumber(group.memberCount)} member
            {group.memberCount !== 1 ? "s" : ""}
          </span>
          {group.postCount > 0 && (
            <span className="flex items-center gap-1">
              <i className="fas fa-file-alt"></i>
              {formatNumber(group.postCount)} post
              {group.postCount !== 1 ? "s" : ""}
            </span>
          )}
          {group.discussionCount > 0 && (
            <span className="flex items-center gap-1">
              <i className="fas fa-comments"></i>
              {formatNumber(group.discussionCount)} discussion
              {group.discussionCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-4">
          {group.isCreator ? (
            <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
              <i className="fas fa-crown mr-2"></i>
              You created this group
            </span>
          ) : isMember ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <i className="fas fa-check-circle mr-2"></i>
                {membershipStatus === "ADMIN"
                  ? "Admin"
                  : membershipStatus === "MODERATOR"
                  ? "Moderator"
                  : "Member"}
              </span>
              {membershipStatus === "MEMBER" && (
                <button
                  onClick={handleLeave}
                  disabled={isJoining}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                >
                  Leave
                </button>
              )}
            </div>
          ) : isPending ? (
            <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              <i className="fas fa-clock mr-2"></i>
              Request Pending
            </span>
          ) : (
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isJoining ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {group.privacy === "Private" ? "Requesting..." : "Joining..."}
                </>
              ) : (
                <>
                  <i className="fas fa-plus mr-2"></i>
                  {group.privacy === "Private" ? "Request to Join" : "Join Group"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
