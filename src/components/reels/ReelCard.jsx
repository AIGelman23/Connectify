// src/components/reels/ReelCard.jsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import ReelOverlayActions from './ReelOverlayActions';

export default function ReelCard({ reel, isActive, sessionUserId, onOpenComments }) {
	const router = useRouter();
	const videoRef = useRef(null);
	const queryClient = useQueryClient();
	const [isPlaying, setIsPlaying] = useState(false);
	const [isMuted, setIsMuted] = useState(true);
	const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
	const [progress, setProgress] = useState(0);
	const [isLiked, setIsLiked] = useState(reel.isLiked);
	const [likesCount, setLikesCount] = useState(reel.likesCount);
	const lastTapRef = useRef(0);
	const watchTimeRef = useRef(0);
	const viewTrackedRef = useRef(false);

	// Like mutation
	const likeMutation = useMutation({
		mutationFn: async ({ action }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					postId: reel.id,
					action: action,
					reactionType: 'LIKE',
				}),
			});
			if (!res.ok) throw new Error('Failed to update like');
			return res.json();
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['reels'] });
		},
	});

	// Track view
	const trackView = useCallback(async (watchTime, completed = false) => {
		if (viewTrackedRef.current && !completed) return;

		try {
			await fetch(`/api/reels/${reel.id}/view`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ watchTime, completed }),
			});
			viewTrackedRef.current = true;
		} catch (err) {
			console.error('Failed to track view:', err);
		}
	}, [reel.id]);

	// Handle play/pause based on visibility (TikTok-like autoplay)
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		if (isActive) {
			// TikTok-style: always muted autoplay
			video.muted = true;
			setIsMuted(true);
			
			const playPromise = video.play();
			if (playPromise !== undefined) {
				playPromise
					.then(() => {
						setIsPlaying(true);
						// Track view after 2 seconds
						const viewTimer = setTimeout(() => {
							trackView(2000);
						}, 2000);
						return () => clearTimeout(viewTimer);
					})
					.catch(() => {
						// Autoplay was prevented, try again after user interaction
						setIsPlaying(false);
					});
			}
		} else {
			video.pause();
			setIsPlaying(false);
			setProgress(0);
			watchTimeRef.current = 0;
			viewTrackedRef.current = false;
		}
	}, [isActive, trackView]);

	// Progress tracking
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleTimeUpdate = () => {
			const progressPercent = (video.currentTime / video.duration) * 100;
			setProgress(progressPercent);
			watchTimeRef.current = video.currentTime * 1000;
		};

		const handleEnded = () => {
			trackView(watchTimeRef.current, true);
			video.currentTime = 0;
			video.play();
		};

		video.addEventListener('timeupdate', handleTimeUpdate);
		video.addEventListener('ended', handleEnded);

		return () => {
			video.removeEventListener('timeupdate', handleTimeUpdate);
			video.removeEventListener('ended', handleEnded);
		};
	}, [trackView]);

	const togglePlayPause = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;

		if (video.paused) {
			video.play();
			setIsPlaying(true);
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
		const shareUrl = `${window.location.origin}/reels/${reel.id}`;

		if (navigator.share) {
			try {
				await navigator.share({
					title: reel.content || 'Check out this reel!',
					url: shareUrl,
				});
			} catch (err) {
				if (err.name !== 'AbortError') {
					console.error('Share failed:', err);
				}
			}
		} else {
			try {
				await navigator.clipboard.writeText(shareUrl);
				alert('Link copied to clipboard!');
			} catch (err) {
				console.error('Failed to copy:', err);
			}
		}
	}, [reel]);

	const formatCount = (count) => {
		if (count >= 1000000) {
			return (count / 1000000).toFixed(1) + 'M';
		}
		if (count >= 1000) {
			return (count / 1000).toFixed(1) + 'K';
		}
		return count.toString();
	};

	return (
		<div className="relative h-full w-full bg-black overflow-hidden">
			{/* Video - TikTok-style full-screen */}
			<video
				ref={videoRef}
				src={reel.videoUrl}
				className="absolute inset-0 w-full h-full object-cover"
				loop
				muted={isMuted}
				playsInline
				preload="auto"
				poster={reel.thumbnailUrl}
				onClick={handleDoubleTap}
				style={{
					transition: 'opacity 0.3s ease-in-out',
				}}
			/>

			{/* Gradient overlays */}
			<div className="absolute inset-0 pointer-events-none">
				<div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
				<div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
			</div>

			{/* Double tap heart animation */}
			{showDoubleTapHeart && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
					<svg
						className="w-32 h-32 text-white animate-ping"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
					</svg>
				</div>
			)}

			{/* Play/Pause indicator */}
			{!isPlaying && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
					<div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center">
						<svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
					</div>
				</div>
			)}

			{/* Progress bar */}
			<div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
				<div
					className="h-full bg-white transition-all duration-100"
					style={{ width: `${progress}%` }}
				/>
			</div>

			{/* Mute button */}
			<button
				onClick={toggleMute}
				className="absolute top-16 right-4 z-10 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center"
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
				{/* Author */}
				<div
					className="flex items-center mb-3 cursor-pointer"
					onClick={() => router.push(`/profile/${reel.author.id}`)}
				>
					<img
						src={reel.author.imageUrl}
						alt={reel.author.name}
						className="w-10 h-10 rounded-full border-2 border-white object-cover"
					/>
					<div className="ml-3">
						<p className="text-white font-semibold text-sm">{reel.author.name}</p>
						{reel.author.headline && (
							<p className="text-white/70 text-xs truncate max-w-[200px]">{reel.author.headline}</p>
						)}
					</div>
					<button className="ml-3 px-3 py-1 border border-white rounded-md text-white text-xs font-medium hover:bg-white/20 transition-colors">
						Follow
					</button>
				</div>

				{/* Caption */}
				{reel.content && (
					<p className="text-white text-sm leading-relaxed line-clamp-3">
						{reel.content}
					</p>
				)}

				{/* Sound info */}
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
			<ReelOverlayActions
				reel={reel}
				isLiked={isLiked}
				likesCount={likesCount}
				onLikeToggle={handleLikeToggle}
				onOpenComments={onOpenComments}
				onShare={handleShare}
				formatCount={formatCount}
			/>

			{/* Views count */}
			<div className="absolute bottom-4 left-4 text-white/70 text-xs flex items-center">
				<svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
				</svg>
				{formatCount(reel.viewsCount)} views
			</div>
		</div>
	);
}
