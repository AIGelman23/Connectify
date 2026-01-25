"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

/**
 * Renders text content with clickable hashtags
 */
export default function HashtagText({ content, className = "" }) {
  const router = useRouter();

  const parts = useMemo(() => {
    if (!content) return [];
    
    // Split by hashtag pattern while keeping the hashtags
    const regex = /(#[a-zA-Z0-9_]+)/g;
    return content.split(regex).filter(Boolean);
  }, [content]);

  const handleHashtagClick = (e, tag) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/hashtag/${tag.slice(1).toLowerCase()}`);
  };

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("#")) {
          return (
            <button
              key={index}
              onClick={(e) => handleHashtagClick(e, part)}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {part}
            </button>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
