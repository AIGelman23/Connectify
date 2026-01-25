"use client";

import { useState, useEffect } from "react";

export default function LinkPreview({ url, isOwnMessage = false }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(false);

        // Try to get basic info from URL
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace("www.", "");

        // Set basic preview from URL
        setPreview({
          url,
          domain,
          title: null,
          description: null,
          image: null,
          favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        });

        // Try to fetch metadata from our API
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          const data = await response.json();
          setPreview((prev) => ({
            ...prev,
            title: data.title || prev?.title,
            description: data.description || prev?.description,
            image: data.image || prev?.image,
          }));
        }
      } catch (err) {
        console.error("Failed to fetch link preview:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (!url || error) return null;

  if (loading && !preview) {
    return (
      <div className={`mt-2 p-3 rounded-lg animate-pulse ${
        isOwnMessage ? "bg-blue-400/30" : "bg-gray-200 dark:bg-slate-600"
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-300 dark:bg-slate-500" />
          <div className="h-3 w-24 rounded bg-gray-300 dark:bg-slate-500" />
        </div>
        <div className="mt-2 h-4 w-3/4 rounded bg-gray-300 dark:bg-slate-500" />
      </div>
    );
  }

  if (!preview) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 block rounded-lg overflow-hidden border transition-opacity hover:opacity-90 ${
        isOwnMessage
          ? "bg-blue-500/20 border-blue-400/30"
          : "bg-gray-100 dark:bg-slate-600/50 border-gray-200 dark:border-slate-500"
      }`}
    >
      {/* Image */}
      {preview.image && (
        <div className="w-full h-32 overflow-hidden">
          <img
            src={preview.image}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Domain with favicon */}
        <div className="flex items-center gap-2 mb-1">
          {preview.favicon && (
            <img
              src={preview.favicon}
              alt=""
              className="w-4 h-4"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          )}
          <span className={`text-xs ${
            isOwnMessage ? "text-blue-100" : "text-gray-500 dark:text-slate-400"
          }`}>
            {preview.domain}
          </span>
        </div>

        {/* Title */}
        {preview.title && (
          <p className={`text-sm font-medium line-clamp-2 ${
            isOwnMessage ? "text-white" : "text-gray-900 dark:text-slate-100"
          }`}>
            {preview.title}
          </p>
        )}

        {/* Description */}
        {preview.description && (
          <p className={`text-xs mt-1 line-clamp-2 ${
            isOwnMessage ? "text-blue-100" : "text-gray-500 dark:text-slate-400"
          }`}>
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}

// Helper to extract first URL from text
export function extractFirstUrl(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}
