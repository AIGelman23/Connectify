// src/components/reels/ReelsFeed.jsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import ReelCard from './ReelCard';
import ReelCommentsSheet from './ReelCommentsSheet';

export default function ReelsFeed({ sessionUserId, initialReelId }) {
	const [activeIndex, setActiveIndex] = useState(0);
	const [showComments, setShowComments] = useState(false);
	const [selectedReelId, setSelectedReelId] = useState(null);
	const [feedType, setFeedType] = useState('foryou'); // 'foryou' or 'following'
	const [isInitialized, setIsInitialized] = useState(false);
	const containerRef = useRef(null);
	const reelRefs = useRef([]);

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
		refetch,
	} = useInfiniteQuery({
		queryKey: ['reels', feedType, initialReelId],
		queryFn: async ({ pageParam = 0 }) => {
			const params = new URLSearchParams({
				take: '5',
				skip: String(pageParam),
				feed: feedType,
			});
			if (initialReelId && pageParam === 0) {
				params.set('startFrom', initialReelId);
			}
			const res = await fetch(`/api/reels?${params}`);
			if (!res.ok) throw new Error('Failed to fetch reels');
			return res.json();
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) => {
			if (lastPage.hasMore) {
				return allPages.reduce((total, page) => total + page.reels.length, 0);
			}
			return undefined;
		},
	});

	const reels = data?.pages?.flatMap(page => page.reels) || [];

	// Mark as initialized once we have reels (allows first video to play)
	useEffect(() => {
		if (reels.length > 0 && !isInitialized) {
			// Small delay to ensure DOM is ready
			setTimeout(() => {
				setIsInitialized(true);
				// Force a re-render of active index to trigger video play
				setActiveIndex(0);
			}, 100);
		}
	}, [reels.length, isInitialized]);

	// Reset to first reel when feed type changes
	const handleFeedChange = (newFeedType) => {
		if (newFeedType !== feedType) {
			setFeedType(newFeedType);
			setActiveIndex(0);
			setIsInitialized(false);
			// Scroll to top
			if (containerRef.current) {
				containerRef.current.scrollTo({ top: 0, behavior: 'instant' });
			}
		}
	};

	// Handle scroll snapping with improved TikTok-like behavior
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		let scrollTimeout;
		const handleScroll = () => {
			clearTimeout(scrollTimeout);

			// Debounce scroll handling for better performance
			scrollTimeout = setTimeout(() => {
				const scrollTop = container.scrollTop;
				const reelHeight = container.clientHeight;
				const newIndex = Math.round(scrollTop / reelHeight);

				if (newIndex !== activeIndex && newIndex >= 0 && newIndex < reels.length) {
					setActiveIndex(newIndex);

					// Smooth snap to exact position
					const targetScroll = newIndex * reelHeight;
					if (Math.abs(scrollTop - targetScroll) > 10) {
						container.scrollTo({
							top: targetScroll,
							behavior: 'smooth',
						});
					}
				}

				// Load more when near the end (TikTok-style prefetch)
				if (
					hasNextPage &&
					!isFetchingNextPage &&
					newIndex >= reels.length - 2
				) {
					fetchNextPage();
				}
			}, 100);
		};

		container.addEventListener('scroll', handleScroll, { passive: true });
		return () => {
			container.removeEventListener('scroll', handleScroll);
			clearTimeout(scrollTimeout);
		};
	}, [activeIndex, reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

	// Keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (showComments) return;

			if (e.key === 'ArrowDown' || e.key === 'j') {
				e.preventDefault();
				navigateToReel(activeIndex + 1);
			} else if (e.key === 'ArrowUp' || e.key === 'k') {
				e.preventDefault();
				navigateToReel(activeIndex - 1);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [activeIndex, showComments, reels.length]);

	const navigateToReel = useCallback((index) => {
		if (index < 0 || index >= reels.length) return;

		const container = containerRef.current;
		if (!container) return;

		const targetScroll = index * container.clientHeight;
		container.scrollTo({
			top: targetScroll,
			behavior: 'smooth',
		});
	}, [reels.length]);

	const handleOpenComments = useCallback((reelId) => {
		setSelectedReelId(reelId);
		setShowComments(true);
	}, []);

	const handleCloseComments = useCallback(() => {
		setShowComments(false);
		setSelectedReelId(null);
	}, []);

	if (isLoading) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-black">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-black text-white">
				<p>Failed to load reels. Please try again.</p>
			</div>
		);
	}

	if (reels.length === 0) {
		return (
			<div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white">
				<svg className="w-20 h-20 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
				</svg>
				<p className="text-xl font-medium mb-2">No reels yet</p>
				<p className="text-gray-400">Be the first to share a video!</p>
			</div>
		);
	}

	return (
		<>
			{/* Feed Type Toggle - Fixed at top */}
			<div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-safe-top">
				<div className="flex gap-4 pt-4 pb-2 px-4">
					<button
						onClick={() => handleFeedChange('following')}
						className={`text-lg font-semibold transition-all ${
							feedType === 'following'
								? 'text-white'
								: 'text-white/60 hover:text-white/80'
						}`}
					>
						Following
					</button>
					<span className="text-white/40">|</span>
					<button
						onClick={() => handleFeedChange('foryou')}
						className={`text-lg font-semibold transition-all ${
							feedType === 'foryou'
								? 'text-white'
								: 'text-white/60 hover:text-white/80'
						}`}
					>
						For You
					</button>
				</div>
			</div>

			<div
				ref={containerRef}
				className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
				style={{
					scrollSnapType: 'y mandatory',
					WebkitOverflowScrolling: 'touch',
					scrollBehavior: 'smooth',
				}}
			>
				{reels.map((reel, index) => (
					<div
						key={reel.id}
						ref={(el) => (reelRefs.current[index] = el)}
						className="h-screen w-full snap-start snap-always"
						style={{ scrollSnapAlign: 'start' }}
					>
						<ReelCard
							reel={reel}
							isActive={isInitialized && index === activeIndex}
							sessionUserId={sessionUserId}
							onOpenComments={() => handleOpenComments(reel.id)}
						/>
					</div>
				))}

				{/* Loading indicator */}
				{isFetchingNextPage && (
					<div className="h-20 flex items-center justify-center">
						<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
					</div>
				)}
			</div>

			{/* Comments Sheet */}
			<ReelCommentsSheet
				isOpen={showComments}
				onClose={handleCloseComments}
				reelId={selectedReelId}
				sessionUserId={sessionUserId}
			/>

			<style jsx global>{`
				.scrollbar-hide {
					-ms-overflow-style: none;
					scrollbar-width: none;
				}
				.scrollbar-hide::-webkit-scrollbar {
					display: none;
				}
				.pt-safe-top {
					padding-top: env(safe-area-inset-top, 0);
				}
			`}</style>
		</>
	);
}
