// src/components/stories/StoryViewer.jsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

// Filter CSS mapping
const FILTER_CSS_MAP = {
  none: 'none',
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(80%)',
  warm: 'sepia(30%) saturate(140%) brightness(105%)',
  cool: 'saturate(80%) hue-rotate(10deg) brightness(105%)',
  vintage: 'sepia(40%) contrast(90%) brightness(90%)',
  dramatic: 'contrast(130%) brightness(90%)',
  fade: 'contrast(90%) brightness(110%) saturate(80%)',
  vivid: 'saturate(150%) contrast(110%)',
  noir: 'grayscale(100%) contrast(120%) brightness(90%)',
};

const getFilterCss = (filterId) => FILTER_CSS_MAP[filterId] || 'none';

export default function StoryViewer({ 
  stories, 
  initialIndex = 0, 
  userId,
  onClose,
  onStoryChange,
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [viewers, setViewers] = useState([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  
  const videoRef = useRef(null);
  const progressInterval = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const currentStory = stories[currentIndex];
  const isOwn = currentStory?.isOwn;
  const duration = currentStory?.duration || 5000;

  // Mark story as viewed
  useEffect(() => {
    if (currentStory?.id && !currentStory?.isOwn) {
      fetch(`/api/stories/${currentStory.id}`).catch(console.error);
    }
  }, [currentStory?.id, currentStory?.isOwn]);

  // Progress bar timer
  useEffect(() => {
    if (isPaused || !currentStory) return;

    const startTime = Date.now();
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        goToNext();
      }
    };

    progressInterval.current = setInterval(updateProgress, 50);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex, isPaused, duration, currentStory]);

  // Handle video playback
  useEffect(() => {
    if (currentStory?.mediaType === "video" && videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
    }
  }, [isPaused, currentStory?.mediaType]);

  // Fetch viewers for own stories
  const fetchViewers = async () => {
    if (!currentStory?.id || !isOwn) return;
    
    setIsLoadingViewers(true);
    try {
      const res = await fetch(`/api/stories/${currentStory.id}`);
      const data = await res.json();
      setViewers(data.story?.viewers || []);
    } catch (error) {
      console.error("Error fetching viewers:", error);
    } finally {
      setIsLoadingViewers(false);
    }
  };

  useEffect(() => {
    if (showViewers && isOwn) {
      fetchViewers();
    }
  }, [showViewers, currentStory?.id, isOwn]);

  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      onStoryChange?.(currentIndex + 1);
    } else {
      onClose?.();
    }
  }, [currentIndex, stories.length, onClose, onStoryChange]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      onStoryChange?.(currentIndex - 1);
    }
  }, [currentIndex, onStoryChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showReplyInput) return;
      
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, onClose, showReplyInput]);

  // Touch gestures
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsPaused(true);
  };

  const handleTouchEnd = (e) => {
    setIsPaused(false);
    if (!touchStartX.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    // Swipe left/right for navigation
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
    // Swipe down to close
    else if (diffY < -100) {
      onClose?.();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Click to navigate
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) {
      goToPrevious();
    } else if (x > (width * 2) / 3) {
      goToNext();
    }
  };

  // Send reply
  const handleSendReply = async () => {
    if (!replyText.trim() || !currentStory?.id) return;

    try {
      await fetch(`/api/stories/${currentStory.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      setReplyText("");
      setShowReplyInput(false);
    } catch (error) {
      console.error("Error sending reply:", error);
    }
  };

  // Send reaction
  const handleReaction = async (emoji) => {
    if (!currentStory?.id) return;

    try {
      await fetch(`/api/stories/${currentStory.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } catch (error) {
      console.error("Error sending reaction:", error);
    }
  };

  // Delete story (for owner)
  const handleDelete = async () => {
    if (!currentStory?.id || !isOwn) return;
    
    if (!confirm("Are you sure you want to delete this story?")) return;

    try {
      await fetch(`/api/stories/${currentStory.id}`, { method: "DELETE" });
      if (stories.length === 1) {
        onClose?.();
      } else {
        goToNext();
      }
    } catch (error) {
      console.error("Error deleting story:", error);
    }
  };

  if (!currentStory) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
      >
        <i className="fas fa-times text-white text-xl"></i>
      </button>

      {/* Story Container */}
      <div
        className="relative w-full h-full max-w-[450px] max-h-[800px] mx-auto bg-black rounded-xl overflow-hidden"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-2">
          {stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width:
                    index < currentIndex
                      ? "100%"
                      : index === currentIndex
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-30 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={currentStory.author?.image || "/default-avatar.png"}
              alt={currentStory.author?.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white"
            />
            <div>
              <p className="text-white font-semibold text-sm">
                {currentStory.author?.name}
              </p>
              <p className="text-white/70 text-xs">
                {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Story actions */}
          <div className="flex items-center gap-2">
            {isOwn && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowViewers(!showViewers);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 text-white text-sm hover:bg-white/30"
                >
                  <i className="fas fa-eye"></i>
                  <span>{currentStory.viewsCount || 0}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-red-500/50"
                >
                  <i className="fas fa-trash text-sm"></i>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Media Content */}
        <div className="relative w-full h-full">
          {currentStory.mediaType === "video" ? (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              className="w-full h-full object-contain"
              style={{ 
                filter: currentStory.filters?.filter 
                  ? getFilterCss(currentStory.filters.filter) 
                  : 'none' 
              }}
              playsInline
              muted={false}
              loop={false}
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-contain"
              style={{ 
                filter: currentStory.filters?.filter 
                  ? getFilterCss(currentStory.filters.filter) 
                  : 'none' 
              }}
            />
          )}

          {/* Text Overlays */}
          {currentStory.textOverlays?.map((overlay) => (
            <div
              key={overlay.id}
              className="absolute pointer-events-none"
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <span
                style={{
                  color: overlay.color || '#ffffff',
                  backgroundColor: overlay.bgColor || 'transparent',
                  fontSize: `${overlay.fontSize || 24}px`,
                }}
                className="px-2 py-1 rounded font-semibold whitespace-nowrap"
              >
                {overlay.text}
              </span>
            </div>
          ))}

          {/* Stickers */}
          {currentStory.stickers?.map((sticker) => (
            <div
              key={sticker.id}
              className="absolute pointer-events-none"
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                transform: `translate(-50%, -50%) scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
              }}
            >
              <img
                src={sticker.url}
                alt="Sticker"
                className="max-w-[120px]"
                draggable={false}
              />
            </div>
          ))}

          {/* Location Badge */}
          {currentStory.location && (
            <div className="absolute bottom-32 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-full pointer-events-none">
              <i className="fas fa-map-marker-alt text-pink-400 text-sm"></i>
              <span className="text-white text-sm font-medium">{currentStory.location}</span>
            </div>
          )}
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-24 left-0 right-0 z-20 px-4">
            <p className="text-white text-center text-shadow-lg bg-black/30 rounded-lg p-3">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Bottom Actions (for non-owner) */}
        {!isOwn && (
          <div className="absolute bottom-4 left-0 right-0 z-30 px-4">
            {showReplyInput ? (
              <div className="flex items-center gap-2 bg-white/20 rounded-full p-1">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendReply()}
                  placeholder="Reply to story..."
                  className="flex-1 bg-transparent text-white placeholder-white/70 px-4 py-2 outline-none"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSendReply();
                  }}
                  className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center"
                >
                  <i className="fas fa-paper-plane text-white"></i>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReplyInput(true);
                  }}
                  className="flex-1 flex items-center gap-2 bg-white/20 rounded-full px-4 py-3 text-white/80 hover:bg-white/30"
                >
                  <i className="fas fa-reply"></i>
                  <span>Reply</span>
                </button>

                {/* Quick reactions */}
                <div className="flex items-center gap-1 ml-2">
                  {["❤️", "😂", "😮", "😢", "🔥"].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReaction(emoji);
                      }}
                      className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl hover:bg-white/30 hover:scale-110 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Viewers Panel (for owner) */}
        {showViewers && isOwn && (
          <div
            className="absolute bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 rounded-t-2xl max-h-[50%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Viewers ({viewers.length})
              </h3>
              <button
                onClick={() => setShowViewers(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {isLoadingViewers ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : viewers.length > 0 ? (
              <div className="p-2">
                {viewers.map((viewer) => (
                  <div
                    key={viewer.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                    onClick={() => router.push(`/profile/${viewer.id}`)}
                  >
                    <img
                      src={viewer.image || "/default-avatar.png"}
                      alt={viewer.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {viewer.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {formatDistanceToNow(new Date(viewer.viewedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                No viewers yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Arrows (Desktop) */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors hidden md:flex"
        >
          <i className="fas fa-chevron-left text-white text-xl"></i>
        </button>
      )}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors hidden md:flex"
        >
          <i className="fas fa-chevron-right text-white text-xl"></i>
        </button>
      )}
    </div>
  );
}
