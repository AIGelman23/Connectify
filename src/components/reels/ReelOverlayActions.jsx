// src/components/reels/ReelOverlayActions.jsx
"use client";

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function ReelOverlayActions({
	reel,
	isLiked,
	likesCount,
	onLikeToggle,
	onOpenComments,
	onShare,
	formatCount,
}) {
	const queryClient = useQueryClient();
	const [isSaved, setIsSaved] = useState(reel.isSaved);

	const saveMutation = useMutation({
		mutationFn: async ({ action }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					postId: reel.id,
					action: action,
				}),
			});
			if (!res.ok) throw new Error('Failed to save');
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['reels'] });
		},
	});

	const handleSaveToggle = () => {
		if (isSaved) {
			setIsSaved(false);
			saveMutation.mutate({ action: 'unsave' });
		} else {
			setIsSaved(true);
			saveMutation.mutate({ action: 'save' });
		}
	};

	return (
		<div className="absolute right-3 bottom-32 flex flex-col items-center space-y-5 z-10">
			{/* Like button */}
			<button
				onClick={onLikeToggle}
				className="flex flex-col items-center"
			>
				<div className={`w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90 ${isLiked ? 'text-red-500' : 'text-white'}`}>
					<svg
						className="w-7 h-7"
						fill={isLiked ? 'currentColor' : 'none'}
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
						/>
					</svg>
				</div>
				<span className="text-white text-xs mt-1 font-medium">
					{formatCount(likesCount)}
				</span>
			</button>

			{/* Comments button */}
			<button
				onClick={onOpenComments}
				className="flex flex-col items-center"
			>
				<div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white">
					<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					</svg>
				</div>
				<span className="text-white text-xs mt-1 font-medium">
					{formatCount(reel.commentsCount)}
				</span>
			</button>

			{/* Save button */}
			<button
				onClick={handleSaveToggle}
				className="flex flex-col items-center"
			>
				<div className={`w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90 ${isSaved ? 'text-yellow-400' : 'text-white'}`}>
					<svg
						className="w-7 h-7"
						fill={isSaved ? 'currentColor' : 'none'}
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
						/>
					</svg>
				</div>
				<span className="text-white text-xs mt-1 font-medium">Save</span>
			</button>

			{/* Share button */}
			<button
				onClick={onShare}
				className="flex flex-col items-center"
			>
				<div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white">
					<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
						/>
					</svg>
				</div>
				<span className="text-white text-xs mt-1 font-medium">
					{formatCount(reel.sharesCount)}
				</span>
			</button>

			{/* More options */}
			<button className="flex flex-col items-center">
				<div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white">
					<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
						/>
					</svg>
				</div>
			</button>

			{/* Spinning record (for sound) */}
			<div className="w-12 h-12 rounded-full border-2 border-white/30 overflow-hidden animate-spin-slow">
				<img
					src={reel.author.imageUrl}
					alt=""
					className="w-full h-full object-cover"
				/>
			</div>

			<style jsx>{`
				@keyframes spin-slow {
					from {
						transform: rotate(0deg);
					}
					to {
						transform: rotate(360deg);
					}
				}
				.animate-spin-slow {
					animation: spin-slow 8s linear infinite;
				}
			`}</style>
		</div>
	);
}
