// src/components/search/UserSearchResult.jsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { highlightMatch } from "@/lib/searchUtils";

export default function UserSearchResult({ user, query, onConnect }) {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (e) => {
    e.stopPropagation();
    if (isConnecting) return;

    try {
      setIsConnecting(true);
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: user.id }),
      });

      if (res.ok) {
        onConnect?.(user.id);
      }
    } catch (error) {
      console.error("Error sending connection request:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleViewProfile = () => {
    router.push(`/profile/${user.id}`);
  };

  return (
    <div
      onClick={handleViewProfile}
      className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Profile Picture */}
        <img
          src={user.imageUrl}
          alt={user.name}
          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://placehold.co/64x64/3B82F6/ffffff?text=${
              user.name ? user.name[0].toUpperCase() : "U"
            }`;
          }}
        />

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {highlightMatch(user.name, query)}
              </h3>
              {user.headline && (
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-0.5">
                  {highlightMatch(user.headline, query)}
                </p>
              )}
            </div>

            {/* Connection Status / Actions */}
            {!user.isCurrentUser && (
              <div className="flex-shrink-0 ml-4">
                {user.connectionStatus === "CONNECTED" ? (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <i className="fas fa-user-check mr-1.5"></i>
                    Connected
                  </span>
                ) : user.connectionStatus === "PENDING_SENT" ? (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                    <i className="fas fa-clock mr-1.5"></i>
                    Pending
                  </span>
                ) : user.connectionStatus === "PENDING_RECEIVED" ? (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <i className="fas fa-user-plus mr-1.5"></i>
                    Accept
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isConnecting ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-plus mr-1.5"></i>
                        Connect
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-400">
            {user.currentPosition && (
              <span className="flex items-center">
                <i className="fas fa-briefcase mr-1.5 text-gray-400"></i>
                {highlightMatch(user.currentPosition, query)}
              </span>
            )}
            {user.location && (
              <span className="flex items-center">
                <i className="fas fa-map-marker-alt mr-1.5 text-gray-400"></i>
                {highlightMatch(user.location, query)}
              </span>
            )}
            {user.mutualConnections > 0 && (
              <span className="flex items-center">
                <i className="fas fa-users mr-1.5 text-gray-400"></i>
                {user.mutualConnections} mutual connection
                {user.mutualConnections > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Skills */}
          {user.skills && user.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.skills.slice(0, 5).map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  {highlightMatch(skill, query)}
                </span>
              ))}
              {user.skills.length > 5 && (
                <span className="text-xs text-gray-400">
                  +{user.skills.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
