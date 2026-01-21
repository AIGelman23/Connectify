// src/components/reels/ReelCommentsSheet.jsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function ReelCommentsSheet({ isOpen, onClose, reelId, sessionUserId }) {
	const [newComment, setNewComment] = useState('');
	const [replyingTo, setReplyingTo] = useState(null);
	const inputRef = useRef(null);
	const sheetRef = useRef(null);
	const queryClient = useQueryClient();

	// Fetch comments for this reel
	const { data: commentsData, isLoading } = useQuery({
		queryKey: ['reelComments', reelId],
		queryFn: async () => {
			const res = await fetch(`/api/posts/${reelId}/comments`);
			if (!res.ok) throw new Error('Failed to fetch comments');
			const data = await res.json();
			return data.comments || [];
		},
		enabled: isOpen && !!reelId,
	});

	const comments = commentsData || [];

	// Add comment mutation
	const addCommentMutation = useMutation({
		mutationFn: async ({ content, parentCommentId }) => {
			const body = {
				postId: reelId,
				action: parentCommentId ? 'reply_comment' : 'comment',
				...(parentCommentId ? { commentId: parentCommentId, commentContent: content } : { comment: content }),
			};

			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (!res.ok) throw new Error('Failed to add comment');
			return res.json();
		},
		onSuccess: () => {
			setNewComment('');
			setReplyingTo(null);
			queryClient.invalidateQueries({ queryKey: ['reelComments', reelId] });
			queryClient.invalidateQueries({ queryKey: ['reels'] });
		},
	});

	// Like comment mutation
	const likeCommentMutation = useMutation({
		mutationFn: async ({ commentId, isLiked }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					commentId,
					action: isLiked ? 'unlike_comment' : 'like_comment',
				}),
			});

			if (!res.ok) throw new Error('Failed to like comment');
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['reelComments', reelId] });
		},
	});

	// Handle swipe down to close
	useEffect(() => {
		if (!isOpen) return;

		const sheet = sheetRef.current;
		if (!sheet) return;

		let startY = 0;
		let currentY = 0;

		const handleTouchStart = (e) => {
			startY = e.touches[0].clientY;
		};

		const handleTouchMove = (e) => {
			currentY = e.touches[0].clientY;
			const diff = currentY - startY;
			if (diff > 0) {
				sheet.style.transform = `translateY(${diff}px)`;
			}
		};

		const handleTouchEnd = () => {
			const diff = currentY - startY;
			if (diff > 100) {
				onClose();
			}
			sheet.style.transform = '';
			startY = 0;
			currentY = 0;
		};

		sheet.addEventListener('touchstart', handleTouchStart);
		sheet.addEventListener('touchmove', handleTouchMove);
		sheet.addEventListener('touchend', handleTouchEnd);

		return () => {
			sheet.removeEventListener('touchstart', handleTouchStart);
			sheet.removeEventListener('touchmove', handleTouchMove);
			sheet.removeEventListener('touchend', handleTouchEnd);
		};
	}, [isOpen, onClose]);

	// Focus input when replying
	useEffect(() => {
		if (replyingTo && inputRef.current) {
			inputRef.current.focus();
		}
	}, [replyingTo]);

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!newComment.trim()) return;

		addCommentMutation.mutate({
			content: newComment,
			parentCommentId: replyingTo?.id,
		});
	};

	const handleReply = (comment) => {
		setReplyingTo(comment);
	};

	const cancelReply = () => {
		setReplyingTo(null);
	};

	const formatTimeAgo = (dateString) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffSeconds = Math.floor((now - date) / 1000);

		if (diffSeconds < 60) return 'now';
		if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
		if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
		if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d`;
		return `${Math.floor(diffSeconds / 604800)}w`;
	};

	if (!isOpen) return null;

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50 z-50"
				onClick={onClose}
			/>

			{/* Sheet */}
			<div
				ref={sheetRef}
				className="fixed bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl z-50 max-h-[70vh] flex flex-col transition-transform"
			>
				{/* Handle */}
				<div className="flex justify-center pt-3 pb-2">
					<div className="w-10 h-1 bg-gray-600 rounded-full" />
				</div>

				{/* Header */}
				<div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
					<h3 className="text-white font-semibold text-lg">Comments</h3>
					<button onClick={onClose} className="text-gray-400 p-1">
						<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Comments list */}
				<div className="flex-1 overflow-y-auto px-4 py-3">
					{isLoading ? (
						<div className="flex justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white" />
						</div>
					) : comments.length === 0 ? (
						<div className="text-center py-12">
							<p className="text-gray-400 text-lg mb-2">No comments yet</p>
							<p className="text-gray-500 text-sm">Be the first to comment!</p>
						</div>
					) : (
						<div className="space-y-4">
							{comments.map((comment) => (
								<CommentItem
									key={comment.id}
									comment={comment}
									onReply={handleReply}
									onLike={(commentId, isLiked) => likeCommentMutation.mutate({ commentId, isLiked })}
									formatTimeAgo={formatTimeAgo}
									sessionUserId={sessionUserId}
								/>
							))}
						</div>
					)}
				</div>

				{/* Input */}
				<form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 bg-gray-900">
					{replyingTo && (
						<div className="flex items-center justify-between mb-2 text-sm text-gray-400">
							<span>Replying to @{replyingTo.user?.name}</span>
							<button type="button" onClick={cancelReply} className="text-blue-400">
								Cancel
							</button>
						</div>
					)}
					<div className="flex items-center space-x-3">
						<input
							ref={inputRef}
							type="text"
							value={newComment}
							onChange={(e) => setNewComment(e.target.value)}
							placeholder={replyingTo ? 'Add a reply...' : 'Add a comment...'}
							className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<button
							type="submit"
							disabled={!newComment.trim() || addCommentMutation.isPending}
							className="text-blue-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{addCommentMutation.isPending ? (
								<div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500" />
							) : (
								'Post'
							)}
						</button>
					</div>
				</form>
			</div>
		</>
	);
}

function CommentItem({ comment, onReply, onLike, formatTimeAgo, sessionUserId, depth = 0 }) {
	const [showReplies, setShowReplies] = useState(false);
	const maxDepth = 2;

	return (
		<div className={`${depth > 0 ? 'ml-10 mt-3' : ''}`}>
			<div className="flex space-x-3">
				<img
					src={comment.user?.imageUrl || `https://placehold.co/32x32/A78BFA/ffffff?text=U`}
					alt=""
					className="w-8 h-8 rounded-full object-cover flex-shrink-0"
				/>
				<div className="flex-1 min-w-0">
					<div className="flex items-center space-x-2">
						<span className="text-white font-medium text-sm">{comment.user?.name || 'User'}</span>
						<span className="text-gray-500 text-xs">{formatTimeAgo(comment.createdAt)}</span>
					</div>
					<p className="text-gray-200 text-sm mt-1 break-words">{comment.content}</p>
					<div className="flex items-center space-x-4 mt-2">
						<button
							onClick={() => onLike(comment.id, comment.likedByCurrentUser)}
							className={`flex items-center space-x-1 text-xs ${comment.likedByCurrentUser ? 'text-red-500' : 'text-gray-400'
								}`}
						>
							<svg
								className="w-4 h-4"
								fill={comment.likedByCurrentUser ? 'currentColor' : 'none'}
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
							<span>{comment.likesCount || 0}</span>
						</button>
						{depth < maxDepth && (
							<button
								onClick={() => onReply(comment)}
								className="text-gray-400 text-xs hover:text-white"
							>
								Reply
							</button>
						)}
					</div>

					{/* Replies toggle */}
					{comment.replies && comment.replies.length > 0 && (
						<button
							onClick={() => setShowReplies(!showReplies)}
							className="text-blue-400 text-xs mt-2 flex items-center"
						>
							<span className="w-6 h-px bg-gray-600 mr-2" />
							{showReplies ? 'Hide replies' : `View ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`}
						</button>
					)}
				</div>
			</div>

			{/* Nested replies */}
			{showReplies && comment.replies && comment.replies.length > 0 && (
				<div className="mt-2">
					{comment.replies.map((reply) => (
						<CommentItem
							key={reply.id}
							comment={reply}
							onReply={onReply}
							onLike={onLike}
							formatTimeAgo={formatTimeAgo}
							sessionUserId={sessionUserId}
							depth={depth + 1}
						/>
					))}
				</div>
			)}
		</div>
	);
}
