"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/NavBar";
import {
  ChatLayout,
  ConversationList,
  ChatWindow,
} from "../../components/chat";
import useChat from "../../hooks/useChat";

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  // Modal states
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [conversationsToDelete, setConversationsToDelete] = useState([]);

  // New conversation modal state
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friendSearchTerm, setFriendSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState(null);

  // Error handling
  const handleError = useCallback((errorMsg) => {
    console.error("Chat error:", errorMsg);
  }, []);

  // Initialize chat hook
  const {
    isConnected,
    conversations,
    selectedConversation,
    messages,
    typingUsers,
    presenceMap,
    loading,
    error,
    fetchConversations,
    selectConversation,
    sendMessage,
    sendTyping,
    markAsRead,
    reactToMessage,
    createConversation,
    deleteConversations,
  } = useChat({
    userId: session?.user?.id,
    jwt: session?.jwt,
    onError: handleError,
  });

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Handle responsive layout
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Search for users (for new conversation)
  const searchUsers = useCallback(async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(term)}`);
      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      // Filter out current user
      const filtered = data.users.filter((u) => u.id !== session?.user?.id);
      setSearchResults(filtered);
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setSearchLoading(false);
    }
  }, [session?.user?.id]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(friendSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [friendSearchTerm, searchUsers]);

  // Handle send message
  const handleSendMessage = useCallback((messageData) => {
    sendMessage(messageData);
    setReplyingTo(null);
  }, [sendMessage]);

  // Handle reaction
  const handleReact = useCallback((messageId, emoji) => {
    reactToMessage(messageId, emoji);
  }, [reactToMessage]);

  // Handle reply
  const handleReply = useCallback((message) => {
    setReplyingTo(message);
  }, []);

  // Handle create conversation
  const handleCreateConversation = useCallback(async () => {
    if (selectedFriends.length === 0) return;

    try {
      await createConversation(
        selectedFriends.map((f) => f.id),
        selectedFriends.length > 1 ? null : undefined
      );

      // Reset modal state
      setIsNewConversationModalOpen(false);
      setSelectedFriends([]);
      setFriendSearchTerm("");
      setSearchResults([]);
    } catch (err) {
      console.error("Error creating conversation:", err);
    }
  }, [selectedFriends, createConversation]);

  // Handle delete conversations
  const handleDeleteConversations = useCallback(async (ids) => {
    setConversationsToDelete(ids);
    setIsDeleteModalOpen(true);
  }, []);

  // Confirm delete
  const confirmDelete = useCallback(async () => {
    await deleteConversations(conversationsToDelete);
    setIsDeleteModalOpen(false);
    setConversationsToDelete([]);
  }, [conversationsToDelete, deleteConversations]);

  // Toggle friend selection
  const toggleFriendSelection = useCallback((friend) => {
    setSelectedFriends((prev) =>
      prev.some((f) => f.id === friend.id)
        ? prev.filter((f) => f.id !== friend.id)
        : [...prev, friend]
    );
  }, []);

  // Loading state
  if (status === "loading" || !session?.user?.id) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 font-sans antialiased text-gray-900 dark:text-slate-100 flex flex-col">
      <Navbar session={session} router={router} />

      <div className="flex-1 flex overflow-hidden">
        <ChatLayout
          isMobile={isMobile}
          selectedConversation={selectedConversation}
          onSelectConversation={selectConversation}
          sidebar={
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversation?.id}
              onSelectConversation={selectConversation}
              onNewConversation={() => setIsNewConversationModalOpen(true)}
              onDeleteConversations={handleDeleteConversations}
              currentUserId={session.user.id}
              presenceMap={presenceMap}
              loading={loading}
              error={error}
            />
          }
        >
          <ChatWindow
            conversation={selectedConversation}
            messages={messages}
            currentUserId={session.user.id}
            presenceMap={presenceMap}
            typingUsers={typingUsers}
            onSendMessage={handleSendMessage}
            onReact={handleReact}
            onReply={handleReply}
            onMarkAsRead={markAsRead}
            onTyping={sendTyping}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            loading={loading}
            onBack={isMobile ? () => selectConversation(null) : undefined}
          />
        </ChatLayout>
      </div>

      {/* New Conversation Modal */}
      {isNewConversationModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg p-6 animate-scale-in">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-4 border-b dark:border-slate-700 pb-2">
              Start New Conversation
            </h3>

            <div className="space-y-4">
              {/* Search input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Search for friends
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  placeholder="Search by name or email"
                  value={friendSearchTerm}
                  onChange={(e) => setFriendSearchTerm(e.target.value)}
                />
              </div>

              {/* Search results */}
              {searchLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-2">
                  {searchResults.length === 0 && friendSearchTerm.length >= 2 ? (
                    <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-2">
                      No matching users found.
                    </p>
                  ) : friendSearchTerm.length < 2 ? (
                    <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-2">
                      Start typing to search for friends.
                    </p>
                  ) : (
                    searchResults.map((user) => {
                      const isSelected = selectedFriends.some((f) => f.id === user.id);
                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-md cursor-pointer"
                          onClick={() => toggleFriendSelection(user)}
                        >
                          <div className="flex items-center">
                            <img
                              src={
                                user.image ||
                                `https://placehold.co/40x40/6366F1/ffffff?text=${(
                                  user.name?.[0] || "U"
                                ).toUpperCase()}`
                              }
                              alt={user.name}
                              className="w-8 h-8 rounded-full object-cover mr-3"
                            />
                            <span className="font-semibold text-gray-800 dark:text-slate-100">
                              {user.name}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFriendSelection(user)}
                            className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Selected participants */}
              <div>
                <p className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Selected Participants:
                </p>
                {selectedFriends.length === 0 ? (
                  <p className="text-gray-500 dark:text-slate-400 text-sm">
                    No participants selected.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedFriends.map((friend) => (
                      <span
                        key={friend.id}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300"
                      >
                        {friend.name}
                        <button
                          type="button"
                          onClick={() => toggleFriendSelection(friend)}
                          className="ml-2 -mr-1 text-indigo-600 hover:text-indigo-800 focus:outline-none"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsNewConversationModalOpen(false);
                  setSelectedFriends([]);
                  setFriendSearchTerm("");
                  setSearchResults([]);
                }}
                className="px-5 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-300 font-semibold hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConversation}
                disabled={selectedFriends.length === 0}
                className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Start Conversation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete{" "}
              {conversationsToDelete.length > 1
                ? `${conversationsToDelete.length} conversations`
                : "this conversation"}
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setConversationsToDelete([]);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-300 font-semibold hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection status indicator */}
      {!isConnected && (
        <div className="fixed bottom-4 left-4 bg-yellow-500 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-lg z-50">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Connecting to chat...
        </div>
      )}
    </div>
  );
}
