// src/components/reels/SingleReelViewer.jsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import ReelCommentsSheet from './ReelCommentsSheet';

export default function SingleReelViewer({ reelId, sessionUserId }) {
  const router = useRouter();
  const videoRef = useRef(null);
  const queryClient = useQueryClient();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [hasAttemptedPlay, setHasAttemptedPlay] = useState(false);
  const [showTapToPlay, setShowTapToPlay] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  
  const lastTapRef = useRef(0);
  const viewTrackedRef = useRef(false);
  const playAttemptTimeoutRef = useRef(null);

  // Fetch single reel
  const { data, isLoading, error } = useQuery({
    queryKey: ['single-reel', reelId],
    queryFn: async () => {
      const res = await fetch(`/api/reels/${reelId}`);
      if (!res.ok) throw new Error('Failed to fetch reel');
      return res.json();
    },
    enabled: !!reelId,
  });

  const reel = data?.reel;

  // Like state
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    if (reel) {
      setIsLiked(reel.isLiked);
      setLikesCount(reel.likesCount || reel._count?.likes || 0);
    }
  }, [reel]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async ({ action }) => {
      const res = await fetch('/api/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: reelId,
          action: action,
          reactionType: 'LIKE',
        }),
      });
      if (!res.ok) throw new Error('Failed to update like');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['single-reel', reelId] });
    },
  });

  // Track view
  const trackView = useCallback(async () => {
    if (viewTrackedRef.current) return;
    try {
      const res = await fetch(`/api/reels/${reelId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchTime: 2000, completed: false }),
      });
      const data = await res.json();
      viewTrackedRef.current = true;
      
      // Update view count in real-time if this was a new view
      if (data.isNewView && data.viewsCount) {
        queryClient.setQueryData(['single-reel', reelId], (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            reel: {
              ...oldData.reel,
              viewsCount: data.viewsCount,
            },
          };
        });
      }
    } catch (err) {
      console.error('Failed to track view:', err);
    }
  }, [reelId, queryClient]);

  // Play video function with retry logic
  const playVideo = useCallback(async (isUserInitiated = false) => {
    const video = videoRef.current;
    if (!video || !reel?.videoUrl) return;

    try {
      // Ensure video is muted for autoplay
      video.muted = true;
      setIsMuted(true);
      
      // Try to play
      await video.play();
      setIsPlaying(true);
      setHasAttemptedPlay(true);
      setShowTapToPlay(false);
      setAutoplayBlocked(false);
      
      // Track view after 2 seconds
      setTimeout(trackView, 2000);
    } catch (err) {
      console.warn('Play failed:', err.message);
      setIsPlaying(false);
      setHasAttemptedPlay(true);
      
      // If autoplay was blocked (not user initiated), show the tap to play overlay
      if (!isUserInitiated && err.name === 'NotAllowedError') {
        setAutoplayBlocked(true);
        setShowTapToPlay(true);
      } else if (!hasAttemptedPlay) {
        // Retry after a short delay for other errors
        playAttemptTimeoutRef.current = setTimeout(() => {
          playVideo(isUserInitiated);
        }, 500);
      }
    }
  }, [reel?.videoUrl, trackView, hasAttemptedPlay]);

  // Attempt to play when video is ready
  useEffect(() => {
    if (videoLoaded && reel && !isPlaying && !hasAttemptedPlay) {
      playVideo();
    }
  }, [videoLoaded, reel, isPlaying, hasAttemptedPlay, playVideo]);

  // Also try to play when reel data first loads
  useEffect(() => {
    if (reel?.videoUrl && videoRef.current) {
      // Reset states when reel changes
      setVideoLoaded(false);
      setHasAttemptedPlay(false);
      setIsPlaying(false);
      
      // Load the video
      videoRef.current.load();
    }
    
    return () => {
      if (playAttemptTimeoutRef.current) {
        clearTimeout(playAttemptTimeoutRef.current);
      }
    };
  }, [reel?.videoUrl]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(console.warn);
    };

    const handleCanPlay = () => {
      console.log('Video can play');
      setVideoLoaded(true);
      setVideoError(false);
      // Try to play immediately when video is ready
      if (!isPlaying && !autoplayBlocked) {
        video.muted = true;
        video.play()
          .then(() => {
            setIsPlaying(true);
            setHasAttemptedPlay(true);
            setShowTapToPlay(false);
            setTimeout(trackView, 2000);
          })
          .catch((err) => {
            console.warn('Autoplay on canplay failed:', err.message);
            if (err.name === 'NotAllowedError') {
              setAutoplayBlocked(true);
              setShowTapToPlay(true);
            }
          });
      }
    };

    const handleError = (e) => {
      console.error('Video error:', e);
      setVideoError(true);
      setVideoLoaded(false);
    };

    const handleLoadedData = () => {
      console.log('Video loaded data');
      setVideoLoaded(true);
    };

    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded');
      // Try to play as soon as metadata is available
      if (!autoplayBlocked) {
        video.muted = true;
        video.play()
          .then(() => {
            setIsPlaying(true);
            setHasAttemptedPlay(true);
            setVideoLoaded(true);
            setShowTapToPlay(false);
            setTimeout(trackView, 2000);
          })
          .catch((err) => {
            console.warn('Autoplay on metadata failed:', err.message);
            if (err.name === 'NotAllowedError') {
              setAutoplayBlocked(true);
              setShowTapToPlay(true);
            }
          });
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [isPlaying, trackView, autoplayBlocked]);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play()
        .then(() => {
          setIsPlaying(true);
          setShowTapToPlay(false);
          setAutoplayBlocked(false);
        })
        .catch(console.warn);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap - like
      if (!isLiked) {
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
        likeMutation.mutate({ action: 'react' });
      }
      setShowDoubleTapHeart(true);
      setTimeout(() => setShowDoubleTapHeart(false), 800);
    } else {
      // Single tap - toggle play/pause
      togglePlayPause();
    }
    lastTapRef.current = now;
  }, [isLiked, likeMutation, togglePlayPause]);

  const handleLikeToggle = useCallback(() => {
    if (isLiked) {
      setIsLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
      likeMutation.mutate({ action: 'unreact' });
    } else {
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
      likeMutation.mutate({ action: 'react' });
    }
  }, [isLiked, likeMutation]);

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/reels/${reelId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: reel?.content || 'Check out this reel!',
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Share failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  }, [reelId, reel]);

  const formatCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !reel) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white">
        <svg className="w-20 h-20 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p className="text-xl font-medium mb-2">Reel not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-6 py-2 bg-white/20 rounded-lg hover:bg-white/30"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="relative h-screen w-full bg-black overflow-hidden">
        {/* Video */}
        <video
          ref={videoRef}
          src={reel.videoUrl}
          className="absolute inset-0 w-full h-full object-contain"
          loop
          muted
          autoPlay
          playsInline
          webkit-playsinline="true"
          preload="auto"
          poster={reel.thumbnailUrl}
          onClick={handleDoubleTap}
          style={{ opacity: videoLoaded ? 1 : 0.7 }}
        />

        {/* Loading indicator */}
        {!videoLoaded && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        )}

        {/* Video error state */}
        {videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-white text-sm">Unable to load video</p>
            <button 
              onClick={() => {
                setVideoError(false);
                videoRef.current?.load();
              }}
              className="mt-3 px-4 py-2 bg-white/20 rounded-lg text-white text-sm hover:bg-white/30"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Tap to Play overlay - shown when autoplay is blocked */}
        {showTapToPlay && !videoError && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 cursor-pointer z-20"
            onClick={togglePlayPause}
          >
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 hover:bg-white/30 transition-all transform hover:scale-105">
              <svg className="w-12 h-12 text-white ml-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-white text-lg font-medium">Tap to Play</p>
            <p className="text-white/60 text-sm mt-1">Your browser blocked autoplay</p>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
        </div>

        {/* Double tap heart animation */}
        {showDoubleTapHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg className="w-32 h-32 text-white animate-ping" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        )}

        {/* Play/Pause indicator - only show when paused by user, not when autoplay blocked */}
        {!isPlaying && !videoError && videoLoaded && !showTapToPlay && (
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={togglePlayPause}
          >
            <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center hover:bg-black/60 transition-colors">
              <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-50 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Mute button */}
        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center"
        >
          {isMuted ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>

        {/* Author info and caption - bottom left */}
        <div className="absolute bottom-20 left-4 right-20 z-10">
          <div
            className="flex items-center mb-3 cursor-pointer"
            onClick={() => router.push(`/profile/${reel.author?.id || reel.authorId}`)}
          >
            <img
              src={reel.author?.imageUrl || reel.author?.image || reel.author?.profile?.profilePictureUrl || '/default-avatar.png'}
              alt={reel.author?.name}
              className="w-10 h-10 rounded-full border-2 border-white object-cover"
            />
            <div className="ml-3">
              <p className="text-white font-semibold text-sm">{reel.author?.name}</p>
              {reel.author?.headline && (
                <p className="text-white/70 text-xs truncate max-w-[200px]">{reel.author?.headline}</p>
              )}
            </div>
          </div>

          {reel.content && (
            <p className="text-white text-sm leading-relaxed line-clamp-3">{reel.content}</p>
          )}

          {reel.sound && (
            <div className="flex items-center mt-2 text-white/80 text-xs">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              <span className="truncate">{reel.sound.name}</span>
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10">
          {/* Like */}
          <button onClick={handleLikeToggle} className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLiked ? 'bg-red-500' : 'bg-black/40'}`}>
              <svg className="w-6 h-6 text-white" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-white text-xs mt-1 font-medium">{formatCount(likesCount)}</span>
          </button>

          {/* Comment */}
          <button onClick={() => setShowComments(true)} className="flex flex-col items-center">
            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-white text-xs mt-1 font-medium">{formatCount(reel.commentsCount || reel._count?.comments || 0)}</span>
          </button>

          {/* Share */}
          <button onClick={handleShare} className="flex flex-col items-center">
            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <span className="text-white text-xs mt-1 font-medium">Share</span>
          </button>
        </div>

        {/* Views count */}
        <div className="absolute bottom-4 left-4 text-white/70 text-xs flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {formatCount(reel.viewsCount || 0)} views
        </div>
      </div>

      {/* Comments Sheet */}
      <ReelCommentsSheet
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        reelId={reelId}
        sessionUserId={sessionUserId}
      />
    </>
  );
}
