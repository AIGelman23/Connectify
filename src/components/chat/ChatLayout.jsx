"use client";

import { useState, useEffect } from "react";

export default function ChatLayout({
  conversations,
  selectedConversation,
  onSelectConversation,
  children,
  sidebar,
  isMobile = false,
}) {
  const [showSidebar, setShowSidebar] = useState(true);

  // On mobile, hide sidebar when a conversation is selected
  useEffect(() => {
    if (isMobile && selectedConversation) {
      setShowSidebar(false);
    }
  }, [isMobile, selectedConversation]);

  // Handle back button on mobile
  const handleBack = () => {
    setShowSidebar(true);
    onSelectConversation(null);
  };

  return (
    <div className="flex h-full overflow-hidden bg-gray-100 dark:bg-slate-900">
      {/* Sidebar */}
      <aside
        className={`
          ${isMobile ? (showSidebar ? "w-full" : "hidden") : "w-80 lg:w-96"}
          flex-shrink-0 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700
          flex flex-col shadow-sm transition-all duration-200
        `}
      >
        {sidebar}
      </aside>

      {/* Main Chat Area */}
      <main
        className={`
          flex-1 flex flex-col bg-gray-50 dark:bg-slate-900
          ${isMobile && showSidebar ? "hidden" : "flex"}
        `}
      >
        {children}

        {/* Mobile back button overlay */}
        {isMobile && !showSidebar && (
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 z-20 p-2 rounded-full bg-white dark:bg-slate-800 shadow-lg md:hidden"
            aria-label="Back to conversations"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}
      </main>
    </div>
  );
}
