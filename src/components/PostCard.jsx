import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Comment, Reply } from './Comment';

export default function PostCard({ post, sessionUserId, setPostError, openReplyModal }) {
	const { data: session } = useSession();
	const [activeCommentForPost, setActiveCommentForPost] = useState(null);
	const [showMenu, setShowMenu] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState(post.content || "");
	const [editLoading, setEditLoading] = useState(false);
	const [editError, setEditError] = useState("");
	const [notificationsOff, setNotificationsOff] = useState(false);
	const queryClient = useQueryClient();
	const videoRef = useRef(null);

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

	// Like Post Mutation
	const { mutate: likePost } = useMutation({
		mutationFn: async (postId) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId, action: 'like' }),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to like post.");
			}
			return res.json();
		},
		onMutate: async (postId) => {
			await queryClient.cancelQueries({ queryKey: ['posts'] });
			const previousPosts = queryClient.getQueryData(['posts']);

			queryClient.setQueryData(['posts'], (oldData) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					pages: oldData.pages.map(page => ({
						...page,
						posts: page.posts.map(p =>
							p.id === postId ? { ...p, likesCount: (p.likesCount || 0) + 1 } : p
						),
					})),
				};
			});
			return { previousPosts };
		},
		onError: (err, postId, context) => {
			setPostError(err.message || "Failed to like post. Please try again.");
			if (context?.previousPosts) {
				queryClient.setQueryData(['posts'], context.previousPosts);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
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

	const handleLike = useCallback(() => {
		if (!sessionUserId) {
			setPostError("You must be logged in to like a post.");
			return;
		}
		likePost(post.id);
	}, [post.id, sessionUserId, likePost, setPostError]);

	const handleAddComment = useCallback((e) => {
		e.preventDefault();
		const commentContent = e.target.elements.commentInput.value;
		if (!sessionUserId) {
			setPostError("You must be logged in to comment on a post.");
			return;
		}
		if (commentContent.trim()) {
			addComment({ postId: post.id, commentContent });
			e.target.elements.commentInput.value = ''; // Clear input
		}
	}, [post.id, sessionUserId, addComment, setPostError]);


	const handleDeleteComment = useCallback((commentId, postId) => {
		if (!sessionUserId) {
			setPostError("You must be logged in to delete a comment.");
			return;
		}
		if (confirm("Are you sure you want to delete this comment/reply? This action cannot be undone.")) {
			deleteCommentOrReply({ commentId, postId });
		}
	}, [sessionUserId, deleteCommentOrReply, setPostError]);

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

	return (
		<div key={post.id} className="bg-white rounded-2xl shadow-md border border-gray-200 mb-6 w-full max-w-2xl mx-auto transition hover:shadow-lg">
			{/* Header */}
			<div className="flex items-center justify-between px-4 pt-4 pb-2">
				<div className="flex items-center">
					<a href={post.author?.profileUrl || '#'} className="group">
						<img
							src={
								post.author?.profile?.profilePictureUrl ||
								post.author?.image ||
								post.author?.imageUrl ||
								`https://placehold.co/40x40/A78BFA/ffffff?text=${post.author?.name ? post.author.name[0].toUpperCase() : 'U'}`
							}
							alt={`${post.author?.name || "User"}'s avatar`}
							className="w-11 h-11 rounded-full object-cover border-2 border-white shadow group-hover:ring-2 group-hover:ring-blue-500 transition"
						/>
					</a>
					<div className="ml-3">
						<a href={post.author?.profileUrl || '#'} className="font-semibold text-gray-900 leading-tight hover:underline focus:underline outline-none text-[16px]">
							{post.author?.name}
						</a>
						{/* --- Show tagged friends if present --- */}
						{Array.isArray(post.taggedFriends) && post.taggedFriends.length > 0 && (
							<div className="text-xs text-gray-500 mt-0.5">
								<span>
									with{" "}
									{post.taggedFriends.map((friend, idx) => (
										<span key={friend.id || friend._id || idx}>
											{idx > 0 && ", "}
											<span className="font-medium text-blue-700">
												{friend.name}
											</span>
										</span>
									))}
								</span>
							</div>
						)}
						<div className="flex items-center space-x-1 text-xs text-gray-500 mt-0.5">
							<span title={new Date(post.createdAt).toLocaleString()}>{getTimestamp()}</span>
							<span aria-hidden="true">·</span>
							<span title="Public" className="inline-flex items-center">
								<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-gray-400"><path d="M10 2C5.03 2 1 6.03 1 11c0 4.97 4.03 9 9 9s9-4.03 9-9c0-4.97-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7 0-3.87 3.13-7 7-7s7 3.13 7 7c0 3.87-3.13 7-7 7zm0-12c-2.76 0-5 2.24-5 5 0 2.76 2.24 5 5 5s5-2.24 5-5c0-2.76-2.24-5-5-5z" /></svg>
							</span>
						</div>
					</div>
				</div>
				{/* Menu button */}
				<div className="relative">
					<button
						className="p-2 rounded-full hover:bg-gray-100 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
						aria-label="Post actions"
						onClick={() => setShowMenu((v) => !v)}
					>
						<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><g fillRule="evenodd"><circle cx="4" cy="10" r="2" /><circle cx="10" cy="10" r="2" /><circle cx="16" cy="10" r="2" /></g></svg>
					</button>
					{showMenu && (
						<div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
							{sessionUserId === post.author?.id && (
								<button
									className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
									onClick={() => { setIsEditing(true); setShowMenu(false); }}
								>
									Edit Post
								</button>
							)}
							<button
								className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
								onClick={() => { handleToggleNotifications(); setShowMenu(false); }}
							>
								{notificationsOff ? "Turn On Notifications" : "Turn Off Notifications"}
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Content */}
			{isEditing ? (
				<div className="px-4 pb-2">
					<textarea
						className="w-full border border-gray-300 rounded-lg p-2 mb-2"
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
							className="bg-gray-200 text-gray-700 px-4 py-1 rounded hover:bg-gray-300"
							onClick={() => setIsEditing(false)}
							disabled={editLoading}
						>
							Cancel
						</button>
					</div>
					{editError && <div className="text-red-500 text-sm mt-1">{editError}</div>}
				</div>
			) : (
				<>
					{post.content && (
						<div className="px-4 pb-2 text-gray-900 text-[15px] leading-relaxed whitespace-pre-line">
							{post.content}
							{post.updatedAt && post.updatedAt !== post.createdAt && (
								<span className="ml-2 text-xs text-gray-400">(edited)</span>
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

			{/* Reactions/Stats Row */}
			<div className="flex items-center justify-between px-4 pt-2 pb-1 text-xs text-gray-500 border-b border-gray-100">
				<div className="flex items-center space-x-2">
					<span className="flex items-center space-x-1">
						{/* Like SVG */}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="url(#like-gradient)" className="inline-block"><defs><linearGradient id="like-gradient" x1="2" y1="2" x2="14" y2="14" gradientUnits="userSpaceOnUse"><stop stopColor="#02ADFC" /><stop offset="0.5" stopColor="#0866FF" /><stop offset="1" stopColor="#2B7EFF" /></linearGradient></defs><path d="M7.3 3.87a.7.7 0 0 1 .7-.7c.67 0 1.22.55 1.22 1.22v1.75a.1.1 0 0 0 .1.1h1.8c.99 0 1.72.93 1.49 1.89l-.46 1.9A2.3 2.3 0 0 1 11 12.7H6.92a.58.58 0 0 1-.58-.58V7.74c0-.42.1-.83.28-1.2l.29-.57a3.7 3.7 0 0 0 .39-1.65v-.45zM4.37 7a.77.77 0 0 0-.77.77v3.26c0 .42.34.77.77.77h.77a.38.38 0 0 0 .38-.38V7.38A.38.38 0 0 0 5.14 7h-.77z" fill="#0866FF" /></svg>
						<span className="font-medium">{post.likesCount || 0}</span>
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
					className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 font-semibold transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 mx-1"
				>
					{/* Like SVG */}
					<svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M7.3 3.87a.7.7 0 0 1 .7-.7c.67 0 1.22.55 1.22 1.22v1.75a.1.1 0 0 0 .1.1h1.8c.99 0 1.72.93 1.49 1.89l-.46 1.9A2.3 2.3 0 0 1 11 12.7H6.92a.58.58 0 0 1-.58-.58V7.74c0-.42.1-.83.28-1.2l.29-.57a3.7 3.7 0 0 0 .39-1.65v-.45zM4.37 7a.77.77 0 0 0-.77.77v3.26c0 .42.34.77.77.77h.77a.38.38 0 0 0 .38-.38V7.38A.38.38 0 0 0 5.14 7h-.77z" fill="currentColor" /></svg>
					<span>Like</span>
				</button>
				<button
					onClick={toggleCommentSection}
					className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 font-semibold transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 mx-1"
				>
					{/* Comment SVG */}
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3C5.58 3 2 6.13 2 10c0 1.61.7 3.09 1.9 4.27-.13.47-.5 1.47-1.2 2.36-.13.16-.02.4.18.4.06 0 .12-.02.17-.06 1.1-.8 2.1-1.2 2.6-1.36C7.1 16.44 8.5 17 10 17c4.42 0 8-3.13 8-7s-3.58-7-8-7z" fill="currentColor" /></svg>
					<span>Comment</span>
				</button>
				<button
					type="button"
					className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 font-semibold transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 mx-1"
					onClick={() => handlePostTypeAction("share")}
				>
					{/* Share SVG */}
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 8a3 3 0 0 0-2.24 1.01l-4.13-2.06A3.01 3.01 0 0 0 5 5a3 3 0 0 0 0 6c.65 0 1.25-.21 1.74-.56l4.13 2.06A3.01 3.01 0 0 0 15 15a3 3 0 1 0 0-6z" fill="currentColor" /></svg>
					<span>Share</span>
				</button>
			</div>

			{/* Comment Input and Top Comments (Facebook style) */}
			<div className="px-4 pt-2 pb-1">
				<form onSubmit={handleAddComment} className="flex items-center space-x-3 mb-3">
					<img
						src={session?.user?.image || `https://placehold.co/32x32/A78BFA/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`}
						alt="Your avatar"
						className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-200"
					/>
					<div className="flex-1 relative">
						<input
							type="text"
							name="commentInput"
							placeholder="Write a comment..."
							className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
						/>
						<button
							type="submit"
							className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out p-1 rounded-full"
							aria-label="Post comment"
						>
							{/* Send SVG */}
							<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M2.94 17.94a1.5 1.5 0 0 0 1.6.33l13-5.5a1.5 1.5 0 0 0 0-2.74l-13-5.5A1.5 1.5 0 0 0 2 6.5v7a1.5 1.5 0 0 0 .94 1.44zM4 7.38l11.67 4.94L4 17.26V7.38z" /></svg>
						</button>
					</div>
				</form>
				{/* Show top 2 comments, sorted by likesCount then createdAt desc */}
				{post.comments && post.comments.length > 0 && (
					<div className="space-y-2">
						{post.comments
							.slice()
							.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0) || new Date(b.createdAt) - new Date(a.createdAt))
							.slice(0, 2)
							.map(comment => (
								<Comment
									key={comment.id}
									comment={comment}
									onReply={openReplyModal}
									sessionUserId={sessionUserId}
									onDeleteComment={handleDeleteComment}
									postId={post.id}
								/>
							))}
						{post.comments.length > 2 && (
							<button
								className="mt-2 text-blue-600 hover:underline text-sm font-medium"
								onClick={toggleCommentSection}
							>
								View more comments
							</button>
						)}
					</div>
				)}
				{activeCommentForPost === post.id && (
					<div className="pt-2">
						{/* List of all comments */}
						{post.comments && post.comments.length > 0 ? (
							<div className="space-y-2">
								{post.comments
									.slice()
									.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0) || new Date(b.createdAt) - new Date(a.createdAt))
									.map(comment => (
										<Comment
											key={comment.id}
											comment={comment}
											onReply={openReplyModal}
											sessionUserId={sessionUserId}
											onDeleteComment={handleDeleteComment}
											postId={post.id}
										/>
									))}
							</div>
						) : (
							<p className="text-gray-500 text-sm text-center">No comments yet. Be the first to comment!</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
}