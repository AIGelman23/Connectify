"use client";

import { useState, useMemo } from "react";
import ConversationItem from "./ConversationItem";

export default function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversations,
  currentUserId,
  presenceMap = {},
  loading = false,
  error = null,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;

    const term = searchTerm.toLowerCase();
    return conversations.filter((conv) => {
      // Search in participant names
      const participantMatch = conv.participants?.some((p) =>
        p.name?.toLowerCase().includes(term)
      );
      // Search in conversation name (for groups)
      const nameMatch = conv.name?.toLowerCase().includes(term);
      // Search in last message
      const messageMatch = conv.lastMessage?.toLowerCase().includes(term);

      return participantMatch || nameMatch || messageMatch;
    });
  }, [conversations, searchTerm]);

  // Handle multi-select
  const toggleSelect = (convId, e) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(convId)
        ? prev.filter((id) => id !== convId)
        : [...prev, convId]
    );
  };

  // Handle delete selected
  const handleDeleteSelected = () => {
    if (selectedIds.length > 0 && onDeleteConversations) {
      onDeleteConversations(selectedIds);
      setSelectedIds([]);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds([]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
            Messages
          </h2>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  {selectedIds.length} selected
                </span>
                <button
                  onClick={clearSelection}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                  title="Clear selection"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                  title="Delete selected"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
            <button
              onClick={onNewConversation}
              className="p-2 rounded-full text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition"
              title="New conversation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-slate-600 rounded-full
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100
              placeholder-gray-500 dark:placeholder-slate-400"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-slate-400">
            {searchTerm ? "No conversations found" : "No conversations yet"}
          </div>
        ) : (
          <ul>
            {filteredConversations.map((conversation) => {
              const otherParticipants = conversation.participants?.filter(
                (p) => p.id !== currentUserId
              ) || [];
              const firstOtherUser = otherParticipants[0];
              const isOnline = firstOtherUser
                ? presenceMap[firstOtherUser.id]?.isOnline
                : false;

              return (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversationId === conversation.id}
                  isMultiSelected={selectedIds.includes(conversation.id)}
                  onSelect={() => onSelectConversation(conversation)}
                  onToggleMultiSelect={(e) => toggleSelect(conversation.id, e)}
                  currentUserId={currentUserId}
                  isOnline={isOnline}
                  lastSeen={
                    firstOtherUser
                      ? presenceMap[firstOtherUser.id]?.lastSeenAt
                      : null
                  }
                />
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
