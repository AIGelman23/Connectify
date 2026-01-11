// src/components/CommentComponents.jsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { formatTimestamp } from '../lib/utils'; // Assuming you move formatTimestamp here
import EmojiSelector from './EmojiSelector'; // Import the EmojiSelector component

const MAX_REPLY_LENGTH = 280;

export const Reply = ({ reply, sessionUserId, onDeleteReply, postId, onReply, onLike, commentId, depth = 1 }) => {
	const isAuthor = reply.user.id === sessionUserId;
	const [showReplyInput, setShowReplyInput] = useState(false);
	const [showNestedReplies, setShowNestedReplies] = useState(false);
	const [replyText, setReplyText] = useState('');
	const [isLiked, setIsLiked] = useState(reply.likedByCurrentUser || false);
	const [likesCount, setLikesCount] = useState(reply.likesCount || 0);
	const [isLiking, setIsLiking] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isContentExpanded, setIsContentExpanded] = useState(false);
	const replyInputRef = useRef(null);
	const replyContainerRef = useRef(null);

	const MAX_DEPTH = 3;
	const MAX_CONTENT_LENGTH = 200;
	const shouldTruncate = reply.content && reply.content.length > MAX_CONTENT_LENGTH;
	const hasNestedReplies = reply.replies && reply.replies.length > 0;
	const canNestDeeper = depth < MAX_DEPTH;

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handlePostReply(e);
		}
	};

	// Format "Liked by X and Y others" text
	const getLikedByText = () => {
		const names = reply.likerNames || [];
		if (likesCount === 0 || names.length === 0) return null;
		if (likesCount === 1 && names.length === 1) return `Liked by ${names[0]}`;
		if (likesCount === 2 && names.length >= 2) return `Liked by ${names[0]} and ${names[1]}`;
		if (names.length >= 1) {
			const othersCount = likesCount - 1;
			return `Liked by ${names[0]} and ${othersCount} ${othersCount === 1 ? 'other' : 'others'}`;
		}
		return null;
	};

	// Close reply input when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (replyContainerRef.current && !replyContainerRef.current.contains(event.target)) {
				setShowReplyInput(false);
			}
		};

		if (showReplyInput) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showReplyInput]);

	// Auto-resize textarea
	useEffect(() => {
		if (showReplyInput && replyInputRef.current) {
			replyInputRef.current.style.height = 'auto';
			replyInputRef.current.style.height = `${replyInputRef.current.scrollHeight}px`;
		}
	}, [showReplyInput, replyText]);

	const handleLike = async () => {
		if (isLiking) return;
		setIsLiking(true);
		const newIsLiked = !isLiked;
		setIsLiked(newIsLiked);
		setLikesCount(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));
		try {
			await onLike(reply.id, newIsLiked);
		} catch (error) {
			// Revert on error
			setIsLiked(!newIsLiked);
			setLikesCount(prev => newIsLiked ? Math.max(0, prev - 1) : prev + 1);
		} finally {
			setIsLiking(false);
		}
	};

	const handleAddEmoji = (emoji) => {
		setReplyText(prev => prev + emoji);
		if (replyInputRef.current) {
			setTimeout(() => replyInputRef.current.focus(), 0);
		}
	};

	const handlePostReply = async (e) => {
		e.preventDefault();
		if (replyText.trim() && !isSubmitting) {
			setIsSubmitting(true);
			try {
				// If at max depth, don't pass parentId - reply goes to the comment level
				// Otherwise, nest under this reply
				const parentId = canNestDeeper ? reply.id : null;
				await onReply(commentId, replyText, parentId);
				setReplyText("");
				setShowReplyInput(false);
				if (canNestDeeper) {
					setShowNestedReplies(true);
				}
			} finally {
				setIsSubmitting(false);
			}
		}
	};

	const getRepliesCount = (replyItem) => {
		if (!replyItem.replies || replyItem.replies.length === 0) return 0;
		return replyItem.replies.reduce((count, r) => count + 1 + getRepliesCount(r), 0);
	};

	const totalNestedReplies = hasNestedReplies ? getRepliesCount(reply) : 0;

	return (
		<div className="flex items-start space-x-2">
			<Link href={`/profile/${reply.user.id}`} className="flex-shrink-0">
				<img
					src={reply.user.imageUrl}
					alt={`${reply.user.name}'s avatar`}
					className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-slate-600 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all duration-200"
				/>
			</Link>
			<div className="flex-1 min-w-0">
				<div className="bg-gray-50 dark:bg-slate-700 rounded-xl px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors duration-200">
					<div className="flex items-baseline space-x-2 flex-wrap">
						<Link href={`/profile/${reply.user.id}`} className="font-semibold text-gray-800 dark:text-slate-100 text-xs hover:text-blue-600 hover:underline">{reply.user.name}</Link>
						<span className="text-xs text-gray-500 dark:text-slate-400">{formatTimestamp(reply.createdAt)}</span>
						{isAuthor && <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">Author</span>}
					</div>
					<p className="text-gray-700 dark:text-slate-200 text-sm mt-0.5 break-words">
						{shouldTruncate && !isContentExpanded
							? `${reply.content.slice(0, MAX_CONTENT_LENGTH)}...`
							: reply.content}
						{shouldTruncate && (
							<button
								onClick={() => setIsContentExpanded(!isContentExpanded)}
								className="ml-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
							>
								{isContentExpanded ? 'See less' : 'See more'}
							</button>
						)}
					</p>
				</div>
				<div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 pl-2">
					<button
						onClick={handleLike}
						disabled={isLiking}
						className={`text-xs font-medium hover:underline flex items-center space-x-1 ${isLiked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
							} ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
					>
						{isLiking ? (
							<i className="fas fa-spinner fa-spin"></i>
						) : (
							<i className={`${isLiked ? 'fas' : 'far'} fa-thumbs-up`}></i>
						)}
						<span>Like{likesCount > 0 ? ` (${likesCount})` : ''}</span>
					</button>
					<button
						onClick={() => {
							if (!showReplyInput) setReplyText(`@${reply.user.name} `);
							setShowReplyInput((prev) => !prev);
						}}
						className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
					>
						Reply
					</button>
					{isAuthor && (
						<button
							onClick={() => onDeleteReply(reply.id, postId)}
							className="text-xs font-medium text-red-600 hover:underline"
						>
							Delete
						</button>
					)}
					{getLikedByText() && (
						<span className="text-xs text-gray-500 dark:text-slate-400 italic">
							{getLikedByText()}
						</span>
					)}
				</div>
				{showReplyInput && (
					<form onSubmit={handlePostReply} className="mt-2 flex relative animate-fade-in" ref={replyContainerRef}>
						<textarea
							ref={replyInputRef}
							value={replyText}
							onChange={(e) => setReplyText(e.target.value)}
							onKeyDown={handleKeyDown}
							maxLength={MAX_REPLY_LENGTH}
							placeholder={`Reply to ${reply.user.name}...`}
							className="flex-grow p-2 pr-28 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 resize-none overflow-hidden min-h-[40px]"
							rows={1}
							autoFocus
						/>
						<div className="absolute right-2 bottom-2 flex items-center space-x-1">
							<span className={`text-xs ${replyText.length >= MAX_REPLY_LENGTH ? 'text-red-600 font-bold' : (replyText.length > MAX_REPLY_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-400')}`}>
								{replyText.length}/{MAX_REPLY_LENGTH}
							</span>
							<EmojiSelector
								onEmojiSelect={handleAddEmoji}
								parentRef={replyContainerRef}
							/>
							<button
								type="submit"
								disabled={isSubmitting}
								className={`text-blue-600 hover:text-blue-800 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
							>
								{isSubmitting ? (
									<i className="fas fa-spinner fa-spin"></i>
								) : (
									<i className="fas fa-paper-plane"></i>
								)}
							</button>
							<button
								type="button"
								onClick={() => setShowReplyInput(false)}
								className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							>
								<i className="fas fa-times"></i>
							</button>
						</div>
						{replyText.length >= MAX_REPLY_LENGTH && (
							<div className="absolute top-full right-0 mt-1 text-red-600 text-xs font-medium bg-red-50 px-2 py-1 rounded shadow-sm z-10 border border-red-100">
								Character limit reached!
							</div>
						)}
					</form>
				)}
				{hasNestedReplies && (
					<div className="mt-2">
						{!showNestedReplies ? (
							<button
								onClick={() => setShowNestedReplies(true)}
								className="flex items-center text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
							>
								<i className="fas fa-reply fa-flip-horizontal mr-1.5"></i>
								View {totalNestedReplies} {totalNestedReplies === 1 ? 'reply' : 'replies'}
							</button>
						) : (
							<>
								<button
									onClick={() => setShowNestedReplies(false)}
									className="flex items-center text-xs font-medium text-gray-500 dark:text-slate-400 hover:underline mb-2"
								>
									<i className="fas fa-chevron-up mr-1.5"></i>
									Hide replies
								</button>
								<div className="space-y-2 border-l-2 border-gray-200 dark:border-slate-600 pl-3 animate-fade-in">
									{reply.replies.map(nestedReply => (
										<Reply
											key={nestedReply.id}
											reply={nestedReply}
											sessionUserId={sessionUserId}
											onDeleteReply={onDeleteReply}
											postId={postId}
											onReply={onReply}
											onLike={onLike}
											commentId={commentId}
											depth={depth + 1}
										/>
									))}
								</div>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export const Comment = ({ comment, onReply, onLike, sessionUserId, onDeleteComment, postId }) => {
	const isAuthor = comment.user.id === sessionUserId;
	const [showReplyInput, setShowReplyInput] = useState(false);
	const [showReplies, setShowReplies] = useState(false);
	const [replyText, setReplyText] = useState('');
	const [isLiked, setIsLiked] = useState(comment.likedByCurrentUser || false);
	const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
	const [isLiking, setIsLiking] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isContentExpanded, setIsContentExpanded] = useState(false);
	const replyInputRef = useRef(null);
	const replyContainerRef = useRef(null);

	const hasReplies = comment.replies && comment.replies.length > 0;
	const MAX_CONTENT_LENGTH = 200;
	const shouldTruncate = comment.content && comment.content.length > MAX_CONTENT_LENGTH;

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handlePostReply(e);
		}
	};

	// Format "Liked by X and Y others" text
	const getLikedByText = () => {
		const names = comment.likerNames || [];
		if (likesCount === 0 || names.length === 0) return null;
		if (likesCount === 1 && names.length === 1) return `Liked by ${names[0]}`;
		if (likesCount === 2 && names.length >= 2) return `Liked by ${names[0]} and ${names[1]}`;
		if (names.length >= 1) {
			const othersCount = likesCount - 1;
			return `Liked by ${names[0]} and ${othersCount} ${othersCount === 1 ? 'other' : 'others'}`;
		}
		return null;
	};

	// Close reply input when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (replyContainerRef.current && !replyContainerRef.current.contains(event.target)) {
				setShowReplyInput(false);
			}
		};

		if (showReplyInput) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showReplyInput]);

	// Auto-resize textarea
	useEffect(() => {
		if (showReplyInput && replyInputRef.current) {
			replyInputRef.current.style.height = 'auto';
			replyInputRef.current.style.height = `${replyInputRef.current.scrollHeight}px`;
		}
	}, [showReplyInput, replyText]);

	// Count total replies including nested ones
	const countAllReplies = (replies) => {
		if (!replies || replies.length === 0) return 0;
		return replies.reduce((count, reply) => {
			return count + 1 + countAllReplies(reply.replies);
		}, 0);
	};

	const totalReplies = hasReplies ? countAllReplies(comment.replies) : 0;

	const handleAddEmoji = (emoji) => {
		setReplyText(prev => prev + emoji);
		if (replyInputRef.current) {
			setTimeout(() => replyInputRef.current.focus(), 0);
		}
	};

	const handleLike = async () => {
		if (isLiking) return;
		setIsLiking(true);
		const newIsLiked = !isLiked;
		setIsLiked(newIsLiked);
		setLikesCount(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));
		try {
			await onLike(comment.id, newIsLiked);
		} catch (error) {
			// Revert on error
			setIsLiked(!newIsLiked);
			setLikesCount(prev => newIsLiked ? Math.max(0, prev - 1) : prev + 1);
		} finally {
			setIsLiking(false);
		}
	};

	const handlePostReply = async (e) => {
		e.preventDefault();
		if (replyText.trim() && !isSubmitting) {
			setIsSubmitting(true);
			try {
				await onReply(comment.id, replyText);
				setReplyText("");
				setShowReplyInput(false);
				setShowReplies(true);
			} finally {
				setIsSubmitting(false);
			}
		}
	};

	return (
		<div className="flex items-start space-x-3 mb-4">
			<Link href={`/profile/${comment.user.id}`} className="flex-shrink-0">
				<img
					src={comment.user.imageUrl}
					alt={`${comment.user.name}'s avatar`}
					className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-600 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all duration-200"
				/>
			</Link>
			<div className="flex-1 min-w-0">
				<div className="bg-gray-100 dark:bg-slate-700 rounded-xl px-4 py-2 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors duration-200">
					<div className="flex items-baseline space-x-2 flex-wrap">
						<Link href={`/profile/${comment.user.id}`} className="font-semibold text-gray-800 dark:text-slate-100 text-sm hover:text-blue-600 hover:underline">{comment.user.name}</Link>
						<span className="text-xs text-gray-500 dark:text-slate-400">{formatTimestamp(comment.createdAt)}</span>
						{isAuthor && <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Author</span>}
					</div>
					<p className="text-gray-700 dark:text-slate-200 text-sm mt-1 break-words">
						{shouldTruncate && !isContentExpanded
							? `${comment.content.slice(0, MAX_CONTENT_LENGTH)}...`
							: comment.content}
						{shouldTruncate && (
							<button
								onClick={() => setIsContentExpanded(!isContentExpanded)}
								className="ml-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
							>
								{isContentExpanded ? 'See less' : 'See more'}
							</button>
						)}
					</p>
				</div>
				<div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 pl-2">
					<button
						onClick={handleLike}
						disabled={isLiking}
						className={`text-xs font-medium hover:underline flex items-center space-x-1 ${isLiked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
							} ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
					>
						{isLiking ? (
							<i className="fas fa-spinner fa-spin"></i>
						) : (
							<i className={`${isLiked ? 'fas' : 'far'} fa-thumbs-up`}></i>
						)}
						<span>Like{likesCount > 0 ? ` (${likesCount})` : ''}</span>
					</button>
					<button
						onClick={() => setShowReplyInput((prev) => !prev)}
						className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
					>
						Reply
					</button>
					{isAuthor && (
						<button
							onClick={() => onDeleteComment(comment.id, postId)}
							className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
						>
							Delete
						</button>
					)}
					{getLikedByText() && (
						<span className="text-xs text-gray-500 dark:text-slate-400 italic">
							{getLikedByText()}
						</span>
					)}
				</div>
				{showReplyInput && (
					<form onSubmit={handlePostReply} className="mt-2 ml-6 flex relative animate-fade-in" ref={replyContainerRef}>
						<textarea
							ref={replyInputRef}
							value={replyText}
							onChange={(e) => setReplyText(e.target.value)}
							onKeyDown={handleKeyDown}
							maxLength={MAX_REPLY_LENGTH}
							placeholder="Write a reply..."
							className="flex-grow p-2 pr-28 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 resize-none overflow-hidden min-h-[40px]"
							rows={1}
							autoFocus
						/>
						<div className="absolute right-2 bottom-2 flex items-center space-x-1">
							<span className={`text-xs ${replyText.length >= MAX_REPLY_LENGTH ? 'text-red-600 font-bold' : (replyText.length > MAX_REPLY_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-400')}`}>
								{replyText.length}/{MAX_REPLY_LENGTH}
							</span>
							<EmojiSelector
								onEmojiSelect={handleAddEmoji}
								parentRef={replyContainerRef}
							/>
							<button
								type="submit"
								disabled={isSubmitting}
								className={`text-blue-600 hover:text-blue-800 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
							>
								{isSubmitting ? (
									<i className="fas fa-spinner fa-spin"></i>
								) : (
									<i className="fas fa-paper-plane"></i>
								)}
							</button>
							<button
								type="button"
								onClick={() => setShowReplyInput(false)}
								className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							>
								<i className="fas fa-times"></i>
							</button>
						</div>
						{replyText.length >= MAX_REPLY_LENGTH && (
							<div className="absolute top-full right-0 mt-1 text-red-600 text-xs font-medium bg-red-50 px-2 py-1 rounded shadow-sm z-10 border border-red-100">
								Character limit reached!
							</div>
						)}
					</form>
				)}
				{hasReplies && (
					<div className="mt-2 ml-6">
						{!showReplies ? (
							<button
								onClick={() => setShowReplies(true)}
								className="flex items-center text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
							>
								<i className="fas fa-reply fa-flip-horizontal mr-1.5"></i>
								View {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
							</button>
						) : (
							<>
								<button
									onClick={() => setShowReplies(false)}
									className="flex items-center text-xs font-medium text-gray-500 dark:text-slate-400 hover:underline mb-2"
								>
									<i className="fas fa-chevron-up mr-1.5"></i>
									Hide replies
								</button>
								<div className="space-y-2 border-l-2 border-gray-200 dark:border-slate-600 pl-3 animate-fade-in">
									{comment.replies.map(reply => (
										<Reply
											key={reply.id}
											reply={reply}
											sessionUserId={sessionUserId}
											onDeleteReply={onDeleteComment}
											postId={postId}
											onReply={onReply}
											onLike={onLike}
											commentId={comment.id}
											depth={1}
										/>
									))}
								</div>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
};