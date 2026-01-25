"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Comment, Reply } from './Comment';
import EmojiSelector from './EmojiSelector'; // Import the EmojiSelector component 
import Lightbox from './Lightbox';
import PhotoCollage from './PhotoCollage';
import { formatTimestamp } from '../lib/utils';
import { 
	Avatar, 
	ConfirmModal, 
	Modal,
	Dropdown, 
	DropdownTrigger, 
	DropdownMenu, 
	DropdownItem,
	Button,
	IconButton 
} from './ui';
import { VerifiedBadge, AdminBadge } from './ui/Badge';

const MAX_COMMENT_LENGTH = 280;

// Helper for simple text diffing
const computeDiff = (oldText = "", newText = "") => {
	const oldChars = (oldText || "").split("");
	const newChars = (newText || "").split("");

	let prefixLen = 0;
	while (prefixLen < oldChars.length && prefixLen < newChars.length && oldChars[prefixLen] === newChars[prefixLen]) {
		prefixLen++;
	}

	let suffixLen = 0;
	while (
		oldChars.length - 1 - suffixLen >= prefixLen &&
		newChars.length - 1 - suffixLen >= prefixLen &&
		oldChars[oldChars.length - 1 - suffixLen] === newChars[newChars.length - 1 - suffixLen]
	) {
		suffixLen++;
	}

	const result = [];
	if (prefixLen > 0) {
		result.push({ type: 'text', value: oldChars.slice(0, prefixLen).join('') });
	}

	const removed = oldChars.slice(prefixLen, oldChars.length - suffixLen).join('');
	const added = newChars.slice(prefixLen, newChars.length - suffixLen).join('');

	if (removed) result.push({ type: 'removed', value: removed });
	if (added) result.push({ type: 'added', value: added });

	if (suffixLen > 0) {
		result.push({ type: 'text', value: oldChars.slice(oldChars.length - suffixLen).join('') });
	}

	return result;
};

function EditHistoryModal({ postId, onClose }) {
	const { data: history, isLoading, error } = useQuery({
		queryKey: ['postHistory', postId],
		queryFn: async () => {
			const res = await fetch(`/api/posts/${postId}/history`);
			if (!res.ok) throw new Error("Failed to fetch edit history");
			const data = await res.json();
			return Array.isArray(data) ? data : (data.history || []);
		},
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	return (
		<Modal
			isOpen={true}
			onClose={onClose}
			title="Edit History"
			size="lg"
		>
			<div className="space-y-4 custom-scrollbar">
				{isLoading ? (
					<div className="flex justify-center py-8"><i className="fas fa-spinner fa-spin text-2xl text-blue-500"></i></div>
				) : error ? (
					<div className="text-center text-red-500 py-4">Failed to load history.</div>
				) : history && Array.isArray(history) && history.length > 0 ? (
					history.map((version, index) => {
						const isOriginal = index === history.length - 1;
						const prevVersion = history[index + 1];
						const diff = isOriginal ? [{ type: 'text', value: version.content }] : computeDiff(prevVersion?.content || "", version.content || "");

						return (
							<div key={index} className="border-b border-gray-100 dark:border-slate-700 last:border-0 pb-4 last:pb-0">
								<div className="flex items-center gap-2 mb-1">
									<span className="text-xs text-gray-500 dark:text-slate-400">{formatTimestamp(version.createdAt)}</span>
									{isOriginal && <span className="text-xs bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-500 dark:text-slate-400">Original</span>}
								</div>
								<div className="text-gray-800 dark:text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
									{diff.map((part, i) => (
										<span key={i} className={part.type === 'added' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200' : part.type === 'removed' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 line-through decoration-red-500' : ''}>{part.value}</span>
									))}
								</div>
							</div>
						);
					})
				) : (
					<div className="text-center text-gray-500 py-4">No edit history available.</div>
				)}
			</div>
		</Modal>
	);
}

export default function PostCard({ post, sessionUserId: propSessionUserId, setPostError: propSetPostError, openReplyModal, isPreview = false }) {
	const { data: session } = useSession();
	// Use prop sessionUserId if provided, otherwise fallback to session from useSession hook
	const sessionUserId = propSessionUserId || session?.user?.id;
	const [activeCommentForPost, setActiveCommentForPost] = useState(null);
	const [showMenu, setShowMenu] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState(post.content || "");
	const [editLoading, setEditLoading] = useState(false);
	const [editError, setEditError] = useState("");
	const [notificationsOff, setNotificationsOff] = useState(false);
	const [commentInputText, setCommentInputText] = useState('');
	const [userReaction, setUserReaction] = useState(post.currentUserReaction || (post.likedByCurrentUser ? "LIKE" : null));
	const [likesCount, setLikesCount] = useState(post.likesCount || 0);
	const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);
	const [isSaved, setIsSaved] = useState(post.isSaved || false);
	const [isLiking, setIsLiking] = useState(false);
	const [showRepostMenu, setShowRepostMenu] = useState(false);
	const [showQuoteModal, setShowQuoteModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
	const [showEditHistoryModal, setShowEditHistoryModal] = useState(false);
	const [commentToDelete, setCommentToDelete] = useState(null);
	const [quoteContent, setQuoteContent] = useState("");
	const commentInputRef = useRef(null);
	const commentContainerRef = useRef(null);
	const queryClient = useQueryClient();
	const videoRef = useRef(null);
	const [localError, setLocalError] = useState(null);
	const [showToast, setShowToast] = useState(false);
	const [showReactionMenu, setShowReactionMenu] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState(null);
	const setPostError = propSetPostError || setLocalError;
	const searchParams = useSearchParams();
	const targetCommentId = searchParams.get('commentId');
	const hasScrolledToComment = useRef(false);
	const reactionContainerRef = useRef(null);
	const longPressTimerRef = useRef(null);
	const isLongPress = useRef(false);
	const isNews = post.type === 'news';
	const isEdited = post.isEdited || (post.updatedAt && post.updatedAt !== post.createdAt);

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

	// Handle deep linking to comments - only scroll once
	useEffect(() => {
		if (!targetCommentId || !post.comments || hasScrolledToComment.current) return;

		const findComment = (comments) => {
			for (const c of comments) {
				if (c.id === targetCommentId) return true;
				if (c.replies) {
					// Simple check for nested replies in the structure
					const checkReplies = (replies) => {
						for (const r of replies) {
							if (r.id === targetCommentId) return true;
							if (r.replies && checkReplies(r.replies)) return true;
						}
						return false;
					};
					if (checkReplies(c.replies)) return true;
				}
			}
			return false;
		};

		if (findComment(post.comments)) {
			setActiveCommentForPost(post.id);
			// Scroll logic is handled via ID in the DOM, wait for render
			setTimeout(() => {
				const el = document.getElementById(`comment-${targetCommentId}`);
				if (el) {
					hasScrolledToComment.current = true; // Mark as scrolled
					el.scrollIntoView({ behavior: 'smooth', block: 'center' });
					el.classList.add('bg-blue-100', 'dark:bg-blue-900/40');
					setTimeout(() => el.classList.remove('bg-blue-100', 'dark:bg-blue-900/40'), 3000);
				}
			}, 500);
		}
	}, [targetCommentId, post.id, post.comments]);

	// Auto-resize comment textarea
	useEffect(() => {
		if (commentInputRef.current) {
			commentInputRef.current.style.height = 'auto';
			commentInputRef.current.style.height = `${commentInputRef.current.scrollHeight}px`;
		}
	}, [commentInputText]);

	// Close reaction menu when clicking outside (for mobile support)
	useEffect(() => {
		if (!showReactionMenu) return;

		const handleClickOutside = (event) => {
			if (reactionContainerRef.current && !reactionContainerRef.current.contains(event.target)) {
				setShowReactionMenu(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("touchstart", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("touchstart", handleClickOutside);
		};
	}, [showReactionMenu]);

	const handleTouchStart = () => {
		isLongPress.current = false;
		longPressTimerRef.current = setTimeout(() => {
			isLongPress.current = true;
			setShowReactionMenu(true);
			if (navigator.vibrate) navigator.vibrate(50);
		}, 500);
	};

	const handleTouchEnd = (e) => {
		if (longPressTimerRef.current) {
			clearTimeout(longPressTimerRef.current);
		}
		if (isLongPress.current && e.cancelable) {
			e.preventDefault();
		}
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleAddComment(e);
		}
	};

	// Like/Unlike Post Mutation
	const { mutate: toggleReaction } = useMutation({
		mutationFn: async ({ postId, reactionType }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId, action: reactionType ? 'react' : 'unreact', reactionType }),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to update reaction.");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			// Revert optimistic update
			queryClient.invalidateQueries({ queryKey: ['posts'] });
			setPostError(err.message || "Failed to update reaction. Please try again.");
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
	const { mutate: deleteCommentOrReply, isPending: isDeletingComment } = useMutation({
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
			setShowDeleteCommentModal(false);
			setCommentToDelete(null);
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

	// Delete Post Mutation
	const { mutate: deletePost, isPending: isDeleting } = useMutation({
		mutationFn: async ({ postId }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId, action: 'delete_post' }),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to delete post.");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setPostError(err.message || "Failed to delete post.");
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
		onMutate: async ({ isSaving }) => {
			await queryClient.cancelQueries({ queryKey: ['posts'] });

			const previousPosts = queryClient.getQueriesData({ queryKey: ['posts'] });

			queryClient.setQueriesData({ queryKey: ['posts'] }, (old) => {
				if (!old) return old;
				if (old.pages) {
					return {
						...old,
						pages: old.pages.map(page => ({
							...page,
							posts: page.posts.map(p => p.id === post.id ? { ...p, isSaved: isSaving } : p)
						}))
					};
				}
				if (Array.isArray(old)) {
					return old.map(p => p.id === post.id ? { ...p, isSaved: isSaving } : p);
				}
				// Handle single post object in cache
				if (old.id === post.id) {
					return { ...old, isSaved: isSaving };
				}
				return old;
			});

			return { previousPosts };
		},
		onSuccess: () => {
			// Invalidate posts queries to refresh saved posts list
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err, newTodo, context) => {
			if (context?.previousPosts) {
				context.previousPosts.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data);
				});
			}
			setIsSaved(prev => !prev); // Revert optimistic update
			setPostError(err.message || "Failed to save post.");
		},
	});

	// Bookmark News Mutation (creates a saved post from news article)
	const { mutate: bookmarkNews, isPending: isBookmarkingNews } = useMutation({
		mutationFn: async () => {
			// Create a post with the news content
			const newsContent = `📰 ${post.title}\n\n${post.content || ''}\n\n🔗 ${post.link}`;

			const createRes = await fetch('/api/posts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: newsContent,
					imageUrl: post.imageUrl,
					newsSource: post.author?.name || 'News',
					newsLink: post.link,
					type: 'news',
				}),
			});
			if (!createRes.ok) throw new Error("Failed to save news article.");
			const { post: newPost } = await createRes.json();

			// Now save the created post
			const saveRes = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId: newPost.id, action: 'save' }),
			});
			if (!saveRes.ok) throw new Error("Failed to bookmark news article.");
			return saveRes.json();
		},
		onSuccess: () => {
			setIsSaved(true);
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setPostError(err.message || "Failed to bookmark news article.");
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

	// Share News Mutation (for news articles that don't exist in DB)
	const { mutate: shareNews, isPending: isSharingNews } = useMutation({
		mutationFn: async ({ content = '' } = {}) => {
			// Create a post that shares the news article
			const newsContent = content
				? `${content}\n\n📰 ${post.title}\n🔗 ${post.link}`
				: `📰 ${post.title}\n\n${post.content || ''}\n\n🔗 ${post.link}`;

			const res = await fetch('/api/posts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: newsContent,
					imageUrl: post.imageUrl,
					newsSource: post.author?.name || 'News',
					newsLink: post.link,
				}),
			});
			if (!res.ok) throw new Error("Failed to share news.");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
			setShowQuoteModal(false);
			setQuoteContent("");
			setShowRepostMenu(false);
		},
	});

	// Share Post Mutation
	const { mutate: sharePost } = useMutation({
		mutationFn: async () => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId: post.id, action: 'share' }),
			});
			if (!res.ok) throw new Error("Failed to update share count.");
			return res.json();
		},
		onSuccess: () => {
			// queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
	});

	// Report Entity Mutation
	const { mutate: reportEntity } = useMutation({
		mutationFn: async ({ targetId, targetType }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'report', targetId, targetType }),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to report.");
			}
			return res.json();
		},
		onError: (err) => {
			setPostError(err.message || "Failed to report. Please try again.");
		},
		onSuccess: () => {
			alert("Content reported. Thank you for your feedback.");
		}
	});

	const handleReactionClick = useCallback((type = "LIKE") => {
		if (!sessionUserId || isPreview) {
			setPostError("You must be logged in to react to a post.");
			return;
		}
		if (isLiking) return;

		setIsLiking(true);

		// Determine new state
		let newReaction = type;
		let newCount = likesCount;

		if (userReaction === type) {
			// Toggle off if clicking same reaction
			newReaction = null;
			newCount = Math.max(0, likesCount - 1);
		} else {
			// Change reaction or add new
			if (!userReaction) {
				newCount = likesCount + 1;
			}
			// If changing from one type to another, count stays same (assuming count is total reactions)
		}

		// Optimistic update
		setUserReaction(newReaction);
		setLikesCount(newCount);
		setShowReactionMenu(false);

		toggleReaction(
			{ postId: post.id, reactionType: newReaction },
			{
				onSettled: () => setIsLiking(false),
			}
		);
	}, [post.id, sessionUserId, toggleReaction, setPostError, userReaction, likesCount, isLiking]);

	// Default click handler (Like button)
	const handleDefaultLike = () => handleReactionClick("LIKE");

	const handleSave = useCallback(() => {
		if (!sessionUserId || isPreview) {
			setPostError("You must be logged in to save a post.");
			return;
		}
		if (!post.id && !isNews) return;

		// For news items
		if (isNews) {
			// If already saved and has a post ID, allow unsaving
			if (isSaved && post.id) {
				setIsSaved(false);
				toggleSavePost({ isSaving: false });
				return;
			}
			// If not saved, create a post and bookmark it
			if (!isSaved) {
				bookmarkNews();
				return;
			}
			return;
		}

		// For regular posts, toggle save status
		const newIsSaved = !isSaved;
		// Optimistic update
		setIsSaved(newIsSaved);
		toggleSavePost({ isSaving: newIsSaved });
	}, [sessionUserId, isPreview, toggleSavePost, setPostError, isSaved, post.id, isNews, bookmarkNews]);

	const handleLightboxComment = (content) => {
		if (content.trim()) {
			addComment({ postId: post.id, commentContent: content });
		}
	};

	const handleInstantRepost = useCallback(() => {
		if (isNews) {
			shareNews({});
		} else {
			repostPost({});
		}
	}, [repostPost, shareNews, isNews]);

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
		setCommentToDelete({ commentId, postId });
		setShowDeleteCommentModal(true);
	}, [sessionUserId, setPostError]);

	const handleLikeComment = useCallback((commentId, isLiking) => {
		if (!sessionUserId) {
			setPostError("You must be logged in to like.");
			return;
		}
		likeCommentOrReply({ commentId, isLiking });
	}, [sessionUserId, likeCommentOrReply, setPostError]);

	const handleReport = useCallback((targetId, targetType) => {
		if (!sessionUserId) {
			setPostError("You must be logged in to report content.");
			return;
		}
		reportEntity({ targetId, targetType });
	}, [sessionUserId, reportEntity, setPostError]);

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

	const handleShare = async () => {
		if (typeof window !== 'undefined') {
			const url = `${window.location.origin}/dashboard?postId=${post.id}`;
			const shareData = {
				title: `Post by ${post.author?.name}`,
				text: post.content || 'Check out this post on ConnectifAI',
				url: url,
			};

			if (navigator.share) {
				try {
					await navigator.share(shareData);
					setSharesCount(prev => prev + 1);
					sharePost();
				} catch (err) {
					console.error("Error sharing:", err);
				}
			} else {
				handleCopyLink();
			}
		}
	};

	const handleCopyLink = () => {
		if (typeof window !== 'undefined') {
			const url = `${window.location.origin}/dashboard?postId=${post.id}`;
			navigator.clipboard.writeText(url)
				.then(() => {
					setShowToast(true);
					setTimeout(() => setShowToast(false), 3000);
					setSharesCount(prev => prev + 1);
					sharePost();
				})
				.catch((err) => console.error("Failed to copy link:", err));
			setShowMenu(false);
		}
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

	// Helper to get reaction icons
	const getReactionIcon = (type) => {
		switch (type) {
			case 'LOVE': return <div className="z-30 bg-white dark:bg-slate-800 rounded-full p-0.5"><i className="fas fa-heart text-red-500 text-sm"></i></div>;
			case 'HAHA': return <div className="z-20 bg-white dark:bg-slate-800 rounded-full p-0.5"><i className="fas fa-laugh-squint text-yellow-500 text-sm"></i></div>;
			case 'WOW': return <div className="z-10 bg-white dark:bg-slate-800 rounded-full p-0.5"><i className="fas fa-surprise text-yellow-500 text-sm"></i></div>;
			case 'SAD': return <div className="z-10 bg-white dark:bg-slate-800 rounded-full p-0.5"><i className="fas fa-sad-tear text-yellow-500 text-sm"></i></div>;
			case 'ANGRY': return <div className="z-10 bg-white dark:bg-slate-800 rounded-full p-0.5"><i className="fas fa-angry text-orange-500 text-sm"></i></div>;
			default: return <div className="z-30 bg-white dark:bg-slate-800 rounded-full p-0.5"><i className="fas fa-thumbs-up text-blue-600 text-sm"></i></div>;
		}
	};

	// Generate reaction summary
	const getReactionSummary = () => {
		if (likesCount === 0) return null;

		const latest = post.latestReactions || [];
		// Filter out current user from latest to avoid "You, You..."
		const others = latest.filter(r => r.user.id !== sessionUserId);

		let text = "";
		if (userReaction) {
			if (others.length === 0) {
				text = "You";
			} else if (others.length === 1) {
				text = `You and ${others[0].user.name}`;
			} else {
				text = `You, ${others[0].user.name} and ${likesCount - 2} others`;
			}
		} else {
			if (others.length === 0) {
				text = `${likesCount} ${likesCount === 1 ? 'person' : 'people'}`;
			} else if (others.length === 1) {
				text = others[0].user.name;
			} else if (others.length === 2) {
				text = `${others[0].user.name} and ${others[1].user.name}`;
			} else {
				text = `${others[0].user.name}, ${others[1].user.name} and ${likesCount - 2} others`;
			}
		}

		return text;
	};

	// Helper to check if URL is a Giphy image
	const isGiphyImage = (url) => url && (url.includes('giphy.com') || url.includes('giphy.gif'));

	// Helper to get visibility icon based on post.visibility
	const getVisibilityIcon = () => {
		switch (post.visibility) {
			case 'FRIENDS': return 'fa-user-friends';
			case 'SPECIFIC_FRIENDS': return 'fa-user-check';
			case 'PRIVATE': return 'fa-lock';
			case 'PUBLIC':
			default: return 'fa-globe-americas';
		}
	};

	// Helper to get visibility title based on post.visibility
	const getVisibilityTitle = () => {
		switch (post.visibility) {
			case 'FRIENDS': return 'Friends';
			case 'SPECIFIC_FRIENDS': return 'Specific Friends';
			case 'PRIVATE': return 'Only Me';
			case 'PUBLIC':
			default: return 'Public';
		}
	};

	const handleImageClick = (url, index) => {
		if (isNews && post.link) {
			window.open(post.link, '_blank', 'noopener,noreferrer');
		} else if (!isGiphyImage(url)) {
			setLightboxIndex(index);
		}
	};

	// Prepare images for lightbox (excluding Giphy images)
	const lightboxImages = post.imageUrls?.length > 0
		? post.imageUrls.filter(url => !isGiphyImage(url))
		: (post.imageUrl && !isGiphyImage(post.imageUrl) ? [post.imageUrl] : []);

	return (
		<div id={post.id} className={`post-card shadow-sm border mb-4 w-full max-w-2xl mx-auto ${isNews
			? 'bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20 border-blue-200 dark:border-blue-900/50'
			: 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
			}`}>
			{/* Toast Notification */}
			{showToast && (
				<div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900/90 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 backdrop-blur-sm animate-fade-in">
					<i className="fas fa-check-circle text-green-400"></i>
					<span className="text-sm font-medium">Link copied to clipboard</span>
				</div>
			)}

			{/* Pinned Indicator - only show on your own posts */}
			{post.isPinned && post.author?.id === session?.user?.id && (
				<div className="px-4 pt-3 text-xs font-semibold text-gray-500 dark:text-slate-400 flex items-center justify-end gap-2">
					<i className="fas fa-thumbtack transform rotate-45 text-blue-600 dark:text-blue-400"></i>
					<span>Pinned Post</span>
				</div>
			)}

			{/* Header */}
			<div className={`flex items-center justify-between px-3 sm:px-4 ${post.isPinned && post.author?.id === session?.user?.id ? 'pt-2' : 'pt-4'} pb-2`}>
				<div className="flex items-center">
					{isNews ? (
						<a href={post.link} target="_blank" rel="noopener noreferrer" className="group flex-shrink-0">
							<Avatar
								src={
									post.author?.profile?.profilePictureUrl ||
									post.author?.image ||
									post.author?.imageUrl
								}
								name={post.author?.name || "User"}
								alt={`${post.author?.name || "User"}'s avatar`}
								size="md"
								className="border-2 border-white shadow group-hover:ring-2 group-hover:ring-blue-500 transition cursor-pointer"
							/>
						</a>
					) : (
						<Link href={`/profile/${post.author?.id || ''}`} className="group flex-shrink-0">
							<Avatar
								src={
									post.author?.profile?.profilePictureUrl ||
									post.author?.image ||
									post.author?.imageUrl
								}
								name={post.author?.name || "User"}
								alt={`${post.author?.name || "User"}'s avatar`}
								size="md"
								className="border-2 border-white shadow group-hover:ring-2 group-hover:ring-blue-500 transition cursor-pointer"
							/>
						</Link>
					)}
					<div className="ml-2 sm:ml-3">
						<div className="flex items-center gap-1">
							{isNews ? (
								<a href={post.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-900 dark:text-slate-100 leading-tight hover:underline hover:text-blue-600 focus:underline outline-none text-sm sm:text-[16px]">
									{post.author?.name}
								</a>
							) : (
								<>
									<Link href={`/profile/${post.author?.id || ''}`} className="font-semibold text-gray-900 dark:text-slate-100 leading-tight hover:underline hover:text-blue-600 focus:underline outline-none text-sm sm:text-[16px]">
										{post.author?.name}
									</Link>
									{post.author?.role && post.author.role !== 'USER' && (
										<AdminBadge 
											role={post.author.role.toLowerCase()} 
											size="sm"
											showTooltip={true}
										/>
									)}
									{post.author?.subscriptionPlan && (
										<VerifiedBadge 
											plan={post.author.subscriptionPlan.toLowerCase()} 
											size="sm"
											showTooltip={true}
										/>
									)}
								</>
							)}
							{isNews && (
								<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
									<i className="fas fa-newspaper mr-1"></i> News
								</span>
							)}
						</div>
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
							<span title={getVisibilityTitle()} className="inline-flex items-center">
								<i className={`fas ${getVisibilityIcon()} text-gray-400 dark:text-slate-500 text-sm`}></i>
							</span>
						</div>
					</div>
				</div>
				{/* Menu button */}
				{!isPreview && (
					<Dropdown align="end" open={showMenu} onOpenChange={setShowMenu}>
						<DropdownTrigger asChild>
							<button
								className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
								aria-label="Post actions"
							>
								<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><g fillRule="evenodd"><circle cx="4" cy="10" r="2" /><circle cx="10" cy="10" r="2" /><circle cx="16" cy="10" r="2" /></g></svg>
							</button>
						</DropdownTrigger>
						<DropdownMenu width="sm">
							{sessionUserId === post.author?.id && (
								<DropdownItem
									icon="fas fa-thumbtack"
									onClick={() => togglePinPost({ postId: post.id, isPinned: post.isPinned })}
								>
									{post.isPinned ? "Unpin Post" : "Pin Post"}
								</DropdownItem>
							)}
							{sessionUserId === post.author?.id && (
								<DropdownItem
									icon="fas fa-edit"
									onClick={() => setIsEditing(true)}
								>
									Edit Post
								</DropdownItem>
							)}
							{isEdited && (
								<DropdownItem
									icon="fas fa-history"
									onClick={() => setShowEditHistoryModal(true)}
								>
									View Edit History
								</DropdownItem>
							)}
							{sessionUserId === post.author?.id && (
								<DropdownItem
									icon="fas fa-trash"
									danger
									onClick={() => setShowDeleteModal(true)}
								>
									Delete Post
								</DropdownItem>
							)}
							<DropdownItem
								icon={notificationsOff ? "fas fa-bell" : "fas fa-bell-slash"}
								onClick={handleToggleNotifications}
							>
								{notificationsOff ? "Turn On Notifications" : "Turn Off Notifications"}
							</DropdownItem>
							<DropdownItem
								icon="fas fa-link"
								onClick={handleCopyLink}
							>
								Copy Link
							</DropdownItem>
						</DropdownMenu>
					</Dropdown>
				)}
			</div>

			{/* Reposted Content */}
			{post.originalPost && (
				<div className="px-3 sm:px-4 py-2">
					<div className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 bg-gray-50 dark:bg-slate-700/50">
						<div className="flex items-center mb-2">
							<Link href={`/profile/${post.originalPost.author.id || ''}`} className="flex-shrink-0">
								<Avatar
									src={post.originalPost.author.imageUrl}
									name={post.originalPost.author.name}
									alt={post.originalPost.author.name}
									size="xs"
									className="mr-2 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
								/>
							</Link>
							<Link href={`/profile/${post.originalPost.author.id || ''}`} className="font-semibold text-sm text-gray-900 dark:text-slate-100 hover:underline hover:text-blue-600">{post.originalPost.author.name}</Link>
						</div>
						<p className="text-sm text-gray-800 dark:text-slate-200 mb-2">{post.originalPost.content}</p>
						{post.originalPost.imageUrl && (
							<img src={post.originalPost.imageUrl} alt="Original post media" className="rounded-lg max-h-48 w-full object-cover" />
						)}
						{post.originalPost.videoUrl && (
							<video src={post.originalPost.videoUrl} controls className="max-h-48 w-full object-cover !rounded-none" />
						)}
					</div>
				</div>
			)}

			{/* Content */}
			{isEditing ? (
				<div className="px-3 sm:px-4 py-2">
					<textarea
						className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 mb-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
						value={editContent}
						onChange={e => setEditContent(e.target.value)}
						rows={3}
						disabled={editLoading}
					/>
					<div className="flex gap-2">
						<Button
							variant="primary"
							size="sm"
							onClick={handleEditPost}
							loading={editLoading}
						>
							Save
						</Button>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => setIsEditing(false)}
							disabled={editLoading}
						>
							Cancel
						</Button>
					</div>
					{editError && <div className="text-red-500 dark:text-red-400 text-sm mt-1">{editError}</div>}
				</div>
			) : (
				<>
					{post.title && (
						<div className="px-3 sm:px-4 pt-1 pb-1">
							{isNews ? (
								<a
									href={post.link}
									target="_blank"
									rel="noopener noreferrer"
									className="font-bold text-lg text-gray-900 dark:text-slate-100 leading-tight hover:underline hover:text-blue-600 block"
								>
									{post.title}
								</a>
							) : (
								<h3 className="font-bold text-lg text-gray-900 dark:text-slate-100 leading-tight">{post.title}</h3>
							)}
						</div>
					)}
					{post.content && (
						<div className="px-3 sm:px-4 py-2 text-gray-900 dark:text-slate-100 text-sm sm:text-[15px] leading-relaxed whitespace-pre-line">
							{post.content}
							{isEdited && (
								<span className="ml-2 text-xs text-gray-400 dark:text-slate-500">(edited)</span>
							)}
						</div>
					)}
				</>
			)}

			{/* Media */}
			{post.imageUrls && post.imageUrls.length > 0 ? (
				<PhotoCollage
					images={post.imageUrls}
					onImageClick={(url) => handleImageClick(url, lightboxImages.indexOf(url))}
					layout={post.layout || 'classic'}
					autoScroll={lightboxIndex === null}
				/>
			) : post.imageUrl && (
				<div className="flex justify-center px-0 py-0">
					<img
						src={post.imageUrl}
						alt="Post attachment"
						className={`max-h-[350px] sm:max-h-[500px] w-full ${post.imageUrl.endsWith('.gif') ? 'object-contain bg-gray-50 dark:bg-slate-900' : 'object-cover'} ${(isNews || !isGiphyImage(post.imageUrl)) ? 'cursor-pointer hover:brightness-95 transition-all duration-200' : ''} rounded-none`}
						style={{ maxWidth: "100%" }}
						onClick={() => handleImageClick(post.imageUrl, 0)}
					/>
				</div>
			)}
			{post.videoUrl && (
				<div className="flex justify-center px-0 py-0">
					<video
						ref={videoRef}
						src={post.videoUrl}
						controls
						muted
						playsInline
						className="max-h-[350px] sm:max-h-[500px] w-full bg-black !rounded-none"
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
				<div className="px-3 sm:px-4 py-2">
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
											{/* Always show results with voting capability */}
											<div
												className={`relative w-full px-4 py-2 border rounded-lg overflow-hidden transition ${!isExpired && !isPreview ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700' : ''} ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-600'}`}
												onClick={() => {
													if (isPreview || isVoting || isRetracting || isExpired) return;
													if (!sessionUserId) {
														setPostError("You must be logged in to vote.");
														return;
													}
													if (isSelected) {
														retractVote({ postId: post.id });
													} else {
														voteOnPoll({ postId: post.id, optionId });
													}
												}}
											>
												{/* Progress Bar - always visible */}
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
			<div className="flex items-center justify-between px-3 sm:px-4 py-2 mt-1 text-xs text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
				<div className="flex items-center space-x-2">
					{likesCount > 0 && !isNews && (
						<div className="flex items-center cursor-pointer hover:underline">
							<div className="flex -space-x-1 mr-2">
								{/* Show unique reaction icons present on the post */}
								{[...new Set([
									userReaction,
									...(post.latestReactions || []).map(r => r.type)
								].filter(Boolean))].slice(0, 3).map((type, i) => (
									<div key={type} className="relative">
										{getReactionIcon(type)}
									</div>
								))}
							</div>
							<span className="font-medium text-gray-600 dark:text-slate-300">
								{getReactionSummary()}
							</span>
						</div>
					)}
				</div>
				<div className="flex items-center space-x-2">
					{!isNews && <span className="hover:underline cursor-pointer">{post.commentsCount || 0} Comments</span>}
					{sharesCount > 0 && (
						<span className="hover:underline cursor-pointer ml-2">{sharesCount} Shares</span>
					)}
				</div>
			</div>

			{/* Actions Row */}
			<div className="flex justify-between items-center px-2 sm:px-4 py-1 border-t border-gray-100 dark:border-slate-700">
				{!isNews ? (
					<div className="relative" ref={reactionContainerRef} onMouseLeave={() => setShowReactionMenu(false)}>
						{/* Reaction Menu */}
						{showReactionMenu && (
							<div className="absolute bottom-full left-0 pb-2 z-50">
								<div className="bg-white dark:bg-slate-800 shadow-lg rounded-full p-2 flex gap-1 animate-fade-in border border-gray-200 dark:border-slate-700">
									<button
										onClick={() => handleReactionClick("LIKE")}
										className="p-2 hover:scale-125 transition-transform text-blue-600"
										title="Like"
									>
										<i className="fas fa-thumbs-up text-2xl"></i>
									</button>
									<button
										onClick={() => handleReactionClick("LOVE")}
										className="p-2 hover:scale-125 transition-transform text-red-500"
										title="Love"
									>
										<i className="fas fa-heart text-2xl"></i>
									</button>
									<button
										onClick={() => handleReactionClick("HAHA")}
										className="p-2 hover:scale-125 transition-transform text-yellow-500"
										title="Haha"
									>
										<i className="fas fa-laugh-squint text-2xl"></i>
									</button>
									<button
										onClick={() => handleReactionClick("WOW")}
										className="p-2 hover:scale-125 transition-transform text-yellow-500"
										title="Wow"
									>
										<i className="fas fa-surprise text-2xl"></i>
									</button>
									<button
										onClick={() => handleReactionClick("SAD")}
										className="p-2 hover:scale-125 transition-transform text-yellow-500"
										title="Sad"
									>
										<i className="fas fa-sad-tear text-2xl"></i>
									</button>
									<button
										onClick={() => handleReactionClick("ANGRY")}
										className="p-2 hover:scale-125 transition-transform text-orange-500"
										title="Angry"
									>
										<i className="fas fa-angry text-2xl"></i>
									</button>
								</div>
							</div>
						)}
						<button
							onClick={handleDefaultLike}
							onMouseEnter={() => !isPreview && setShowReactionMenu(true)}
							onTouchStart={handleTouchStart}
							onTouchEnd={handleTouchEnd}
							disabled={isLiking || isPreview}
							className={`group flex items-center justify-center p-1.5 sm:p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${userReaction
								? (userReaction === 'LOVE' ? 'text-red-500 bg-red-50 dark:bg-red-900/20' :
									userReaction === 'HAHA' || userReaction === 'WOW' || userReaction === 'SAD' ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
										userReaction === 'ANGRY' ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' :
											'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
								)
								: 'text-gray-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'
								} ${isLiking || isPreview ? 'opacity-50 cursor-not-allowed' : ''}`}
							title={userReaction ? "Remove Reaction" : "Like"}
							aria-label={userReaction ? "Remove Reaction" : "Like"}
						>
							{isLiking ? (
								<i className="fas fa-spinner fa-spin text-xl"></i>
							) : (
								userReaction === 'LOVE' ? (
									<i className="fas fa-heart text-xl animate-pop"></i>
								) : userReaction === 'HAHA' ? (
									<i className="fas fa-laugh-squint text-xl animate-pop"></i>
								) : userReaction === 'WOW' ? (
									<i className="fas fa-surprise text-xl animate-pop"></i>
								) : userReaction === 'SAD' ? (
									<i className="fas fa-sad-tear text-xl animate-pop"></i>
								) : userReaction === 'ANGRY' ? (
									<i className="fas fa-angry text-xl animate-pop"></i>
								) : (
									<i className={`${userReaction === 'LIKE' ? 'fas animate-pop' : 'far'} fa-thumbs-up text-xl transform group-hover:scale-110 transition-transform`}></i>
								)
							)}
						</button>
					</div>
				) : (
					<div></div>
				)}
				<div className="relative flex-1">
					<Dropdown align="center" side="top" open={showRepostMenu} onOpenChange={setShowRepostMenu}>
						<DropdownTrigger asChild>
							<div className="flex justify-center">
								<button
									type="button"
									disabled={isPreview || isReposting || isSharingNews}
									className={`group flex items-center justify-center p-1.5 sm:p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-slate-800 hover:text-green-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500 ${isPreview || isReposting || isSharingNews ? 'opacity-50 cursor-not-allowed' : ''}`}
									title={isNews ? "Share News" : "Repost"}
									aria-label={isNews ? "Share News" : "Repost"}
								>
									<i className={`fas fa-retweet text-xl transform group-hover:scale-110 transition-transform ${(isReposting || isSharingNews) ? 'fa-spin' : ''}`}></i>
								</button>
							</div>
						</DropdownTrigger>
						<DropdownMenu width="sm">
							<DropdownItem icon="fas fa-retweet" onClick={handleInstantRepost}>
								{isNews ? 'Share to Feed' : 'Repost'}
							</DropdownItem>
							<DropdownItem icon="fas fa-pen" onClick={handleQuoteRepost}>
								{isNews ? 'Share with Comment' : 'Quote'}
							</DropdownItem>
						</DropdownMenu>
					</Dropdown>
				</div>
				<button
					type="button"
					disabled={isPreview}
					className={`group flex items-center justify-center p-1.5 sm:p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${isPreview ? 'opacity-50 cursor-not-allowed' : ''}`}
					onClick={handleShare}
					title="Share"
					aria-label="Share"
				>
					<i className="fas fa-share-nodes text-xl transform group-hover:scale-110 transition-transform"></i>
				</button>
				<button
					type="button"
					disabled={isPreview || isBookmarkingNews}
					className={`group flex items-center justify-center p-1.5 sm:p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-500 ${isSaved ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-500 dark:text-slate-400 hover:bg-yellow-50 dark:hover:bg-slate-800 hover:text-yellow-500'} ${isPreview || isBookmarkingNews ? 'opacity-50 cursor-not-allowed' : ''}`}
					onClick={handleSave}
					title={isSaved ? "Unsave Post" : "Save Post"}
					aria-label={isSaved ? "Unsave Post" : "Save Post"}
				>
					{isBookmarkingNews ? (
						<i className="fas fa-spinner fa-spin text-xl"></i>
					) : (
						<i className={`${isSaved ? 'fas' : 'far'} fa-bookmark text-xl transform group-hover:scale-110 transition-transform`}></i>
					)}
				</button>
			</div>

			{/* Error Message */}
			{localError && (
				<div className="px-4 py-2 text-red-500 dark:text-red-400 text-sm">
					{localError}
				</div>
			)}

			{/* Comment Input and Top Comments (Facebook style) */}
			{!isPreview && !isNews && (
				<div className="px-3 sm:px-4 py-2">
					<form onSubmit={handleAddComment} className="flex items-center space-x-2 sm:space-x-3 mb-3">
						<Avatar
							src={session?.user?.image}
							name={session?.user?.name || "User"}
							alt="Your avatar"
							size="sm"
							className="flex-shrink-0 border border-gray-200"
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
								className="w-full pl-3 sm:pl-4 pr-28 sm:pr-32 py-2.5 sm:py-3 border-none rounded-3xl bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-[15px] placeholder-gray-500 dark:placeholder-slate-400 resize-none overflow-hidden min-h-[40px] sm:min-h-[44px]"
								rows={1}
							/>
							<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
								{commentInputText.length > 0 && (
									<span className={`text-[10px] mr-1 ${commentInputText.length >= MAX_COMMENT_LENGTH ? 'text-red-600 font-bold' : (commentInputText.length > MAX_COMMENT_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-400 dark:text-slate-500')}`}>
										{commentInputText.length}/{MAX_COMMENT_LENGTH}
									</span>
								)}
								<EmojiSelector
									onEmojiSelect={handleAddEmoji}
								/>
								<button
									type="submit"
									disabled={!commentInputText.trim()}
									className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center w-8 h-8 ${commentInputText.trim() ? 'text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'text-gray-400 cursor-not-allowed'}`}
									aria-label="Post comment"
								>
									<i className="fas fa-paper-plane text-sm"></i>
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
								/* Show ALL comments when expanded - Scrollable Window */
								<div className="max-h-[500px] overflow-y-auto pr-1 custom-scrollbar space-y-3">
									{post.comments
										.slice()
										.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0) || new Date(b.createdAt) - new Date(a.createdAt))
										.map(comment => (
											<Comment
												key={comment.id}
												comment={comment}
												onReply={handleReply}
												onLike={handleLikeComment}
												sessionUserId={sessionUserId}
												currentUser={session?.user}
												onDeleteComment={handleDeleteComment}
												postId={post.id}
												targetCommentId={targetCommentId}
												onReport={handleReport}
											/>
										))}
								</div>
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
											currentUser={session?.user}
											onDeleteComment={handleDeleteComment}
											postId={post.id}
											targetCommentId={targetCommentId}
											onReport={handleReport}
										/>
									))
							)}
							{post.comments.length > 2 && (
								<Button
									variant="link"
									size="sm"
									onClick={toggleCommentSection}
									className="mt-2"
								>
									{activeCommentForPost === post.id ? 'Hide comments' : 'View more comments'}
								</Button>
							)}
						</div>
					)}
					{(!post.comments || post.comments.length === 0) && activeCommentForPost === post.id && (
						<p className="text-gray-500 dark:text-slate-400 text-sm text-center pt-2">No comments yet. Be the first to comment!</p>
					)}
				</div>
			)}

			{/* Quote Repost Modal */}
			<Modal
				isOpen={showQuoteModal}
				onClose={() => setShowQuoteModal(false)}
				title={isNews ? 'Share News Article' : 'Quote Repost'}
				size="lg"
				footer={
					<Button
						variant="primary"
						onClick={() => isNews ? shareNews({ content: quoteContent }) : repostPost({ content: quoteContent })}
						loading={isReposting || isSharingNews}
					>
						Post
					</Button>
				}
			>
				<textarea
					value={quoteContent}
					onChange={(e) => setQuoteContent(e.target.value)}
					placeholder="Add your thoughts..."
					className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white resize-none"
					rows={3}
					autoFocus
				/>
				<div className="mt-4 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-700/50 opacity-90 pointer-events-none select-none">
					{isNews && post.imageUrl && (
						<img
							src={post.imageUrl}
							alt={post.title || 'News'}
							className="w-full h-32 object-cover"
						/>
					)}
					<div className="p-3">
						<div className="flex items-center mb-2">
							<Avatar
								src={post.author?.imageUrl}
								name={post.author?.name || 'Unknown'}
								alt={post.author?.name || 'Author'}
								size="xs"
								className="mr-2"
							/>
							<span className="font-semibold text-sm text-gray-900 dark:text-slate-100">{post.author?.name || 'Unknown'}</span>
							{isNews && <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">News</span>}
						</div>
						{isNews && post.title && (
							<p className="font-medium text-sm text-gray-900 dark:text-slate-100 line-clamp-2 mb-1">{post.title}</p>
						)}
						<p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-2">{post.content}</p>
						{isNews && post.link && (
							<p className="text-xs text-blue-500 dark:text-blue-400 mt-2 truncate">{post.link}</p>
						)}
					</div>
				</div>
			</Modal>
			<style jsx>{`
				@keyframes pop {
					0% { transform: scale(1); }
					50% { transform: scale(1.4); }
					100% { transform: scale(1); }
				}
				.animate-pop {
					animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
				}
				@keyframes fade-in {
					0% { opacity: 0; transform: translateY(5px); }
					100% { opacity: 1; transform: translateY(0); }
				}
				.animate-fade-in {
					animation: fade-in 0.2s ease-out;
				}
				.custom-scrollbar::-webkit-scrollbar {
					width: 6px;
				}
				.custom-scrollbar::-webkit-scrollbar-track {
					background: transparent;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background-color: rgba(156, 163, 175, 0.5);
					border-radius: 20px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background-color: rgba(156, 163, 175, 0.8);
				}
			`}</style>

			<Lightbox
				images={lightboxImages}
				initialIndex={lightboxIndex}
				isOpen={lightboxIndex !== null}
				onClose={() => setLightboxIndex(null)}
				post={post}
				sessionUserId={sessionUserId}
				currentUser={session?.user}
				onLikeComment={handleLikeComment}
				onReply={handleReply}
				onDeleteComment={handleDeleteComment}
				onAddComment={handleLightboxComment}
				onReaction={handleReactionClick}
				onReport={handleReport}
				onSave={handleSave}
				isSaved={isSaved}
			/>

			{/* Delete Confirmation Modal */}
			<ConfirmModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={() => deletePost({ postId: post.id })}
				title="Delete Post"
				message="Are you sure you want to delete this post? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				variant="danger"
				loading={isDeleting}
			/>

			{/* Delete Comment Confirmation Modal */}
			<ConfirmModal
				isOpen={showDeleteCommentModal}
				onClose={() => setShowDeleteCommentModal(false)}
				onConfirm={() => commentToDelete && deleteCommentOrReply(commentToDelete)}
				title="Delete Comment"
				message="Are you sure you want to delete this comment? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				variant="danger"
				loading={isDeletingComment}
			/>

			{/* Edit History Modal */}
			{showEditHistoryModal && (
				<EditHistoryModal postId={post.id} onClose={() => setShowEditHistoryModal(false)} />
			)}
		</div>
	);
}