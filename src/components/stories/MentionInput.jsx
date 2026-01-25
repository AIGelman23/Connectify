// src/components/stories/MentionInput.jsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

export default function MentionInput({
  value,
  onChange,
  placeholder = "Add a caption...",
  maxLength = 200,
  className = "",
  onMentionsChange,
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Extract mentions from text
  const extractMentions = useCallback((text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push({
        username: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
    return mentions;
  }, []);

  // Detect @ being typed
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursor);

    // Find if we're in the middle of typing a mention
    const textBeforeCursor = newValue.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's a space after @ (meaning mention is complete)
      if (!textAfterAt.includes(" ") && textAfterAt.length <= 20) {
        setMentionQuery(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        if (textAfterAt.length >= 1) {
          searchUsers(textAfterAt);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
        return;
      }
    }
    
    // No active mention
    setMentionQuery("");
    setMentionStartIndex(-1);
    setShowSuggestions(false);
    setSuggestions([]);

    // Notify parent of mentions
    if (onMentionsChange) {
      const mentions = extractMentions(newValue);
      onMentionsChange(mentions);
    }
  };

  // Search users
  const searchUsers = async (query) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=users&limit=5`,
        { signal: abortControllerRef.current.signal }
      );
      
      if (!response.ok) throw new Error("Search failed");
      
      const data = await response.json();
      setSuggestions(data.users?.results || []);
      setShowSuggestions(true);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("User search failed:", err);
        setSuggestions([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Select a user from suggestions
  const selectUser = (user) => {
    const beforeMention = value.slice(0, mentionStartIndex);
    const afterMention = value.slice(cursorPosition);
    const newValue = `${beforeMention}@${user.username || user.name.replace(/\s/g, "")} ${afterMention}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery("");
    setMentionStartIndex(-1);

    // Focus back on input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = mentionStartIndex + (user.username || user.name).length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);

    // Notify parent of mentions
    if (onMentionsChange) {
      const mentions = extractMentions(newValue);
      onMentionsChange(mentions);
    }
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      // Could implement arrow navigation here
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    } else if (e.key === "Tab" && suggestions.length > 0) {
      e.preventDefault();
      selectUser(suggestions[0]);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        className={className}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-0 bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-lg overflow-hidden z-50 max-h-60 overflow-y-auto"
        >
          {isLoading && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-slate-400 text-sm flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              Searching...
            </div>
          ) : (
            suggestions.map((user) => (
              <button
                key={user.id}
                onClick={() => selectUser(user)}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left"
              >
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-600 flex-shrink-0">
                  {user.image || user.profile?.profilePictureUrl ? (
                    <Image
                      src={user.profile?.profilePictureUrl || user.image}
                      alt={user.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                      {user.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{user.name}</p>
                  {user.username && (
                    <p className="text-slate-400 text-sm truncate">@{user.username}</p>
                  )}
                </div>
              </button>
            ))
          )}
          
          {!isLoading && suggestions.length === 0 && mentionQuery && (
            <div className="px-4 py-3 text-slate-400 text-sm">
              No users found for &quot;{mentionQuery}&quot;
            </div>
          )}
        </div>
      )}

      <p className="text-right text-xs text-slate-500 mt-1">
        {value.length}/{maxLength}
      </p>
    </div>
  );
}
