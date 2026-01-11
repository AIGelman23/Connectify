import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Comment, Reply } from './Comment';
import EmojiSelector from './EmojiSelector'; // Import the EmojiSelector component 

const MAX_COMMENT_LENGTH = 280;

export default function PostCard({ post, sessionUserId, setPostError: propSetPostError, openReplyModal, isPreview = false }) {
	const { data: session } = useSession();
	const [activeCommentForPost, setActiveCommentForPost] = useState(null);
	const [showMenu, setShowMenu] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState(post.content || "");
	const [editLoading, setEditLoading] = useState(false);
	const [editError, setEditError] = useState("");
	const [notificationsOff, setNotificationsOff] = useState(false);
	const [commentInputText, setCommentInputText] = useState('');
	const [isLiked, setIsLiked] = useState(post.likedByCurrentUser || false);
	const [likesCount, setLikesCount] = useState(post.likesCount || 0);
	const [isSaved, setIsSaved] = useState(post.isSaved || false);
	const [isLiking, setIsLiking] = useState(false);
	const [showRepostMenu, setShowRepostMenu] = useState(false);
	const [showQuoteModal, setShowQuoteModal] = useState(false);
	const [quoteContent, setQuoteContent] = useState("");
	const commentInputRef = useRef(null);
	const commentContainerRef = useRef(null);
	const queryClient = useQueryClient();
	const videoRef = useRef(null);
	const [localError, setLocalError] = useState(null);
	const setPostError = propSetPostError || setLocalError;

	// Auto-play video when in viewport
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handlePlay = (entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					video.play().catch(() => { });
				} else {
					video.pause();
				}
			});
		};

		const observer = new window.IntersectionObserver(handlePlay, {
			threshold: 0.5, // Play when at least 50% visible
		});

		observer.observe(video);

		return () => {
			observer.unobserve(video);
		};
	}, [post.videoUrl]);

	// Sync isSaved with prop changes (e.g. after refetch)
	useEffect(() => {
		setIsSaved(post.isSaved || false);
	}, [post.isSaved]);

	// Auto-resize comment textarea
	useEffect(() => {
		if (commentInputRef.current) {
			commentInputRef.current.style.height = 'auto';
			commentInputRef.current.style.height = `${commentInputRef.current.scrollHeight}px`;
		}
	}, [commentInputText]);

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleAddComment(e);
		}
	};

	// Like/Unlike Post Mutation
	const { mutate: toggleLikePost } = useMutation({
		mutationFn: async ({ postId, isLiking }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId, action: isLiking ? 'like' : 'unlike' }),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to update like.");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			// Revert optimistic update
			setIsLiked(prev => !prev);
			setLikesCount(prev => isLiked ? prev + 1 : Math.max(0, prev - 1));
			setPostError(err.message || "Failed to update like. Please try again.");
		},
	});

	// Add Comment Mutation
	const { mutate: addComment, isPending: isCommenting } = useMutation({
		mutationFn: async ({ postId, commentContent }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId, action: 'comment', comment: commentContent }),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to add comment.");
			}
			return res.json();
		},
		onSuccess: () => {
			setActiveCommentForPost(null); // Close comment input after successful post
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setPostError(err.message || "Failed to add comment. Please try again.");
		},
	});

	// Reply to Comment Mutation
	const { mutateAsync: replyToComment } = useMutation({
		mutationFn: async ({ postId, commentId, commentContent, parentId }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					postId,
					action: 'reply_comment',
					commentId,
					commentContent,
					parentId, // For nested replies (reply to a reply)
				}),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to reply.");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setPostError(err.message || "Failed to reply. Please try again.");
		},
	});

	// Delete Comment/Reply Mutation
	const { mutate: deleteCommentOrReply } = useMutation({
		mutationFn: async ({ commentId, postId }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'delete_comment',
					commentId: commentId,
					postId: postId
				}),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to delete comment/reply.");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setPostError(err.message || "Failed to delete comment/reply. Please try again.");
		},
	});

	// Like/Unlike Comment/Reply Mutation
	const { mutate: likeCommentOrReply } = useMutation({
		mutationFn: async ({ commentId, isLiking }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: isLiking ? 'like_comment' : 'unlike_comment',
					commentId: commentId,
				}),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to update like.");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setPostError(err.message || "Failed to update like. Please try again.");
		},
	});

	// Vote on Poll Mutation
	const { mutate: voteOnPoll, isPending: isVoting, variables: votingVariables } = useMutation({
		mutationFn: async ({ postId, optionId }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId, action: 'vote', optionId }),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to vote.");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setPostError(err.message || "Failed to vote. Please try again.");
		},
	});

	// Retract Vote Mutation
	const { mutate: retractVote, isPending: isRetracting } = useMutation({
		mutationFn: async ({ postId }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId, action: 'retract_vote' }),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to retract vote.");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setPostError(err.message || "Failed to retract vote. Please try again.");
		},
	});

	// Pin/Unpin Post Mutation
	const { mutate: togglePinPost } = useMutation({
		mutationFn: async ({ postId, isPinned }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId, action: isPinned ? 'unpin' : 'pin' }),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to update pin status.");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setPostError(err.message || "Failed to update pin status.");
		},
	});

	// Save/Unsave Post Mutation
	const { mutate: toggleSavePost } = useMutation({
		mutationFn: async ({ isSaving }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId: post.id, action: isSaving ? 'save' : 'unsave' }),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to update save status.");
			}
			return res.json();
		},
		onSuccess: () => {
			// We don't necessarily need to invalidate queries here if we handle state locally
		},
		onError: (err) => {
			setIsSaved(prev => !prev); // Revert optimistic update
			setPostError(err.message || "Failed to save post.");
		},
	});

	// Repost Mutation
	const { mutate: repostPost, isPending: isReposting } = useMutation({
		mutationFn: async ({ content } = {}) => {
			const res = await fetch('/api/posts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ originalPostId: post.id, content }),
			});
			if (!res.ok) throw new Error("Failed to repost.");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
			setShowQuoteModal(false);
			setQuoteContent("");
			setShowRepostMenu(false);
		},
	});

	const handleLike = useCallback(() => {
		if (!sessionUserId || isPreview) {
			setPostError("You must be logged in to like a post.");
			return;
		}
		if (isLiking) return;

		setIsLiking(true);
		const newIsLiked = !isLiked;

		// Optimistic update
		setIsLiked(newIsLiked);
		setLikesCount(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));

		toggleLikePost(
			{ postId: post.id, isLiking: newIsLiked },
			{
				onSettled: () => setIsLiking(false),
			}
		);
	}, [post.id, sessionUserId, toggleLikePost, setPostError, isLiked, isLiking]);

	const handleSave = useCallback(() => {
		if (!sessionUserId || isPreview) {
			setPostError("You must be logged in to save a post.");
			return;
		}
		const newIsSaved = !isSaved;
		// Optimistic update
		setIsSaved(newIsSaved);
		toggleSavePost({ isSaving: newIsSaved });
	}, [sessionUserId, isPreview, toggleSavePost, setPostError, isSaved]);

	const handleRepostClick = useCallback(() => {
		if (!sessionUserId || isPreview) {
			setPostError("You must be logged in to repost.");
			return;
		}
		setShowRepostMenu((prev) => !prev);
	}, [sessionUserId, isPreview, setPostError]);

	const handleInstantRepost = useCallback(() => {
		repostPost({});
	}, [repostPost]);

	const handleQuoteRepost = useCallback(() => {
		setShowQuoteModal(true);
		setShowRepostMenu(false);
	}, []);

	const handleAddComment = useCallback((e) => {
		e.preventDefault();
		if (!sessionUserId) {
			setPostError("You must be logged in to comment on a post.");
			return;
		}
		if (commentInputText.trim()) {
			addComment({ postId: post.id, commentContent: commentInputText });
			setCommentInputText(''); // Clear input
		}
	}, [post.id, sessionUserId, addComment, setPostError, commentInputText]);

	const handleReply = useCallback(async (commentId, replyText, parentId = null) => {
		if (!sessionUserId) {
			setPostError("You must be logged in to reply.");
			return;
		}
		if (replyText.trim()) {
			await replyToComment({
				postId: post.id,
				commentId,
				commentContent: replyText,
				parentId, // For nested replies (reply to a reply)
			});
		}
	}, [post.id, sessionUserId, replyToComment, setPostError]);

	const handleDeleteComment = useCallback((commentId, postId) => {
		if (!sessionUserId) {
			setPostError("You must be logged in to delete a comment.");
			return;
		}
		if (confirm("Are you sure you want to delete this comment/reply? This action cannot be undone.")) {
			deleteCommentOrReply({ commentId, postId });
		}
	}, [sessionUserId, deleteCommentOrReply, setPostError]);

	const handleLikeComment = useCallback((commentId, isLiking) => {
		if (!sessionUserId) {
			setPostError("You must be logged in to like.");
			return;
		}
		likeCommentOrReply({ commentId, isLiking });
	}, [sessionUserId, likeCommentOrReply, setPostError]);

	const toggleCommentSection = () => {
		setActiveCommentForPost(prevId => (prevId === post.id ? null : post.id));
	};

	const handlePostTypeAction = (type) => {
		alert(`${type} functionality not implemented yet.`);
	};

	// Edit Post Mutation (newly added)
	const { mutate: editPost } = useMutation({
		mutationFn: async ({ postId, content }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId, action: 'edit', content }),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to edit post.");
			}
			return res.json();
		},
		onSuccess: () => {
			setIsEditing(false);
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setEditError(err.message || "Failed to edit post. Please try again.");
		},
	});

	const handleEditPost = async () => {
		setEditLoading(true);
		setEditError("");
		try {
			await editPost({ postId: post.id, content: editContent });
		} catch (err) {
			setEditError(err.message || "Failed to edit post.");
		} finally {
			setEditLoading(false);
		}
	};

	const handleToggleNotifications = () => {
		setNotificationsOff((prev) => !prev);
		// Optionally, call backend to persist notification preference
	};

	// Helper to format timestamp if not already present
	const getTimestamp = () => {
		if (post.timestamp) return post.timestamp;
		if (post.createdAt) {
			const date = new Date(post.createdAt);
			const now = new Date();
			const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
			const diffMinutes = Math.round(diffSeconds / 60);
			const diffHours = Math.round(diffMinutes / 60);
			const diffDays = Math.round(diffHours / 24);
			if (diffMinutes < 1) return "Just now";
			if (diffMinutes < 60) return `${diffMinutes}m ago`;
			if (diffHours < 24) return `${diffHours}h ago`;
			if (diffDays < 7) return `${diffDays}d ago`;
			return date.toLocaleDateString();
		}
		return "";
	};

	// Add the missing handleAddEmoji function
	const handleAddEmoji = (emoji) => {
		setCommentInputText(prev => prev + emoji);
		// Focus back on the comment input after adding emoji
		if (commentInputRef.current) {
			setTimeout(() => commentInputRef.current.focus(), 0);
		}
	};

	return (
		<div key={post.id} className="post-card bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-200 dark:border-slate-700 mb-6 w-full max-w-2xl mx-auto transition hover:shadow-lg dark:shadow-slate-900/30">
			{/* Header */}
			<div className="flex items-center justify-between px-4 pt-4 pb-2">
				<div className="flex items-center">
					<Link href={`/profile/${post.author?.id || ''}`} className="group flex-shrink-0">
						<img
							src={
								post.author?.profile?.profilePictureUrl ||
								post.author?.image ||
								post.author?.imageUrl ||
								`https://placehold.co/40x40/A78BFA/ffffff?text=${post.author?.name ? post.author.name[0].toUpperCase() : 'U'}`
							}
							alt={`${post.author?.name || "User"}'s avatar`}
							className="w-11 h-11 rounded-full object-cover border-2 border-white shadow group-hover:ring-2 group-hover:ring-blue-500 transition cursor-pointer"
						/>
					</Link>
					<div className="ml-3">
						<Link href={`/profile/${post.author?.id || ''}`} className="font-semibold text-gray-900 dark:text-slate-100 leading-tight hover:underline hover:text-blue-600 focus:underline outline-none text-[16px]">
							{post.author?.name}
						</Link>
						{/* --- Show tagged friends if present --- */}
						{Array.isArray(post.taggedFriends) && post.taggedFriends.length > 0 && (
							<div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
								<span>
									with{" "}
									{post.taggedFriends.map((friend, idx) => (
										<span key={friend.id || friend._id || idx}>
											{idx > 0 && ", "}
											<Link href={`/profile/${friend.id || friend._id || ''}`} className="font-medium text-blue-700 dark:text-blue-400 hover:underline">
												{friend.name}
											</Link>
										</span>
									))}
								</span>
							</div>
						)}
						<div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-slate-400 mt-0.5">
							<span title={new Date(post.createdAt).toLocaleString()}>{getTimestamp()}</span>
							<span aria-hidden="true">·</span>
							<span title="Public" className="inline-flex items-center">
								<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-gray-400"><path d="M10 2C5.03 2 1 6.03 1 11c0 4.97 4.03 9 9 9s9-4.03 9-9c0-4.97-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7 0-3.87 3.13-7 7-7s7 3.13 7 7c0 3.87-3.13 7-7 7zm0-12c-2.76 0-5 2.24-5 5 0 2.76 2.24 5 5 5s5-2.24 5-5c0-2.76-2.24-5-5-5z" /></svg>
							</span>
						</div>
					</div>
				</div>
				{/* Menu button */}
				{!isPreview && (
					<div className="relative">
						<button
							className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
							aria-label="Post actions"
							onClick={() => setShowMenu((v) => !v)}
						>
							<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><g fillRule="evenodd"><circle cx="4" cy="10" r="2" /><circle cx="10" cy="10" r="2" /><circle cx="16" cy="10" r="2" /></g></svg>
						</button>
						{showMenu && (
							<div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
								{sessionUserId === post.author?.id && (
									<button
										className="block w-full text-left px-4 py-2 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
										onClick={() => { togglePinPost({ postId: post.id, isPinned: post.isPinned }); setShowMenu(false); }}
									>
										{post.isPinned ? "Unpin Post" : "Pin Post"}
									</button>
								)}
								{sessionUserId === post.author?.id && (
									<button
										className="block w-full text-left px-4 py-2 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
										onClick={() => { setIsEditing(true); setShowMenu(false); }}
									>
										Edit Post
									</button>
								)}
								<button
									className="block w-full text-left px-4 py-2 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
									onClick={() => { handleToggleNotifications(); setShowMenu(false); }}
								>
									{notificationsOff ? "Turn On Notifications" : "Turn Off Notifications"}
								</button>
							</div>
						)}
					</div>
				)}
			</div>

			{post.isPinned && (
				<div className="px-4 pb-1 text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
					<i className="fas fa-thumbtack transform rotate-45"></i> Pinned
				</div>
			)}

			{/* Reposted Content */}
			{post.originalPost && (
				<div className="px-4 pb-2">
					<div className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 bg-gray-50 dark:bg-slate-700/50">
						<div className="flex items-center mb-2">
							<Link href={`/profile/${post.originalPost.author.id || ''}`} className="flex-shrink-0">
								<img
									src={post.originalPost.author.imageUrl || `https://placehold.co/32x32/A78BFA/ffffff?text=${post.originalPost.author.name[0]}`}
									alt={post.originalPost.author.name}
									className="w-6 h-6 rounded-full object-cover mr-2 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
								/>
							</Link>
							<Link href={`/profile/${post.originalPost.author.id || ''}`} className="font-semibold text-sm text-gray-900 dark:text-slate-100 hover:underline hover:text-blue-600">{post.originalPost.author.name}</Link>
						</div>
						<p className="text-sm text-gray-800 dark:text-slate-200 mb-2">{post.originalPost.content}</p>
						{post.originalPost.imageUrl && (
							<img src={post.originalPost.imageUrl} alt="Original post media" className="rounded-lg max-h-48 w-full object-cover" />
						)}
						{post.originalPost.videoUrl && (
							<video src={post.originalPost.videoUrl} controls className="rounded-lg max-h-48 w-full object-cover" />
						)}
					</div>
				</div>
			)}

			{/* Content */}
			{isEditing ? (
				<div className="px-4 pb-2">
					<textarea
						className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 mb-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
						value={editContent}
						onChange={e => setEditContent(e.target.value)}
						rows={3}
						disabled={editLoading}
					/>
					<div className="flex gap-2">
						<button
							className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
							onClick={handleEditPost}
							disabled={editLoading}
						>
							{editLoading ? "Saving..." : "Save"}
						</button>
						<button
							className="bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 px-4 py-1 rounded hover:bg-gray-300 dark:hover:bg-slate-500"
							onClick={() => setIsEditing(false)}
							disabled={editLoading}
						>
							Cancel
						</button>
					</div>
					{editError && <div className="text-red-500 dark:text-red-400 text-sm mt-1">{editError}</div>}
				</div>
			) : (
				<>
					{post.content && (
						<div className="px-4 pb-2 text-gray-900 dark:text-slate-100 text-[15px] leading-relaxed whitespace-pre-line">
							{post.content}
							{post.updatedAt && post.updatedAt !== post.createdAt && (
								<span className="ml-2 text-xs text-gray-400 dark:text-slate-500">(edited)</span>
							)}
						</div>
					)}
				</>
			)}

			{/* Media */}
			{post.imageUrl && (
				<div className="flex justify-center px-4 pb-2">
					<img
						src={post.imageUrl}
						alt="Post attachment"
						className={`rounded-xl border border-gray-200 shadow max-h-96 w-full ${post.imageUrl.endsWith('.gif') ? 'object-contain' : 'object-cover'} bg-gray-100`}
						style={{ maxWidth: "100%" }}
					/>
				</div>
			)}
			{post.videoUrl && (
				<div className="flex justify-center px-4 pb-2">
					<video
						ref={videoRef}
						src={post.videoUrl}
						controls
						muted
						playsInline
						className="rounded-xl border border-gray-200 shadow max-h-96 w-full bg-black"
						style={{ maxWidth: "100%" }}
					>
						<source src={post.videoUrl} type="video/mp4" />
						<source src={post.videoUrl} type="video/webm" />
						<source src={post.videoUrl} type="video/ogg" />
						Your browser does not support the video tag.
					</video>
				</div>
			)}

			{/* Poll Display */}
			{post.pollOptions && post.pollOptions.length > 0 && (
				<div className="px-4 pb-2">
					{(() => {
						// Calculate total votes if options are objects with counts
						const totalVotes = post.pollOptions.reduce((acc, opt) => acc + (typeof opt === 'object' ? (opt.count || 0) : 0), 0);
						// Check if user has voted (assuming post.userVote contains the optionId)
						const userVotedOptionId = post.userVote;
						const hasVoted = !!userVotedOptionId;
						const isExpired = post.expiresAt && new Date(post.expiresAt) < new Date();
						const timeLeft = post.expiresAt ? new Date(post.expiresAt).toLocaleDateString() : null;

						return (
							<div className="space-y-2">
								{post.pollOptions.map((option, index) => {
									const isObject = typeof option === 'object';
									const optionText = isObject ? option.text : option;
									const optionId = isObject ? option.id : index;
									const voteCount = isObject ? (option.count || 0) : 0;
									const isSelected = userVotedOptionId === optionId;
									const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

									const isVotingForThis = isVoting && votingVariables?.optionId === optionId;
									const isRetractingThis = isRetracting && isSelected;
									const isLoading = isVotingForThis || isRetractingThis;

									return (
										<div key={optionId || index} className="relative group">
											{hasVoted ? (
												// Result View
												<div
													className={`relative w-full px-4 py-2 border rounded-lg overflow-hidden transition ${!isExpired ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700' : ''} ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-600'}`}
													onClick={() => {
														if (isPreview || isVoting || isRetracting || isExpired) return;
														if (isSelected) {
															retractVote({ postId: post.id });
														} else {
															voteOnPoll({ postId: post.id, optionId });
														}
													}}
												>
													{/* Progress Bar */}
													<div
														className={`absolute top-0 left-0 h-full transition-all duration-500 ${isSelected ? 'bg-blue-200 dark:bg-blue-800/40' : 'bg-gray-100 dark:bg-slate-700'}`}
														style={{ width: `${percentage}%` }}
													/>
													<div className="relative flex justify-between items-center z-10">
														<span className={`font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-slate-200'}`}>
															{optionText}
															{isLoading && <i className="fas fa-spinner fa-spin ml-2"></i>}
															{!isLoading && isSelected && <i className="fas fa-check-circle ml-1"></i>}
														</span>
														<span className="text-sm text-gray-600 dark:text-slate-400">
															{percentage}% ({voteCount})
														</span>
													</div>
												</div>
											) : (
												// Voting View
												<button
													onClick={() => {
														if (!isPreview && sessionUserId && !isExpired) {
															voteOnPoll({ postId: post.id, optionId });
														} else if (!sessionUserId) {
															setPostError("You must be logged in to vote.");
														}
													}}
													disabled={isPreview || isVoting || isRetracting || isExpired}
													className={`w-full text-left px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg transition flex justify-between items-center group ${isPreview || isVoting || isRetracting || isExpired ? 'cursor-not-allowed opacity-80' : 'hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300'}`}
												>
													<span className="text-gray-800 dark:text-slate-200 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">
														{optionText}
														{isLoading && <i className="fas fa-spinner fa-spin ml-2"></i>}
													</span>
												</button>
											)}
										</div>
									);
								})}
								{(totalVotes > 0 || isExpired) && (
									<div className="flex justify-between items-center mt-1">
										<span className="text-xs text-gray-500 dark:text-slate-400">
											{isExpired ? `Poll ended on ${timeLeft}` : `Ends on ${timeLeft}`}
										</span>
										<span className="text-xs text-gray-500 dark:text-slate-400">{totalVotes} votes</span>
									</div>
								)}
							</div>
						);
					})()}
				</div>
			)}

			{/* Reactions/Stats Row */}
			<div className="flex items-center justify-between px-4 pt-2 pb-1 text-xs text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
				<div className="flex items-center space-x-2">
					<span className="flex items-center space-x-1">
						{/* Like SVG */}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="url(#like-gradient)" className="inline-block"><defs><linearGradient id="like-gradient" x1="2" y1="2" x2="14" y2="14" gradientUnits="userSpaceOnUse"><stop stopColor="#02ADFC" /><stop offset="0.5" stopColor="#0866FF" /><stop offset="1" stopColor="#2B7EFF" /></linearGradient></defs><path d="M7.3 3.87a.7.7 0 0 1 .7-.7c.67 0 1.22.55 1.22 1.22v1.75a.1.1 0 0 0 .1.1h1.8c.99 0 1.72.93 1.49 1.89l-.46 1.9A2.3 2.3 0 0 1 11 12.7H6.92a.58.58 0 0 1-.58-.58V7.74c0-.42.1-.83.28-1.2l.29-.57a3.7 3.7 0 0 0 .39-1.65v-.45zM4.37 7a.77.77 0 0 0-.77.77v3.26c0 .42.34.77.77.77h.77a.38.38 0 0 0 .38-.38V7.38A.38.38 0 0 0 5.14 7h-.77z" fill="#0866FF" /></svg>
						<span className="font-medium">{likesCount}</span>
					</span>
				</div>
				<div className="flex items-center space-x-2">
					<span className="hover:underline cursor-pointer">{post.commentsCount || 0} Comments</span>
				</div>
			</div>

			{/* Actions Row */}
			<div className="flex justify-between items-center px-2 py-1 gap-2">
				<button
					onClick={handleLike}
					disabled={isLiking || isPreview}
					className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 font-semibold transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 mx-1 ${isLiked
						? 'text-blue-600 dark:text-blue-400'
						: 'text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
						} ${isLiking || isPreview ? 'opacity-50 cursor-not-allowed' : ''}`}
				>
					{isLiking ? (
						<i className="fas fa-spinner fa-spin"></i>
					) : (
						<svg width="20" height="20" viewBox="0 0 16 16" fill={isLiked ? "#0866FF" : "none"}>
							<path d="M7.3 3.87a.7.7 0 0 1 .7-.7c.67 0 1.22.55 1.22 1.22v1.75a.1.1 0 0 0 .1.1h1.8c.99 0 1.72.93 1.49 1.89l-.46 1.9A2.3 2.3 0 0 1 11 12.7H6.92a.58.58 0 0 1-.58-.58V7.74c0-.42.1-.83.28-1.2l.29-.57a3.7 3.7 0 0 0 .39-1.65v-.45zM4.37 7a.77.77 0 0 0-.77.77v3.26c0 .42.34.77.77.77h.77a.38.38 0 0 0 .38-.38V7.38A.38.38 0 0 0 5.14 7h-.77z" fill="currentColor" />
						</svg>
					)}
					<span>{isLiked ? 'Liked' : 'Like'}</span>
				</button>
				<button
					onClick={toggleCommentSection}
					disabled={isPreview}
					className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 mx-1 ${isPreview ? 'opacity-50 cursor-not-allowed' : ''}`}
				>
					{/* Comment SVG */}
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3C5.58 3 2 6.13 2 10c0 1.61.7 3.09 1.9 4.27-.13.47-.5 1.47-1.2 2.36-.13.16-.02.4.18.4.06 0 .12-.02.17-.06 1.1-.8 2.1-1.2 2.6-1.36C7.1 16.44 8.5 17 10 17c4.42 0 8-3.13 8-7s-3.58-7-8-7z" fill="currentColor" /></svg>
					<span>Comment</span>
				</button>
				<div className="relative flex-1">
					<button
						type="button"
						disabled={isPreview}
						className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 mx-1 ${isPreview || isReposting ? 'opacity-50 cursor-not-allowed' : ''}`}
						onClick={handleRepostClick}
					>
						<i className={`fas fa-retweet ${isReposting ? 'fa-spin' : ''}`}></i>
						<span>Repost</span>
					</button>
					{showRepostMenu && (
						<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50 overflow-hidden animate-fade-in">
							<button
								onClick={handleInstantRepost}
								className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
							>
								<i className="fas fa-retweet mr-2"></i> Repost
							</button>
							<button
								onClick={handleQuoteRepost}
								className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
							>
								<i className="fas fa-pen mr-2"></i> Quote
							</button>
						</div>
					)}
				</div>
				<button
					type="button"
					disabled={isPreview}
					className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 font-semibold transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 mx-1 ${isSaved ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'} ${isPreview ? 'opacity-50 cursor-not-allowed' : ''}`}
					onClick={handleSave}
					title={isSaved ? "Unsave Post" : "Save Post"}
				>
					<i className={`${isSaved ? 'fas' : 'far'} fa-bookmark text-lg`}></i>
				</button>
			</div>

			{/* Error Message */}
			{localError && (
				<div className="px-4 pb-2 text-red-500 dark:text-red-400 text-sm">
					{localError}
				</div>
			)}

			{/* Comment Input and Top Comments (Facebook style) */}
			{!isPreview && (
				<div className="px-4 pt-2 pb-1">
					<form onSubmit={handleAddComment} className="flex items-center space-x-3 mb-3">
						<img
							src={session?.user?.image || `https://placehold.co/32x32/A78BFA/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`}
							alt="Your avatar"
							className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-200"
						/>
						<div className="flex-1 relative" ref={commentContainerRef}>
							<textarea
								ref={commentInputRef}
								name="commentInput"
								value={commentInputText}
								onChange={(e) => setCommentInputText(e.target.value)}
								onKeyDown={handleKeyDown}
								maxLength={MAX_COMMENT_LENGTH}
								placeholder="Write a comment..."
								className="w-full pl-4 pr-24 py-2 border border-gray-200 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm placeholder-gray-500 dark:placeholder-slate-400 resize-none overflow-hidden min-h-[40px]"
								rows={1}
							/>
							<div className="absolute right-2 bottom-2 flex items-center space-x-1">
								<span className={`text-xs ${commentInputText.length >= MAX_COMMENT_LENGTH ? 'text-red-600 font-bold' : (commentInputText.length > MAX_COMMENT_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-400')}`}>
									{commentInputText.length}/{MAX_COMMENT_LENGTH}
								</span>
								<EmojiSelector
									onEmojiSelect={handleAddEmoji}
									parentRef={commentContainerRef}
								/>
								<button
									type="submit"
									className="text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out p-1 rounded-full ml-1"
									aria-label="Post comment"
								>
									{/* Send SVG */}
									<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M2.94 17.94a1.5 1.5 0 0 0 1.6.33l13-5.5a1.5 1.5 0 0 0 0-2.74l-13-5.5A1.5 1.5 0 0 0 2 6.5v7a1.5 1.5 0 0 0 .94 1.44zM4 7.38l11.67 4.94L4 17.26V7.38z" /></svg>
								</button>
							</div>
							{commentInputText.length >= MAX_COMMENT_LENGTH && (
								<div className="absolute top-full right-0 mt-1 text-red-600 text-xs font-medium bg-red-50 px-2 py-1 rounded shadow-sm z-10 border border-red-100">
									Character limit reached!
								</div>
							)}
						</div>
					</form>
					{/* Comments Section */}
					{post.comments && post.comments.length > 0 && (
						<div className="space-y-2">
							{activeCommentForPost === post.id ? (
								/* Show ALL comments when expanded */
								post.comments
									.slice()
									.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0) || new Date(b.createdAt) - new Date(a.createdAt))
									.map(comment => (
										<Comment
											key={comment.id}
											comment={comment}
											onReply={handleReply}
											onLike={handleLikeComment}
											sessionUserId={sessionUserId}
											onDeleteComment={handleDeleteComment}
											postId={post.id}
										/>
									))
							) : (
								/* Show only top 2 comments when collapsed */
								post.comments
									.slice()
									.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0) || new Date(b.createdAt) - new Date(a.createdAt))
									.slice(0, 2)
									.map(comment => (
										<Comment
											key={comment.id}
											comment={comment}
											onReply={handleReply}
											onLike={handleLikeComment}
											sessionUserId={sessionUserId}
											onDeleteComment={handleDeleteComment}
											postId={post.id}
										/>
									))
							)}
							{post.comments.length > 2 && (
								<button
									className="mt-2 text-blue-600 hover:underline text-sm font-medium"
									onClick={toggleCommentSection}
								>
									{activeCommentForPost === post.id ? 'Hide comments' : 'View more comments'}
								</button>
							)}
						</div>
					)}
					{(!post.comments || post.comments.length === 0) && activeCommentForPost === post.id && (
						<p className="text-gray-500 dark:text-slate-400 text-sm text-center pt-2">No comments yet. Be the first to comment!</p>
					)}
				</div>
			)}

			{/* Quote Repost Modal */}
			{showQuoteModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowQuoteModal(false)}>
					<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
						<div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
							<h3 className="font-bold text-lg text-gray-900 dark:text-white">Quote Repost</h3>
							<button onClick={() => setShowQuoteModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">
								<i className="fas fa-times text-xl"></i>
							</button>
						</div>
						<div className="p-4">
							<textarea
								value={quoteContent}
								onChange={(e) => setQuoteContent(e.target.value)}
								placeholder="Add a comment..."
								className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white resize-none"
								rows={3}
								autoFocus
							/>
							<div className="mt-4 border border-gray-200 dark:border-slate-700 rounded-xl p-3 bg-gray-50 dark:bg-slate-700/50 opacity-80 pointer-events-none select-none">
								<div className="flex items-center mb-2">
									<img
										src={post.author.imageUrl || `https://placehold.co/32x32/A78BFA/ffffff?text=${post.author.name[0]}`}
										alt={post.author.name}
										className="w-6 h-6 rounded-full object-cover mr-2"
									/>
									<span className="font-semibold text-sm text-gray-900 dark:text-slate-100">{post.author.name}</span>
								</div>
								<p className="text-sm text-gray-800 dark:text-slate-200 line-clamp-2">{post.content}</p>
							</div>
						</div>
						<div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
							<button
								onClick={() => repostPost({ content: quoteContent })}
								disabled={isReposting}
								className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
							>
								{isReposting ? 'Posting...' : 'Post'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}