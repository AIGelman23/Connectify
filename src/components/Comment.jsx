// src/components/Comment.jsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { formatTimestamp } from '../lib/utils';
import EmojiSelector from './EmojiSelector';

const MAX_REPLY_LENGTH = 280;

// Helper to check if a comment/reply tree contains a specific ID
const containsId = (items, id) => {
	if (!items || !id) return false;
	for (const item of items) {
		if (item.id === id) return true;
		if (item.replies && containsId(item.replies, id)) return true;
	}
	return false;
};

const ReportConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
	if (!isOpen) return null;
	return (
		<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
			<div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-slate-700 animate-scale-in" onClick={e => e.stopPropagation()}>
				<div className="p-6">
					<h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Report Content</h3>
					<p className="text-gray-600 dark:text-slate-300 text-sm mb-6">
						Are you sure you want to report this content? We will review it shortly.
					</p>
					<div className="flex justify-end gap-3">
						<button
							onClick={onClose}
							className="px-4 py-2 text-gray-700 dark:text-slate-200 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
						>
							Cancel
						</button>
						<button
							onClick={onConfirm}
							className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
						>
							Report
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

// Compact Reply Input Component
const ReplyInput = ({ currentUser, replyText, setReplyText, onSubmit, onCancel, isSubmitting, placeholder }) => {
	const inputRef = useRef(null);

	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.focus();
			inputRef.current.style.height = 'auto';
			inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
		}
	}, [replyText]);

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			onSubmit(e);
		} else if (e.key === 'Escape') {
			onCancel();
		}
	};

	const handleAddEmoji = (emoji) => {
		setReplyText(prev => prev + emoji);
		inputRef.current?.focus();
	};

	return (
		<div className="flex items-start gap-2 mt-2 animate-slide-down">
			<img
				src={currentUser?.image || `https://placehold.co/24x24/6366F1/ffffff?text=${currentUser?.name?.[0] || 'U'}`}
				alt=""
				className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5"
			/>
			<form onSubmit={onSubmit} className="flex-1 relative">
				<textarea
					ref={inputRef}
					value={replyText}
					onChange={(e) => setReplyText(e.target.value)}
					onKeyDown={handleKeyDown}
					maxLength={MAX_REPLY_LENGTH}
					placeholder={placeholder}
					className="w-full pl-3 sm:pl-4 pr-24 sm:pr-32 py-2.5 sm:py-3 border-none rounded-3xl bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-[15px] placeholder-gray-500 dark:placeholder-slate-400 resize-none overflow-hidden min-h-[40px] sm:min-h-[44px]"
					rows={1}
				/>
				<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
					{replyText.length > 0 && (
						<span className={`text-[10px] mr-1 ${replyText.length >= MAX_REPLY_LENGTH ? 'text-red-600 font-bold' : (replyText.length > MAX_REPLY_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-400 dark:text-slate-500')}`}>
							{replyText.length}/{MAX_REPLY_LENGTH}
						</span>
					)}
					<EmojiSelector onEmojiSelect={handleAddEmoji} />
					<button
						type="submit"
						disabled={isSubmitting || !replyText.trim()}
						className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center w-8 h-8 ${replyText.trim()
							? 'text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30'
							: 'text-gray-400 cursor-not-allowed'
							} ${isSubmitting ? 'opacity-50' : ''}`}
					>
						{isSubmitting ? (
							<svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
							</svg>
						) : (
							<i className="fas fa-paper-plane text-sm"></i>
						)}
					</button>
				</div>
				{replyText.length >= MAX_REPLY_LENGTH && (
					<div className="absolute top-full right-0 mt-1 text-red-600 text-xs font-medium bg-red-50 px-2 py-1 rounded shadow-sm z-10 border border-red-100">
						Character limit reached!
					</div>
				)}
			</form>
		</div>
	);
};

export const Reply = ({ reply, sessionUserId, currentUser, onDeleteReply, postId, onReply, onLike, commentId, depth = 1, targetCommentId, onReport }) => {
	const isAuthor = reply.user.id === sessionUserId;
	const [showReplyInput, setShowReplyInput] = useState(false);
	const [showNestedReplies, setShowNestedReplies] = useState(false);
	const [replyText, setReplyText] = useState('');
	const [isLiked, setIsLiked] = useState(reply.likedByCurrentUser || false);
	const [likesCount, setLikesCount] = useState(reply.likesCount || 0);
	const [isLiking, setIsLiking] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [showReportModal, setShowReportModal] = useState(false);

	const MAX_DEPTH = 3;
	const hasNestedReplies = reply.replies && reply.replies.length > 0;
	const canNestDeeper = depth < MAX_DEPTH;

	// Auto-expand if this reply contains the target comment
	useEffect(() => {
		if (targetCommentId && containsId(reply.replies, targetCommentId)) {
			setShowNestedReplies(true);
		}
	}, [targetCommentId, reply.replies]);

	const handleLike = async () => {
		if (isLiking) return;
		setIsLiking(true);
		const newIsLiked = !isLiked;
		setIsLiked(newIsLiked);
		setLikesCount(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));
		try {
			await onLike(reply.id, newIsLiked);
		} catch (error) {
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
				const parentId = canNestDeeper ? reply.id : null;
				await onReply(commentId, replyText, parentId);
				setReplyText("");
				setShowReplyInput(false);
				if (canNestDeeper) setShowNestedReplies(true);
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
		<div
			id={`comment-${reply.id}`}
			className="relative group"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{/* Thread line */}
			{depth > 1 && (
				<div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-slate-600 -translate-x-4" />
			)}

			<div className="flex items-start gap-2 py-1">
				<Link href={`/profile/${reply.user.id}`} className="flex-shrink-0">
					<img
						src={reply.user.imageUrl}
						alt=""
						className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover hover:ring-2 hover:ring-blue-400 transition-all"
					/>
				</Link>

				<div className="flex-1 min-w-0">
					{/* Reply bubble */}
					<div className="relative w-fit max-w-full">
						<div className="bg-gray-100 dark:bg-slate-700 rounded-2xl px-3 sm:px-3.5 py-1.5 sm:py-2 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
							<Link
								href={`/profile/${reply.user.id}`}
								className="font-semibold text-[13px] text-gray-900 dark:text-slate-100 hover:underline"
							>
								{reply.user.name}
							</Link>
							{isAuthor && (
								<span className="ml-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">
									Author
								</span>
							)}
							<p className="text-sm sm:text-[15px] text-gray-800 dark:text-slate-200 break-words whitespace-pre-wrap leading-snug">
								{reply.content}
							</p>
						</div>

						{/* Like badge on bubble */}
						{likesCount > 0 && (
							<div className="absolute -bottom-2 -right-1 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded-full shadow-md border border-gray-100 dark:border-slate-600 text-[11px]">
								<span className="text-blue-600">👍</span>
								<span className="text-gray-600 dark:text-slate-400">{likesCount}</span>
							</div>
						)}
					</div>

					{/* Actions row */}
					<div className="flex items-center gap-3 mt-0.5 ml-1">
						<button
							onClick={handleLike}
							disabled={isLiking}
							className={`text-[12px] font-semibold transition-colors ${isLiked
								? 'text-blue-600 dark:text-blue-400'
								: 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
								}`}
						>
							{isLiked ? 'Liked' : 'Like'}
						</button>
						<button
							onClick={() => {
								setReplyText(`@${reply.user.name} `);
								setShowReplyInput(true);
							}}
							className="text-[12px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
						>
							Reply
						</button>
						<span className="text-[11px] text-gray-500 dark:text-slate-400">
							{formatTimestamp(reply.createdAt)}
						</span>

						{/* More actions dropdown */}
						{(isHovered || isAuthor) && (
							<div className="relative">
								<button
									className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
									onClick={() => { }}
								>
									<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
										<path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
									</svg>
								</button>
							</div>
						)}

						{isAuthor && (
							<button
								onClick={() => onDeleteReply(reply.id, postId)}
								className="text-[12px] font-semibold text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
							>
								Delete
							</button>
						)}
					</div>

					{/* Reply input */}
					{showReplyInput && (
						<ReplyInput
							currentUser={currentUser}
							replyText={replyText}
							setReplyText={setReplyText}
							onSubmit={handlePostReply}
							onCancel={() => setShowReplyInput(false)}
							isSubmitting={isSubmitting}
							placeholder={`Reply to ${reply.user.name}...`}
						/>
					)}

					{/* Nested replies */}
					{hasNestedReplies && (
						<div className="mt-2">
							{!showNestedReplies ? (
								<button
									onClick={() => setShowNestedReplies(true)}
									className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
								>
									<svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
									</svg>
									{totalNestedReplies} {totalNestedReplies === 1 ? 'reply' : 'replies'}
								</button>
							) : (
								<div className="relative pl-4 mt-1 animate-slide-down">
									{/* Thread line for nested */}
									<div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-slate-600" />

									<button
										onClick={() => setShowNestedReplies(false)}
										className="flex items-center gap-1 text-[12px] text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 mb-1"
									>
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
										</svg>
										Hide
									</button>

									<div className="space-y-1">
										{reply.replies.map(nestedReply => (
											<Reply
												key={nestedReply.id}
												reply={nestedReply}
												sessionUserId={sessionUserId}
												currentUser={currentUser}
												onDeleteReply={onDeleteReply}
												postId={postId}
												onReply={onReply}
												onLike={onLike}
												commentId={commentId}
												depth={depth + 1}
												targetCommentId={targetCommentId}
												onReport={onReport}
											/>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{showReportModal && (
				<ReportConfirmationModal
					isOpen={showReportModal}
					onClose={() => setShowReportModal(false)}
					onConfirm={() => {
						setShowReportModal(false);
						onReport?.(reply.id, 'REPLY');
					}}
				/>
			)}
		</div>
	);
};

export const Comment = ({ comment, onReply, onLike, sessionUserId, currentUser, onDeleteComment, postId, targetCommentId, onReport }) => {
	const isAuthor = comment.user.id === sessionUserId;
	const [showReplyInput, setShowReplyInput] = useState(false);
	const [showReplies, setShowReplies] = useState(false);
	const [replyText, setReplyText] = useState('');
	const [isLiked, setIsLiked] = useState(comment.likedByCurrentUser || false);
	const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
	const [isLiking, setIsLiking] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [showReportModal, setShowReportModal] = useState(false);

	const hasReplies = comment.replies && comment.replies.length > 0;

	// Auto-expand if this comment contains the target reply
	useEffect(() => {
		if (targetCommentId && containsId(comment.replies, targetCommentId)) {
			setShowReplies(true);
		}
	}, [targetCommentId, comment.replies]);

	const countAllReplies = (replies) => {
		if (!replies || replies.length === 0) return 0;
		return replies.reduce((count, reply) => count + 1 + countAllReplies(reply.replies), 0);
	};

	const totalReplies = hasReplies ? countAllReplies(comment.replies) : 0;

	const handleLike = async () => {
		if (isLiking) return;
		setIsLiking(true);
		const newIsLiked = !isLiked;
		setIsLiked(newIsLiked);
		setLikesCount(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));
		try {
			await onLike(comment.id, newIsLiked);
		} catch (error) {
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
		<div
			id={`comment-${comment.id}`}
			className="relative group mb-3"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div className="flex items-start gap-2.5">
				<Link href={`/profile/${comment.user.id}`} className="flex-shrink-0">
					<img
						src={comment.user.imageUrl}
						alt=""
						className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover hover:ring-2 hover:ring-blue-400 transition-all"
					/>
				</Link>

				<div className="flex-1 min-w-0">
					{/* Comment bubble */}
					<div className="relative w-fit max-w-full">
						<div className="bg-gray-100 dark:bg-slate-700 rounded-2xl px-3 sm:px-3.5 py-1.5 sm:py-2 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
							<div className="flex items-center gap-2 flex-wrap">
								<Link
									href={`/profile/${comment.user.id}`}
									className="font-semibold text-[13px] text-gray-900 dark:text-slate-100 hover:underline"
								>
									{comment.user.name}
								</Link>
								{isAuthor && (
									<span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">
										Author
									</span>
								)}
							</div>
							<p className="text-sm sm:text-[15px] text-gray-800 dark:text-slate-200 break-words whitespace-pre-wrap mt-0.5 leading-snug">
								{comment.content}
							</p>
						</div>

						{/* Like badge on bubble */}
						{likesCount > 0 && (
							<div className="absolute -bottom-2 -right-1 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded-full shadow-md border border-gray-100 dark:border-slate-600 text-[11px]">
								<span className="text-blue-600">👍</span>
								<span className="text-gray-600 dark:text-slate-400">{likesCount}</span>
							</div>
						)}
					</div>

					{/* Actions row */}
					<div className="flex items-center gap-3 mt-0.5 ml-1">
						<button
							onClick={handleLike}
							disabled={isLiking}
							className={`text-[12px] font-semibold transition-colors ${isLiked
								? 'text-blue-600 dark:text-blue-400'
								: 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
								}`}
						>
							{isLiked ? 'Liked' : 'Like'}
						</button>
						<button
							onClick={() => setShowReplyInput(true)}
							className="text-[12px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
						>
							Reply
						</button>
						<span className="text-[11px] text-gray-500 dark:text-slate-400">
							{formatTimestamp(comment.createdAt)}
						</span>

						{isAuthor && (
							<button
								onClick={() => onDeleteComment(comment.id, postId)}
								className="text-[12px] font-semibold text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
							>
								Delete
							</button>
						)}
					</div>

					{/* Reply input */}
					{showReplyInput && (
						<ReplyInput
							currentUser={currentUser}
							replyText={replyText}
							setReplyText={setReplyText}
							onSubmit={handlePostReply}
							onCancel={() => setShowReplyInput(false)}
							isSubmitting={isSubmitting}
							placeholder="Write a reply..."
						/>
					)}

					{/* Replies section */}
					{hasReplies && (
						<div className="mt-2">
							{!showReplies ? (
								<button
									onClick={() => setShowReplies(true)}
									className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors ml-1"
								>
									<svg className="w-3.5 h-3.5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
									</svg>
									View {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
								</button>
							) : (
								<div className="relative pl-4 mt-2 animate-slide-down">
									{/* Thread line */}
									<div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-slate-600" />

									<button
										onClick={() => setShowReplies(false)}
										className="flex items-center gap-1 text-[12px] text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 mb-2"
									>
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
										</svg>
										Hide replies
									</button>

									<div className="space-y-1">
										{comment.replies.map(reply => (
											<Reply
												key={reply.id}
												reply={reply}
												sessionUserId={sessionUserId}
												currentUser={currentUser}
												onDeleteReply={onDeleteComment}
												postId={postId}
												onReply={onReply}
												onLike={onLike}
												commentId={comment.id}
												depth={1}
												targetCommentId={targetCommentId}
												onReport={onReport}
											/>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{showReportModal && (
				<ReportConfirmationModal
					isOpen={showReportModal}
					onClose={() => setShowReportModal(false)}
					onConfirm={() => {
						setShowReportModal(false);
						onReport?.(comment.id, 'COMMENT');
					}}
				/>
			)}

			<style jsx>{`
				@keyframes slide-down {
					from {
						opacity: 0;
						transform: translateY(-8px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				@keyframes scale-in {
					from {
						opacity: 0;
						transform: scale(0.95);
					}
					to {
						opacity: 1;
						transform: scale(1);
					}
				}
				.animate-slide-down {
					animation: slide-down 0.2s ease-out;
				}
				.animate-scale-in {
					animation: scale-in 0.2s ease-out;
				}
			`}</style>
		</div>
	);
};
