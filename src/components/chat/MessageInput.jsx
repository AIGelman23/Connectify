"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import EmojiSelector from "../EmojiSelector";

export default function MessageInput({
  onSendMessage,
  onTyping,
  replyingTo = null,
  onCancelReply,
  disabled = false,
  conversationId,
  onAttachFile,
  onRecordVoice,
}) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Helper to determine file type
  const getFileType = (file) => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "file";
  };

  // Upload file to S3
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    return data.url;
  };

  // Focus input when replying
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (onTyping) {
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  }, [onTyping]);

  // Clean up typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Clean up object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      attachments.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
    };
  }, [attachments]);

  // Handle input change
  const handleChange = (e) => {
    setMessage(e.target.value);
    handleTyping();
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if ((!message.trim() && attachments.length === 0) || disabled || isUploading) return;

    let mediaUrls = [];
    let messageType = "text";

    // Upload attachments if any
    if (attachments.length > 0) {
      setIsUploading(true);
      try {
        // Upload all files and get URLs
        const uploadPromises = attachments.map(async (attachment) => {
          if (attachment.file) {
            return await uploadFile(attachment.file);
          }
          return attachment.url; // Already uploaded URL
        });

        mediaUrls = await Promise.all(uploadPromises);

        // Determine message type based on first attachment
        const firstType = getFileType(attachments[0].file || { type: attachments[0].mimeType || "" });
        messageType = firstType;
      } catch (error) {
        console.error("Failed to upload files:", error);
        setIsUploading(false);
        return; // Don't send if upload failed
      }
      setIsUploading(false);
    }

    onSendMessage({
      conversationId,
      content: message.trim(),
      type: messageType,
      mediaUrls,
      replyToId: replyingTo?.id,
    });

    setMessage("");
    // Clean up object URLs before clearing attachments
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });
    setAttachments([]);
    if (onCancelReply) onCancelReply();

    // Stop typing
    if (onTyping) {
      onTyping(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file), // Local preview only
      type: getFileType(file),
      mimeType: file.type,
      name: file.name,
      size: file.size,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments((prev) => {
      const newAttachments = [...prev];
      if (newAttachments[index].previewUrl) {
        URL.revokeObjectURL(newAttachments[index].previewUrl);
      }
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  // Handle key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
      {/* Reply preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1 h-10 bg-indigo-500 rounded-full" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                Replying to {replyingTo.sender?.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                {replyingTo.content}
              </p>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
          <div className="flex gap-2 overflow-x-auto">
            {attachments.map((attachment, index) => (
              <div key={index} className="relative flex-shrink-0">
                {attachment.type === "image" ? (
                  <img
                    src={attachment.previewUrl}
                    alt="Attachment"
                    className="h-20 w-20 object-cover rounded-lg"
                  />
                ) : attachment.type === "video" ? (
                  <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-black">
                    <video
                      src={attachment.previewUrl}
                      className="h-full w-full object-cover"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="h-20 w-20 bg-gray-200 dark:bg-slate-600 rounded-lg flex flex-col items-center justify-center p-1">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-gray-500 truncate w-full text-center mt-1">
                      {attachment.name?.slice(0, 8)}...
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 flex items-end gap-2">
        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          title="Attach file"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-2xl
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100
              placeholder-gray-500 dark:placeholder-slate-400
              resize-none max-h-32 disabled:opacity-50"
            style={{
              minHeight: "44px",
              height: "auto",
            }}
          />
        </div>

        {/* Emoji picker */}
        <EmojiSelector onEmojiSelect={handleEmojiSelect} />

        {/* Send button */}
        <button
          type="submit"
          disabled={(!message.trim() && attachments.length === 0) || disabled || isUploading}
          className="p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700
            disabled:opacity-50 disabled:cursor-not-allowed transition"
          title={isUploading ? "Uploading..." : "Send message"}
        >
          {isUploading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
