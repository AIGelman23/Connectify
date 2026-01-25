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
    <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-t border-gray-100 dark:border-slate-700/50">
      {/* Reply preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-transparent dark:from-slate-700/50 dark:to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1 h-10 bg-blue-500 rounded-full" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Replying to {replyingTo.sender?.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                {replyingTo.content}
              </p>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <form onSubmit={handleSubmit} className="p-3 flex items-end gap-2">
        {/* Plus button for attachments */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
          title="Attach file"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
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

        {/* Text input with emoji button inside */}
        <div className="flex-1 relative flex items-end">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Aa"
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2.5 pr-12 border-0 rounded-full
              focus:outline-none focus:ring-2 focus:ring-blue-500/20
              bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100
              placeholder-gray-500 dark:placeholder-slate-400
              resize-none max-h-32 disabled:opacity-50 transition-all"
            style={{
              minHeight: "42px",
              height: "auto",
            }}
          />
          {/* Emoji button inside input */}
          <div className="absolute right-2 bottom-1.5">
            <EmojiSelector onEmojiSelect={handleEmojiSelect} />
          </div>
        </div>

        {/* Send button - Messenger style */}
        <button
          type="submit"
          disabled={(!message.trim() && attachments.length === 0) || disabled || isUploading}
          className={`p-2 rounded-full transition-all flex-shrink-0 ${(!message.trim() && attachments.length === 0) || disabled || isUploading
              ? "text-gray-400 dark:text-slate-500"
              : "text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700"
            }`}
          title={isUploading ? "Uploading..." : "Send message"}
        >
          {isUploading ? (
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
