// src/components/CommentComponents.jsx
"use client";

import React, { useState, useRef } from 'react';
import { formatTimestamp } from '../lib/utils'; // Assuming you move formatTimestamp here
import EmojiSelector from './EmojiSelector'; // Import the EmojiSelector component

export const Reply = ({ reply, sessionUserId, onDeleteReply, postId }) => {
	const isAuthor = reply.user.id === sessionUserId;
	return (
		<div className="flex items-start space-x-3">
			<img
				src={reply.user.imageUrl}
				alt={`${reply.user.name}'s avatar`}
				className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-slate-600 flex-shrink-0"
			/>
			<div className="flex-1">
				<div className="bg-gray-50 dark:bg-slate-700 rounded-xl px-3 py-1.5">
					<div className="flex items-baseline space-x-2">
						<span className="font-semibold text-gray-800 dark:text-slate-100 text-xs">{reply.user.name}</span>
						<span className="text-xs text-gray-500 dark:text-slate-400">{formatTimestamp(reply.createdAt)}</span> {/* Use formatTimestamp */}
						{isAuthor && <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium ml-auto">Author</span>}
					</div>
					<p className="text-gray-700 dark:text-slate-200 text-sm mt-0.5">{reply.content}</p>
				</div>
				{isAuthor && (
					<div className="flex items-center space-x-3 mt-1 pl-2">
						<button
							onClick={() => onDeleteReply(reply.id, postId)}
							className="text-xs font-medium text-red-600 hover:underline"
						>
							Delete
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

export const Comment = ({ comment, onReply, sessionUserId, onDeleteComment, postId }) => {
	const isAuthor = comment.user.id === sessionUserId;
	const [showReplyInput, setShowReplyInput] = useState(false);
	const [replyText, setReplyText] = useState('');
	const replyInputRef = useRef(null);
	const replyContainerRef = useRef(null);

	const handleAddEmoji = (emoji) => {
		setReplyText(prev => prev + emoji);
		// Focus the reply input after adding an emoji
		if (replyInputRef.current) {
			setTimeout(() => replyInputRef.current.focus(), 0);
		}
	};

	const handlePostReply = async () => {
		if (replyText.trim()) {
			await onReply(comment.id, replyText);
			setReplyText("");
			setShowReplyInput(false);
		}
	};

	return (
		<div className="flex items-start space-x-3 mb-4">
			<img
				src={comment.user.imageUrl}
				alt={`${comment.user.name}'s avatar`}
				className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-600 flex-shrink-0"
			/>
			<div className="flex-1">
				<div className="bg-gray-100 dark:bg-slate-700 rounded-xl px-4 py-2">
					<div className="flex items-baseline space-x-2">
						<span className="font-semibold text-gray-800 dark:text-slate-100 text-sm">{comment.user.name}</span>
						<span className="text-xs text-gray-500 dark:text-slate-400">{formatTimestamp(comment.createdAt)}</span> {/* Use formatTimestamp */}
						{isAuthor && <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium ml-auto">Author</span>}
					</div>
					<p className="text-gray-700 dark:text-slate-200 text-sm mt-1">{comment.content}</p>
				</div>
				<div className="flex items-center space-x-3 mt-1 pl-2">
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
					<form onSubmit={handlePostReply} className="mt-2 ml-8 flex relative" ref={replyContainerRef}>
						<input
							ref={replyInputRef}
							type="text"
							value={replyText}
							onChange={(e) => setReplyText(e.target.value)}
							placeholder="Write a reply..."
							className="flex-grow p-2 pr-8 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
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
				{comment.replies && comment.replies.length > 0 && (
					<div className="ml-8 mt-3 space-y-3 border-l-2 border-gray-200 dark:border-slate-600 pl-4">
						{comment.replies.map(reply => (
							<Reply
								key={reply.id}
								reply={reply}
								sessionUserId={sessionUserId}
								onDeleteReply={onDeleteComment} // Replies also use onDeleteComment, as it handles both
								postId={postId}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
};