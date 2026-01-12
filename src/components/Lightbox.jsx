"use client";

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Comment } from './Comment';
import { formatTimestamp } from '../lib/utils';

export default function Lightbox({ images = [], initialIndex = 0, isOpen, onClose, post, sessionUserId, onLikeComment, onReply, onDeleteComment, onAddComment }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialIndex]);

  // Reset zoom/pan when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') showPrev(e);
      if (e.key === 'ArrowRight') showNext(e);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, currentIndex]);

  if (!isOpen || !images || images.length === 0) return null;

  const showPrev = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const showNext = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

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

  return (
    <div
      className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex items-center justify-center animate-fade-in backdrop-blur-sm overflow-hidden font-sans"
      onClick={onClose}
    >
      <div className="flex w-full h-full">
        {/* Left Side: Image Viewer */}
        <div
          className="flex-1 relative flex items-center justify-center overflow-hidden bg-black"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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

          <img
            ref={imageRef}
            src={images[currentIndex]}
            alt={`Full screen view ${currentIndex + 1}`}
            className="max-h-full max-w-full object-contain select-none shadow-2xl transition-transform duration-200 ease-out"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
            onMouseDown={handleMouseDown}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Right Side: Comments & Details (Hidden on mobile, visible on md+) */}
        {post && (
          <div className="hidden md:flex w-96 bg-white dark:bg-slate-800 h-full flex-col border-l border-gray-200 dark:border-slate-700 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center space-x-3">
              <Link href={`/profile/${post.author?.id || ''}`} className="flex-shrink-0">
                <img
                  src={post.author?.imageUrl || `https://placehold.co/40x40/A78BFA/ffffff?text=${post.author?.name ? post.author.name[0].toUpperCase() : 'U'}`}
                  alt={post.author?.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              </Link>
              <div>
                <Link href={`/profile/${post.author?.id || ''}`} className="font-semibold text-gray-900 dark:text-slate-100 hover:underline">
                  {post.author?.name}
                </Link>
                <p className="text-xs text-gray-500 dark:text-slate-400">{formatTimestamp(post.createdAt)}</p>
              </div>
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
                    onDeleteComment={onDeleteComment}
                    postId={post.id}
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
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm"
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
			`}</style>
    </div>
  );
}