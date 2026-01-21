"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Comment, Reply } from './Comment';
import EmojiSelector from './EmojiSelector'; // Import the EmojiSelector component 
import Lightbox from './Lightbox';

const MAX_COMMENT_LENGTH = 280;

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

	const handleRepostClick = useCallback(() => {
		if (!sessionUserId || isPreview) {
			setPostError("You must be logged in to repost.");
			return;
		}
		setShowRepostMenu((prev) => !prev);
	}, [sessionUserId, isPreview, setPostError]);

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
		<div id={post.id} className={`post-card rounded-2xl shadow-sm border mb-6 w-full max-w-2xl mx-auto transition-all duration-200 hover:shadow-xl hover:scale-[1.01] ${isNews
			? 'bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20 border-blue-200 dark:border-blue-900/50'
			: 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 dark:shadow-slate-900/30 backdrop-blur-sm'
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
			<div className={`flex items-center justify-between px-4 ${post.isPinned && post.author?.id === session?.user?.id ? 'pt-2' : 'pt-4'} pb-2`}>
				<div className="flex items-center">
					{isNews ? (
						<a href={post.link} target="_blank" rel="noopener noreferrer" className="group flex-shrink-0">
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
						</a>
					) : (
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
					)}
					<div className="ml-3">
						<div className="flex items-center gap-2">
							{isNews ? (
								<a href={post.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-900 dark:text-slate-100 leading-tight hover:underline hover:text-blue-600 focus:underline outline-none text-[16px]">
									{post.author?.name}
								</a>
							) : (
								<Link href={`/profile/${post.author?.id || ''}`} className="font-semibold text-gray-900 dark:text-slate-100 leading-tight hover:underline hover:text-blue-600 focus:underline outline-none text-[16px]">
									{post.author?.name}
								</Link>
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
								{sessionUserId === post.author?.id && (
									<button
										className="block w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
										onClick={() => {
											setShowDeleteModal(true);
											setShowMenu(false);
										}}
									>
										Delete Post
									</button>
								)}
								<button
									className="block w-full text-left px-4 py-2 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
									onClick={() => { handleToggleNotifications(); setShowMenu(false); }}
								>
									{notificationsOff ? "Turn On Notifications" : "Turn Off Notifications"}
								</button>
								<button
									className="block w-full text-left px-4 py-2 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
									onClick={handleCopyLink}
								>
									Copy Link
								</button>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Reposted Content */}
			{post.originalPost && (
				<div className="px-4 py-2">
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
				<div className="px-4 py-2">
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
					{post.title && (
						<div className="px-4 pt-1 pb-1">
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
						<div className="px-4 py-2 text-gray-900 dark:text-slate-100 text-[15px] leading-relaxed whitespace-pre-line">
							{post.content}
							{post.updatedAt && post.updatedAt !== post.createdAt && (
								<span className="ml-2 text-xs text-gray-400 dark:text-slate-500">(edited)</span>
							)}
						</div>
					)}
				</>
			)}

			{/* Media */}
			{post.imageUrls && post.imageUrls.length > 0 ? (
				<div className="px-4 py-2">
					<div className={`grid gap-1 ${post.imageUrls.length === 1 ? 'grid-cols-1' :
						post.imageUrls.length === 2 ? 'grid-cols-2' :
							post.imageUrls.length === 3 ? 'grid-cols-2' : // 3 images: first one big, next two stacked? or just grid
								'grid-cols-2'
						}`}>
						{post.imageUrls.map((url, index) => {
							const isGiphy = isGiphyImage(url);
							const handleClick = () => handleImageClick(url, lightboxImages.indexOf(url));
							const clickableClass = (isNews || !isGiphy) ? 'cursor-pointer hover:opacity-95 transition-opacity' : '';

							// Facebook style logic for 3+ images
							if (post.imageUrls.length === 3 && index === 0) {
								return (
									<div key={index} className="col-span-2">
										<img src={url} alt={`Post image ${index}`} className={`w-full h-64 object-cover rounded-xl border border-gray-200 ${clickableClass}`} onClick={handleClick} />
									</div>
								);
							}
							if (post.imageUrls.length > 4 && index === 3) {
								return (
									<div key={index} className={`relative ${clickableClass}`} onClick={handleClick}>
										<img src={url} alt={`Post image ${index}`} className="w-full h-48 object-cover rounded-xl border border-gray-200" />
										<div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
											<span className="text-white text-2xl font-bold">+{post.imageUrls.length - 4}</span>
										</div>
									</div>
								);
							}
							if (post.imageUrls.length > 4 && index > 3) return null;

							return (
								<img key={index} src={url} alt={`Post image ${index}`} className={`w-full ${post.imageUrls.length === 1 ? 'max-h-96 object-contain' : 'h-48 object-cover'} rounded-xl border border-gray-200 ${clickableClass}`} onClick={handleClick} />
							);
						})}
					</div>
				</div>
			) : post.imageUrl && (
				<div className="flex justify-center px-4 py-2">
					<img
						src={post.imageUrl}
						alt="Post attachment"
						className={`rounded-xl border border-gray-200 shadow max-h-96 w-full ${post.imageUrl.endsWith('.gif') ? 'object-contain' : 'object-cover'} bg-gray-100 ${(isNews || !isGiphyImage(post.imageUrl)) ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}`}
						style={{ maxWidth: "100%" }}
						onClick={() => handleImageClick(post.imageUrl, 0)}
					/>
				</div>
			)}
			{post.videoUrl && (
				<div className="flex justify-center px-4 py-2">
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
				<div className="px-4 py-2">
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
			<div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
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
			<div className="flex justify-between items-center px-6 py-2 border-t border-gray-100 dark:border-slate-700 mt-1">
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
							className={`group flex items-center justify-center p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${userReaction
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
					<div className="flex justify-center">
						<button
							type="button"
							disabled={isPreview || isReposting || isSharingNews}
							className={`group flex items-center justify-center p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-slate-800 hover:text-green-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500 ${isPreview || isReposting || isSharingNews ? 'opacity-50 cursor-not-allowed' : ''}`}
							onClick={handleRepostClick}
							title={isNews ? "Share News" : "Repost"}
							aria-label={isNews ? "Share News" : "Repost"}
						>
							<i className={`fas fa-retweet text-xl transform group-hover:scale-110 transition-transform ${(isReposting || isSharingNews) ? 'fa-spin' : ''}`}></i>
						</button>
					</div>
					{showRepostMenu && (
						<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50 overflow-hidden animate-fade-in">
							<button
								onClick={handleInstantRepost}
								className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
							>
								<i className="fas fa-retweet mr-2"></i> {isNews ? 'Share to Feed' : 'Repost'}
							</button>
							<button
								onClick={handleQuoteRepost}
								className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
							>
								<i className="fas fa-pen mr-2"></i> {isNews ? 'Share with Comment' : 'Quote'}
							</button>
						</div>
					)}
				</div>
				<button
					type="button"
					disabled={isPreview}
					className={`group flex items-center justify-center p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${isPreview ? 'opacity-50 cursor-not-allowed' : ''}`}
					onClick={handleShare}
					title="Share"
					aria-label="Share"
				>
					<i className="fas fa-share-nodes text-xl transform group-hover:scale-110 transition-transform"></i>
				</button>
				<button
					type="button"
					disabled={isPreview || isBookmarkingNews}
					className={`group flex items-center justify-center p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-500 ${isSaved ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-500 dark:text-slate-400 hover:bg-yellow-50 dark:hover:bg-slate-800 hover:text-yellow-500'} ${isPreview || isBookmarkingNews ? 'opacity-50 cursor-not-allowed' : ''}`}
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
				<div className="px-4 py-2">
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
								/>
								<button
									type="submit"
									className="text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out p-1 rounded-full ml-1"
									aria-label="Post comment"
								>
									<i className="fas fa-paper-plane text-lg"></i>
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
											targetCommentId={targetCommentId}
											onReport={handleReport}
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
											targetCommentId={targetCommentId}
											onReport={handleReport}
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
							<h3 className="font-bold text-lg text-gray-900 dark:text-white">
								{isNews ? 'Share News Article' : 'Quote Repost'}
							</h3>
							<button onClick={() => setShowQuoteModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">
								<i className="fas fa-times text-xl"></i>
							</button>
						</div>
						<div className="p-4">
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
										<img
											src={post.author?.imageUrl || `https://placehold.co/32x32/A78BFA/ffffff?text=${post.author?.name?.[0] || 'U'}`}
											alt={post.author?.name || 'Author'}
											className="w-6 h-6 rounded-full object-cover mr-2"
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
						</div>
						<div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
							<button
								onClick={() => isNews ? shareNews({ content: quoteContent }) : repostPost({ content: quoteContent })}
								disabled={isReposting || isSharingNews}
								className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
							>
								{(isReposting || isSharingNews) ? 'Posting...' : 'Post'}
							</button>
						</div>
					</div>
				</div>
			)}
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
			`}</style>

			<Lightbox
				images={lightboxImages}
				initialIndex={lightboxIndex}
				isOpen={lightboxIndex !== null}
				onClose={() => setLightboxIndex(null)}
				post={post}
				sessionUserId={sessionUserId}
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
			{showDeleteModal && (
				<div
					className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
					onClick={(e) => {
						if (e.target === e.currentTarget) setShowDeleteModal(false);
					}}
				>
					<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden animate-in fade-in zoom-in duration-200">
						{/* Header */}
						<div className="px-6 pt-6 pb-4 text-center">
							<div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
								<svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</div>
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
								Delete Post
							</h3>
							<p className="text-sm text-gray-500 dark:text-slate-400">
								Are you sure you want to delete this post? This action cannot be undone.
							</p>
						</div>

						{/* Actions */}
						<div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
							<button
								onClick={() => setShowDeleteModal(false)}
								className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={() => {
									deletePost({ postId: post.id });
									setShowDeleteModal(false);
								}}
								disabled={isDeleting}
								className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
							>
								{isDeleting ? (
									<span className="flex items-center justify-center gap-2">
										<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
										</svg>
										Deleting...
									</span>
								) : (
									"Delete"
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}