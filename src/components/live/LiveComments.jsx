// src/components/live/LiveComments.jsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function LiveComments({ streamId, isExpanded, onToggle, sessionUserId }) {
	const [newComment, setNewComment] = useState('');
	const commentsEndRef = useRef(null);
	const queryClient = useQueryClient();

	// Fetch comments - in a real app, you'd use WebSockets for real-time updates
	const { data: commentsData } = useQuery({
		queryKey: ['liveComments', streamId],
		queryFn: async () => {
			// This would be a real API call in production
			return { comments: [] };
		},
		refetchInterval: 2000,
		enabled: isExpanded,
	});

	const comments = commentsData?.comments || [];

	// Add comment mutation
	const addCommentMutation = useMutation({
		mutationFn: async (content) => {
			// In production, this would be an API call
			// For now, we'll just simulate adding a comment
			return { success: true };
		},
		onSuccess: () => {
			setNewComment('');
			queryClient.invalidateQueries({ queryKey: ['liveComments', streamId] });
		},
	});

	// Auto-scroll to bottom when new comments arrive
	useEffect(() => {
		if (commentsEndRef.current) {
			commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	}, [comments.length]);

	const handleSubmit = (e) => {
		e.preventDefault();
		if (newComment.trim()) {
			addCommentMutation.mutate(newComment);
		}
	};

	return (
		<div className="h-full bg-gray-900 flex flex-col">
			{/* Header / Toggle */}
			<button
				onClick={onToggle}
				className="flex items-center justify-between p-4 border-b border-gray-800 md:pointer-events-none"
			>
				<div className="flex items-center space-x-2">
					<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
					</svg>
					<span className="text-white font-medium">Live Chat</span>
				</div>
				<svg
					className={`w-5 h-5 text-gray-400 md:hidden transition-transform ${isExpanded ? 'rotate-180' : ''}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
				</svg>
			</button>

			{/* Comments list */}
			{isExpanded && (
				<>
					<div className="flex-1 overflow-y-auto p-4 space-y-3">
						{comments.length === 0 ? (
							<div className="text-center py-8">
								<p className="text-gray-500 text-sm">No comments yet</p>
								<p className="text-gray-600 text-xs mt-1">Be the first to say something!</p>
							</div>
						) : (
							comments.map((comment) => (
								<CommentBubble key={comment.id} comment={comment} />
							))
						)}
						<div ref={commentsEndRef} />
					</div>

					{/* Input */}
					<form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
						<div className="flex items-center space-x-3">
							<input
								type="text"
								value={newComment}
								onChange={(e) => setNewComment(e.target.value)}
								placeholder="Say something..."
								className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-500"
							/>
							<button
								type="submit"
								disabled={!newComment.trim() || addCommentMutation.isPending}
								className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center disabled:opacity-50"
							>
								<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
								</svg>
							</button>
						</div>
					</form>
				</>
			)}
		</div>
	);
}

function CommentBubble({ comment }) {
	return (
		<div className="flex items-start space-x-2 animate-slide-up">
			<img
				src={comment.user?.imageUrl || `https://placehold.co/32x32/A78BFA/ffffff?text=U`}
				alt=""
				className="w-8 h-8 rounded-full object-cover flex-shrink-0"
			/>
			<div className="flex-1 min-w-0">
				<div className="bg-gray-800 rounded-2xl rounded-tl-sm px-3 py-2">
					<p className="text-pink-400 text-xs font-medium">{comment.user?.name || 'User'}</p>
					<p className="text-white text-sm break-words">{comment.content}</p>
				</div>
			</div>

			<style jsx>{`
				@keyframes slide-up {
					from {
						opacity: 0;
						transform: translateY(10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				.animate-slide-up {
					animation: slide-up 0.2s ease-out;
				}
			`}</style>
		</div>
	);
}
