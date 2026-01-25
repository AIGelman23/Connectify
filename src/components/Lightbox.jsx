"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Comment } from './Comment';
import { formatTimestamp } from '../lib/utils';

export default function Lightbox({ images = [], initialIndex = 0, isOpen, onClose, post, sessionUserId, currentUser, onLikeComment, onReply, onDeleteComment, onAddComment, onReaction, onReport, onSave, isSaved: isSavedProp }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const [commentText, setCommentText] = useState("");
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);

  // Mobile-specific state
  const [showUI, setShowUI] = useState(true);
  const [dismissProgress, setDismissProgress] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Touch/swipe state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchCurrentY, setTouchCurrentY] = useState(null);
  const [touchStartTime, setTouchStartTime] = useState(null);
  const [hasMoved, setHasMoved] = useState(false);
  const minSwipeDistance = 50;
  const tapThreshold = 10; // pixels moved threshold to distinguish tap from swipe

  // Pinch-to-zoom state
  const [initialPinchDistance, setInitialPinchDistance] = useState(null);
  const [initialScale, setInitialScale] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      document.body.style.overflow = 'hidden';
      setShowComments(false);
      setShowUI(true);
      setDismissProgress(0);
      setIsDismissing(false);
      setScale(1);
      setIsLiked(post?.likedByCurrentUser || post?.currentUserReaction != null || false);
      setIsBookmarked(isSavedProp || post?.isSaved || false);
      setCommentText("");
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialIndex, post?.likedByCurrentUser, post?.currentUserReaction, isSavedProp, post?.isSaved]);

  // Sync bookmark state with prop changes
  useEffect(() => {
    setIsBookmarked(isSavedProp || post?.isSaved || false);
  }, [isSavedProp, post?.isSaved]);

  // Reset zoom/pan when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsLoading(true);
  }, [currentIndex]);

  const showPrev = useCallback((e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const showNext = useCallback((e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Get distance between two touch points (for pinch zoom)
  const getTouchDistance = (touches) => {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Touch handlers for swipe navigation, pinch-to-zoom, and swipe-to-dismiss
  const onTouchStart = (e) => {
    // Handle pinch-to-zoom start
    if (e.touches.length === 2) {
      const distance = getTouchDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialScale(scale);
      setHasMoved(true); // Mark as gesture
      return;
    }

    // Single touch
    if (e.touches.length === 1) {
      setTouchEnd(null);
      setTouchStart(e.touches[0].clientX);
      setTouchStartY(e.touches[0].clientY);
      setTouchCurrentY(e.touches[0].clientY);
      setTouchStartTime(Date.now());
      setHasMoved(false);
    }
  };

  const onTouchMove = (e) => {
    // Handle pinch-to-zoom
    if (e.touches.length === 2 && initialPinchDistance) {
      const currentDistance = getTouchDistance(e.touches);
      const pinchScale = currentDistance / initialPinchDistance;
      const newScale = Math.min(Math.max(initialScale * pinchScale, 1), 3);
      setScale(newScale);
      setHasMoved(true);
      return;
    }

    // Single touch - horizontal swipe or vertical dismiss
    if (e.touches.length === 1 && scale <= 1) {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;

      setTouchEnd(currentX);
      setTouchCurrentY(currentY);

      // Check if user has moved enough to count as a swipe/drag
      if (touchStart !== null && touchStartY !== null) {
        const deltaX = Math.abs(currentX - touchStart);
        const deltaY = Math.abs(currentY - touchStartY);
        if (deltaX > tapThreshold || deltaY > tapThreshold) {
          setHasMoved(true);
        }
      }

      // Calculate vertical dismiss progress
      if (touchStartY !== null) {
        const deltaY = e.touches[0].clientY - touchStartY;
        if (deltaY > 0) {
          // Only allow downward swipe to dismiss
          const progress = Math.min(deltaY / 200, 1);
          setDismissProgress(progress);
          setIsDismissing(deltaY > 30);
        }
      }
    }
  };

  const onTouchEnd = () => {
    const touchDuration = Date.now() - (touchStartTime || 0);
    const wasTap = !hasMoved && touchDuration < 300;

    // Reset pinch state
    setInitialPinchDistance(null);

    // Handle swipe-to-dismiss
    if (isDismissing && dismissProgress > 0.4) {
      onClose();
      return;
    }

    // Reset dismiss state
    setDismissProgress(0);
    setIsDismissing(false);

    // Handle tap to toggle UI (only if it was a genuine tap, not a swipe)
    if (wasTap && scale <= 1) {
      setShowUI(prev => !prev);
      // Reset touch state
      setTouchStart(null);
      setTouchEnd(null);
      setTouchStartY(null);
      setTouchCurrentY(null);
      setTouchStartTime(null);
      setHasMoved(false);
      return;
    }

    // Handle horizontal swipe for navigation
    if (!touchStart || !touchEnd || scale > 1) {
      // Reset touch state
      setTouchStart(null);
      setTouchEnd(null);
      setTouchStartY(null);
      setTouchCurrentY(null);
      setTouchStartTime(null);
      setHasMoved(false);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && images.length > 1) {
      showNext();
    }
    if (isRightSwipe && images.length > 1) {
      showPrev();
    }

    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
    setTouchStartY(null);
    setTouchCurrentY(null);
    setTouchStartTime(null);
    setHasMoved(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') showPrev(e);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') showNext(e);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showPrev, showNext]);

  if (!isOpen || !images || images.length === 0) return null;

  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setScale(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setScale(prev => Math.max(prev - 0.5, 1));
    if (scale <= 1.5) setPosition({ x: 0, y: 0 });
  };

  const handleDownload = async (e) => {
    e?.stopPropagation();
    const imageUrl = images[currentIndex];
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(imageUrl, '_blank');
    }
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handlePostComment = (e) => {
    e.preventDefault();
    if (commentText.trim() && onAddComment) {
      onAddComment(commentText);
      setCommentText("");
    }
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setShowBigHeart(true);
    setIsLiked(true);
    setTimeout(() => setShowBigHeart(false), 800);
    if (onReaction) {
      onReaction('LOVE');
    }
  };

  const handleLike = (e) => {
    e?.stopPropagation();
    setIsLiked(prev => !prev);
    if (onReaction) {
      onReaction('LIKE');
    }
  };

  const handleBookmark = (e) => {
    e?.stopPropagation();
    setIsBookmarked(prev => !prev);
    if (onSave) {
      onSave();
    }
  };

  const handleShare = async (e) => {
    e?.stopPropagation();
    const shareData = {
      title: post?.content?.substring(0, 50) || 'Check out this image',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy link');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex items-center justify-center animate-fade-in backdrop-blur-sm overflow-hidden font-sans"
      onClick={onClose}
    >
      {/* Mobile Layout - Twitter/X/Facebook Style */}
      <div
        className="flex flex-col md:hidden w-full h-full"
        style={{
          transform: `translateY(${dismissProgress * 100}px)`,
          opacity: 1 - dismissProgress * 0.5,
          transition: isDismissing ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out'
        }}
      >
        {/* Mobile Top Bar - Fades in/out */}
        <div
          className={`absolute top-0 left-0 right-0 z-50 transition-all duration-200 ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center px-2 py-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <button
              className="text-white p-2.5 rounded-full active:bg-white/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close"
            >
              <i className="fas fa-arrow-left text-xl"></i>
            </button>
            <div className="text-white text-sm font-medium">
              {images.length > 1 && `${currentIndex + 1} / ${images.length}`}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(e);
              }}
              className="text-white p-2.5 rounded-full active:bg-white/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Download"
            >
              <i className="fas fa-download text-xl"></i>
            </button>
          </div>
        </div>

        {/* Mobile Image Area - Full screen, edge-to-edge */}
        <div
          className="flex-1 relative flex items-center justify-center overflow-hidden bg-black"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onDoubleClick={handleDoubleClick}
          onClick={(e) => e.stopPropagation()}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white"></div>
            </div>
          )}

          <img
            ref={imageRef}
            src={images[currentIndex]}
            alt={`Full screen view ${currentIndex + 1}`}
            onLoad={() => setIsLoading(false)}
            className={`max-h-full max-w-full object-contain select-none transition-all duration-200 ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={{
              transform: `scale(${scale})`,
              transition: scale === 1 ? 'transform 0.2s ease-out' : 'none'
            }}
            draggable={false}
          />

          {/* Navigation arrows (show on tap, Twitter style) */}
          {images.length > 1 && showUI && (
            <>
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/40 backdrop-blur-sm rounded-full w-11 h-11 flex items-center justify-center active:bg-black/60 transition-all z-40"
                onClick={(e) => { e.stopPropagation(); showPrev(e); }}
                onTouchEnd={(e) => { e.stopPropagation(); }}
                aria-label="Previous image"
              >
                <i className="fas fa-chevron-left text-lg"></i>
              </button>
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/40 backdrop-blur-sm rounded-full w-11 h-11 flex items-center justify-center active:bg-black/60 transition-all z-40"
                onClick={(e) => { e.stopPropagation(); showNext(e); }}
                onTouchEnd={(e) => { e.stopPropagation(); }}
                aria-label="Next image"
              >
                <i className="fas fa-chevron-right text-lg"></i>
              </button>
            </>
          )}

          {/* Image indicators (dots) - Always visible at bottom */}
          {images.length > 1 && (
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex gap-2 z-30 p-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className={`rounded-full transition-all duration-200 min-w-[8px] min-h-[8px] ${idx === currentIndex
                    ? 'bg-white w-2.5 h-2.5'
                    : 'bg-white/50 w-2 h-2'
                    }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Big Heart Animation (Instagram/FB style) */}
          {showBigHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <i className="fas fa-heart text-white text-8xl drop-shadow-2xl animate-heart-pop"></i>
            </div>
          )}

          {/* Dismiss hint indicator */}
          {isDismissing && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white/90 text-xs px-3 py-1.5 rounded-full">
              Release to close
            </div>
          )}
        </div>

        {/* Mobile Bottom Actions - Twitter/X Style */}
        {post && (
          <div
            className={`absolute bottom-0 left-0 right-0 z-50 transition-all duration-200 ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Gradient overlay */}
            <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8">
              {/* Engagement stats row */}
              <div className="flex items-center gap-4 px-4 py-2 text-white/70 text-sm">
                {post.likesCount > 0 && (
                  <span><i className="fas fa-heart text-red-500 mr-1"></i>{post.likesCount}</span>
                )}
                {post.comments?.length > 0 && (
                  <span>{post.comments.length} comments</span>
                )}
              </div>

              {/* Action buttons row - Twitter/X style horizontal layout */}
              <div className="flex items-center justify-around px-4 py-3 border-t border-white/10">
                <button
                  className={`flex items-center gap-2 transition-colors p-3 min-w-[44px] min-h-[44px] ${isLiked ? 'text-red-500' : 'text-white/90 active:text-red-400'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(e);
                  }}
                  onTouchEnd={(e) => e.stopPropagation()}
                >
                  <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-xl`}></i>
                </button>
                <button
                  className="flex items-center gap-2 text-white/90 active:text-blue-400 transition-colors p-3 min-w-[44px] min-h-[44px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowComments(true);
                  }}
                  onTouchEnd={(e) => e.stopPropagation()}
                >
                  <i className="far fa-comment text-xl"></i>
                  {post.comments?.length > 0 && <span className="text-sm">{post.comments.length}</span>}
                </button>
                <button
                  className="flex items-center gap-2 text-white/90 active:text-green-400 transition-colors p-3 min-w-[44px] min-h-[44px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(e);
                  }}
                  onTouchEnd={(e) => e.stopPropagation()}
                >
                  <i className="fas fa-share text-xl"></i>
                </button>
                <button
                  className={`flex items-center gap-2 transition-colors p-3 min-w-[44px] min-h-[44px] ${isBookmarked ? 'text-blue-400' : 'text-white/90 active:text-blue-400'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookmark(e);
                  }}
                  onTouchEnd={(e) => e.stopPropagation()}
                >
                  <i className={`${isBookmarked ? 'fas' : 'far'} fa-bookmark text-xl`}></i>
                </button>
                <button
                  className="flex items-center gap-2 text-white/90 active:text-blue-400 transition-colors p-3 min-w-[44px] min-h-[44px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(e);
                  }}
                  onTouchEnd={(e) => e.stopPropagation()}
                >
                  <i className="fas fa-download text-xl"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comments Sheet - Slides up from bottom (Facebook/Instagram style) */}
        {showComments && (
          <div
            className="fixed inset-0 z-[60] flex flex-col justify-end"
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(false);
            }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
              className="relative bg-white dark:bg-slate-900 rounded-t-3xl max-h-[75vh] flex flex-col animate-slide-up"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="flex justify-center py-3 cursor-grab">
                <div className="w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full" />
              </div>

              {/* Comments header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Comments</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowComments(false);
                  }}
                  className="text-gray-500 dark:text-slate-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <i className="fas fa-times text-lg"></i>
                </button>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map(comment => (
                    <Comment
                      key={comment.id}
                      comment={comment}
                      onReply={onReply}
                      onLike={onLikeComment}
                      sessionUserId={sessionUserId}
                      currentUser={currentUser}
                      onDeleteComment={onDeleteComment}
                      postId={post.id}
                      onReport={onReport}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
                    <i className="far fa-comment-dots text-4xl mb-3"></i>
                    <p className="text-sm">No comments yet</p>
                    <p className="text-xs">Be the first to comment</p>
                  </div>
                )}
              </div>

              {/* Comment input */}
              <form
                onSubmit={(e) => {
                  e.stopPropagation();
                  handlePostComment(e);
                }}
                className="flex items-center gap-2 p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800"
                onClick={e => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2.5 border-none rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-blue-500 text-white px-5 py-2.5 rounded-full font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed active:bg-blue-600 transition-colors min-h-[44px]"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex w-full h-full">
        {/* Left Side: Image Viewer */}
        <div
          className="flex-1 relative flex items-center justify-center overflow-hidden bg-black min-h-0"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          {/* Top Bar Actions */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/50 to-transparent" onClick={e => e.stopPropagation()}>
            <div className="text-white/90 text-sm font-medium tracking-wide">
              {currentIndex + 1} / {images.length}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleZoomIn}
                className="text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                title="Zoom In"
              >
                <i className="fas fa-search-plus text-xl"></i>
              </button>
              <button
                onClick={handleZoomOut}
                className="text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                title="Zoom Out"
              >
                <i className="fas fa-search-minus text-xl"></i>
              </button>
              <button
                onClick={handleDownload}
                className="text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                title="Download"
              >
                <i className="fas fa-download text-xl"></i>
              </button>
              <button
                className="text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                onClick={onClose}
                aria-label="Close"
              >
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>
          </div>

          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 text-white/80 hover:text-white text-5xl focus:outline-none z-50 transition-colors p-2 hover:bg-black/20 rounded-full h-16 w-16 flex items-center justify-center"
                onClick={showPrev}
                aria-label="Previous image"
              >
                &#8249;
              </button>
              <button
                className="absolute right-4 text-white/80 hover:text-white text-5xl focus:outline-none z-50 transition-colors p-2 hover:bg-black/20 rounded-full h-16 w-16 flex items-center justify-center"
                onClick={showNext}
                aria-label="Next image"
              >
                &#8250;
              </button>
            </>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
            </div>
          )}

          <img
            ref={imageRef}
            src={images[currentIndex]}
            alt={`Full screen view ${currentIndex + 1}`}
            onLoad={() => setIsLoading(false)}
            className={`max-h-full max-w-full object-contain select-none shadow-2xl transition-transform duration-200 ease-out ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
            onMouseDown={handleMouseDown}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Big Heart Animation */}
          {showBigHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <i className="fas fa-heart text-white/90 text-9xl drop-shadow-2xl animate-heart-pop"></i>
            </div>
          )}
        </div>

        {/* Right Side: Comments & Details */}
        {post && (
          <div className="flex w-96 bg-white dark:bg-slate-800 h-full flex-col border-l border-gray-200 dark:border-slate-700 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <Link href={`/profile/${post.author?.id || ''}`} className="flex-shrink-0">
                  <img
                    src={post.author?.imageUrl || `https://placehold.co/40x40/A78BFA/ffffff?text=${post.author?.name ? post.author.name[0].toUpperCase() : 'U'}`}
                    alt={post.author?.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </Link>
                <div className="min-w-0">
                  <Link href={`/profile/${post.author?.id || ''}`} className="font-semibold text-gray-900 dark:text-slate-100 hover:underline truncate block">
                    {post.author?.name}
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{formatTimestamp(post.createdAt)}</p>
                </div>
              </div>
              <Link
                href={`/dashboard?postId=${post.id}`}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap ml-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full transition-colors"
                onClick={onClose}
              >
                View Full Post
              </Link>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {post.content && (
                <p className="text-gray-800 dark:text-slate-200 mb-4 whitespace-pre-line">{post.content}</p>
              )}
              <div className="space-y-4">
                {post.comments && post.comments.map(comment => (
                  <Comment
                    key={comment.id}
                    comment={comment}
                    onReply={onReply}
                    onLike={onLikeComment}
                    sessionUserId={sessionUserId}
                    currentUser={currentUser}
                    onDeleteComment={onDeleteComment}
                    postId={post.id}
                    onReport={onReport}
                  />
                ))}
              </div>
            </div>

            {/* Footer Input */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-4 py-2.5 border-none rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="text-blue-600 hover:text-blue-700 disabled:opacity-50 font-semibold text-sm"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes heart-pop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        .animate-heart-pop {
          animation: heart-pop 0.8s ease-out forwards;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </div>
  );
}
