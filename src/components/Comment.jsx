// src/components/CommentComponents.jsx
"use client";

import React, { useState, useRef } from 'react';
import { formatTimestamp } from '../lib/utils'; // Assuming you move formatTimestamp here
import EmojiSelector from './EmojiSelector'; // Import the EmojiSelector component

export const Reply = ({ reply, sessionUserId, onDeleteReply, postId, onReply, onLike, commentId, depth = 1 }) => {
	const isAuthor = reply.user.id === sessionUserId;
	const [showReplyInput, setShowReplyInput] = useState(false);
	const [showNestedReplies, setShowNestedReplies] = useState(false);
	const [replyText, setReplyText] = useState('');
	const [isLiked, setIsLiked] = useState(false);
	const replyInputRef = useRef(null);
	const replyContainerRef = useRef(null);

	const MAX_DEPTH = 3;
	const hasNestedReplies = reply.replies && reply.replies.length > 0;
	const canNestDeeper = depth < MAX_DEPTH;

	const handleLike = () => {
		onLike(reply.id, !isLiked);
		setIsLiked(!isLiked);
	};

	const handleAddEmoji = (emoji) => {
		setReplyText(prev => prev + emoji);
		if (replyInputRef.current) {
			setTimeout(() => replyInputRef.current.focus(), 0);
		}
	};

	const handlePostReply = async (e) => {
		e.preventDefault();
		if (replyText.trim()) {
			// If at max depth, don't pass parentId - reply goes to the comment level
			// Otherwise, nest under this reply
			const parentId = canNestDeeper ? reply.id : null;
			await onReply(commentId, replyText, parentId);
			setReplyText("");
			setShowReplyInput(false);
			if (canNestDeeper) {
				setShowNestedReplies(true);
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
			<img
				src={reply.user.imageUrl}
				alt={`${reply.user.name}'s avatar`}
				className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-slate-600 flex-shrink-0"
			/>
			<div className="flex-1 min-w-0">
				<div className="bg-gray-50 dark:bg-slate-700 rounded-xl px-3 py-1.5">
					<div className="flex items-baseline space-x-2 flex-wrap">
						<span className="font-semibold text-gray-800 dark:text-slate-100 text-xs">{reply.user.name}</span>
						<span className="text-xs text-gray-500 dark:text-slate-400">{formatTimestamp(reply.createdAt)}</span>
						{isAuthor && <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">Author</span>}
					</div>
					<p className="text-gray-700 dark:text-slate-200 text-sm mt-0.5 break-words">{reply.content}</p>
				</div>
				<div className="flex items-center space-x-3 mt-1 pl-2">
					<button
						onClick={handleLike}
						className={`text-xs font-medium hover:underline flex items-center space-x-1 ${
							isLiked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
						}`}
					>
						<i className={`${isLiked ? 'fas' : 'far'} fa-thumbs-up`}></i>
						<span>Like{(reply.likesCount || 0) > 0 ? ` (${reply.likesCount})` : ''}</span>
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
				</div>
				{showReplyInput && (
					<form onSubmit={handlePostReply} className="mt-2 flex relative" ref={replyContainerRef}>
						<input
							ref={replyInputRef}
							type="text"
							value={replyText}
							onChange={(e) => setReplyText(e.target.value)}
							placeholder={`Reply to ${reply.user.name}...`}
							className="flex-grow p-2 pr-16 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
							autoFocus
						/>
						<div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
							<EmojiSelector
								onEmojiSelect={handleAddEmoji}
								parentRef={replyContainerRef}
							/>
							<button
								type="submit"
								className="ml-1 text-blue-600 hover:text-blue-800"
							>
								<i className="fas fa-paper-plane"></i>
							</button>
						</div>
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
								<div className="space-y-2 border-l-2 border-gray-200 dark:border-slate-600 pl-3">
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
	const [isLiked, setIsLiked] = useState(false);
	const replyInputRef = useRef(null);
	const replyContainerRef = useRef(null);

	const hasReplies = comment.replies && comment.replies.length > 0;

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

	const handleLike = () => {
		onLike(comment.id, !isLiked);
		setIsLiked(!isLiked);
	};

	const handlePostReply = async (e) => {
		e.preventDefault();
		if (replyText.trim()) {
			await onReply(comment.id, replyText);
			setReplyText("");
			setShowReplyInput(false);
			setShowReplies(true);
		}
	};

	return (
		<div className="flex items-start space-x-3 mb-4">
			<img
				src={comment.user.imageUrl}
				alt={`${comment.user.name}'s avatar`}
				className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-600 flex-shrink-0"
			/>
			<div className="flex-1 min-w-0">
				<div className="bg-gray-100 dark:bg-slate-700 rounded-xl px-4 py-2">
					<div className="flex items-baseline space-x-2 flex-wrap">
						<span className="font-semibold text-gray-800 dark:text-slate-100 text-sm">{comment.user.name}</span>
						<span className="text-xs text-gray-500 dark:text-slate-400">{formatTimestamp(comment.createdAt)}</span>
						{isAuthor && <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Author</span>}
					</div>
					<p className="text-gray-700 dark:text-slate-200 text-sm mt-1 break-words">{comment.content}</p>
				</div>
				<div className="flex items-center space-x-3 mt-1 pl-2">
					<button
						onClick={handleLike}
						className={`text-xs font-medium hover:underline flex items-center space-x-1 ${
							isLiked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
						}`}
					>
						<i className={`${isLiked ? 'fas' : 'far'} fa-thumbs-up`}></i>
						<span>Like{(comment.likesCount || 0) > 0 ? ` (${comment.likesCount})` : ''}</span>
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
				</div>
				{showReplyInput && (
					<form onSubmit={handlePostReply} className="mt-2 ml-6 flex relative" ref={replyContainerRef}>
						<input
							ref={replyInputRef}
							type="text"
							value={replyText}
							onChange={(e) => setReplyText(e.target.value)}
							placeholder="Write a reply..."
							className="flex-grow p-2 pr-16 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
							autoFocus
						/>
						<div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
							<EmojiSelector
								onEmojiSelect={handleAddEmoji}
								parentRef={replyContainerRef}
							/>
							<button
								type="submit"
								className="ml-1 text-blue-600 hover:text-blue-800"
							>
								<i className="fas fa-paper-plane"></i>
							</button>
						</div>
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
								<div className="space-y-2 border-l-2 border-gray-200 dark:border-slate-600 pl-3">
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