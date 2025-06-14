import React, { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Comment, Reply } from './Comment';

export default function PostCard({ post, sessionUserId, setPostError, openReplyModal }) {
	const { data: session } = useSession();
	const [activeCommentForPost, setActiveCommentForPost] = useState(null);
	const queryClient = useQueryClient();

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

	return (
		<div key={post.id} className="post-card rounded-lg shadow-md p-4 mb-6 border border-gray-200">
			{/* Post Header */}
			<div className="flex items-center mb-3">
				<img
					src={
						post.author?.profile?.profilePictureUrl ||
						post.author?.image ||
						post.author?.imageUrl ||
						`https://placehold.co/40x40/A78BFA/ffffff?text=${post.author?.name ? post.author.name[0].toUpperCase() : 'U'}`
					}
					alt={`${post.author?.name || "User"}'s avatar`}
					className="w-10 h-10 rounded-full object-cover border border-gray-200"
				/>
				<div className="ml-3">
					<p className="font-semibold">{post.author?.name}</p>
					<p className="text-sm text-gray-500">{post.author?.headline}</p>
					<p className="text-xs text-gray-400">{post.timestamp}</p>
				</div>
			</div>

			{/* Post Content */}
			<div className="mb-4">
				<p>{post.content}</p>
				{/* Show image or video if present */}
				{post.imageUrl && (
					<div className="mt-3 flex justify-center">
						<img
							src={post.imageUrl}
							alt="Post attachment"
							className="max-h-96 rounded-lg border border-gray-200 shadow"
							style={{ maxWidth: "100%" }}
						/>
					</div>
				)}
				{post.videoUrl && (
					<div className="mt-3 flex justify-center">
						<video
							src={post.videoUrl}
							controls
							className="max-h-96 rounded-lg border border-gray-200 shadow"
							style={{ maxWidth: "100%", background: "#000" }}
						>
							<source src={post.videoUrl} type="video/mp4" />
							<source src={post.videoUrl} type="video/webm" />
							<source src={post.videoUrl} type="video/ogg" />
							Your browser does not support the video tag.
						</video>
					</div>
				)}
			</div>

			{/* Post Stats */}
			<div className="flex justify-between items-center text-sm text-gray-500 mb-3 pb-2">
				<span>{post.likesCount || 0} Likes</span>
				<span>{post.commentsCount || 0} Comments</span>
			</div>

			{/* Post Actions (Like, Comment, Share) */}
			<div className="flex justify-around items-center pb-2 mb-4">
				<button
					onClick={handleLike}
					className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition duration-150 ease-in-out"
				>
					<i className="far fa-thumbs-up"></i>
					<span>Like</span>
				</button>
				<button
					onClick={toggleCommentSection}
					className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition duration-150 ease-in-out"
				>
					<i className="far fa-comment"></i>
					<span>Comment</span>
				</button>
				<button
					type="button"
					className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition duration-150 ease-in-out"
					onClick={() => handlePostTypeAction("share")}
				>
					<i className="far fa-share-square"></i>
					<span>Share</span>
				</button>
			</div>

			{/* Comment Input and Comments List */}
			{activeCommentForPost === post.id && (
				<div className="mt-4">
					{/* Current User's Comment Input */}
					<form onSubmit={handleAddComment} className="flex items-center space-x-3 mb-4">
						<img
							src={session?.user?.image || `https://placehold.co/32x32/A78BFA/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`}
							alt="Your avatar"
							className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-200"
						/>
						<div className="flex-1 relative">
							<input
								type="text"
								name="commentInput" // Added name for form submission
								placeholder="Write a comment..."
								className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
							/>
							<button
								type="submit" // Changed to submit
								className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-800 transition duration-150 ease-in-out p-1 rounded-full"
								aria-label="Post comment"
							>
								<i className="fas fa-paper-plane"></i>
							</button>
						</div>
					</form>

					{/* List of Comments */}
					{post.comments && post.comments.length > 0 ? (
						post.comments.map(comment => (
							<Comment
								key={comment.id}
								comment={comment}
								onReply={openReplyModal}
								sessionUserId={sessionUserId}
								onDeleteComment={handleDeleteComment}
								postId={post.id}
							/>
						))
					) : (
						<p className="text-gray-500 text-sm text-center">No comments yet. Be the first to comment!</p>
					)}
				</div>
			)}
		</div>
	);
}