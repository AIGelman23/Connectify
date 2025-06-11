// src/app/api/posts/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma"; // Ensure this path is correct

// Utility function for timestamp formatting
function formatTimestamp(timestamp) {
	const date = new Date(timestamp);
	const now = new Date();
	const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
	const diffMinutes = Math.round(diffSeconds / 60);
	const diffHours = Math.round(diffMinutes / 60);
	const diffDays = Math.round(diffHours / 24);

	if (diffMinutes < 1) return "Just now";
	if (diffMinutes < 60) return `${diffMinutes}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString(); // Fallback for older posts
}


export async function POST(request) {
	try {
		const session = await getServerSession(authOptions);

		if (!session || !session.user?.id) {
			return NextResponse.json(
				{ message: "Unauthorized. Please log in." },
				{ status: 401 }
			);
		}

		const { content } = await request.json();
		const authorId = session.user.id;

		if (!content || content.trim() === "") {
			return NextResponse.json(
				{ message: "Post content cannot be empty." },
				{ status: 400 }
			);
		}

		const newPost = await prisma.post.create({
			data: {
				content,
				authorId,
				likesCount: 0, // Initialize new posts with 0 likes
				commentsCount: 0, // Initialize new posts with 0 comments
			},
		});

		return NextResponse.json(
			{ message: "Post created successfully.", post: newPost },
			{ status: 201 }
		);
	} catch (error) {
		console.error("API Error creating post:", error);
		return NextResponse.json(
			{ message: "Internal server error creating post.", error: error.message },
			{ status: 500 }
		);
	}
}

export async function GET(request) {
	try {
		const session = await getServerSession(authOptions);

		if (!session || !session.user?.id) {
			return NextResponse.json(
				{ message: "Unauthorized. Please log in." },
				{ status: 401 }
			);
		}

		const userId = session.user.id;

		// --- NEW: Pagination parameters ---
		const { searchParams } = new URL(request.url);
		const take = parseInt(searchParams.get('take') || '10', 10); // Number of posts to fetch
		const skip = parseInt(searchParams.get('skip') || '0', 10);  // Number of posts to skip

		// 1. Find all accepted connections for the current user
		const connections = await prisma.connectionRequest.findMany({
			where: {
				OR: [
					{ senderId: userId, status: "ACCEPTED" },
					{ receiverId: userId, status: "ACCEPTED" },
				],
			},
			select: {
				senderId: true,
				receiverId: true,
			},
		});

		// 2. Extract unique IDs of connected users
		const connectedUserIds = new Set();
		connections.forEach((conn) => {
			if (conn.senderId !== userId) {
				connectedUserIds.add(conn.senderId);
			}
			if (conn.receiverId !== userId) {
				connectedUserIds.add(conn.receiverId);
			}
		});

		const userIdsToFetchPostsFor = Array.from(connectedUserIds);
		userIdsToFetchPostsFor.push(userId); // Include current user's posts

		// 3. Fetch posts from these users with pagination
		const posts = await prisma.post.findMany({
			where: {
				authorId: { in: userIdsToFetchPostsFor },
			},
			include: {
				author: {
					select: {
						id: true,
						name: true,
						image: true,
						profile: {
							select: {
								headline: true,
							},
						},
					},
				},
				comments: {
					where: {
						parentCommentId: null, // Only fetch top-level comments directly
					},
					include: {
						author: {
							select: {
								id: true,
								name: true,
								image: true,
							},
						},
						replies: {
							include: {
								author: {
									select: {
										id: true,
										name: true,
										image: true,
									},
								},
							},
							orderBy: { createdAt: "asc" },
						},
					},
					orderBy: { createdAt: "asc" },
				},
			},
			orderBy: {
				createdAt: "desc",
			},
			skip: skip, // Apply skip
			take: take + 1, // Fetch one extra to check if more exist
		});

		// Determine if there are more posts to load
		const hasMore = posts.length > take;
		const dataToReturn = hasMore ? posts.slice(0, take) : posts;

		const formattedPosts = dataToReturn.map((post) => ({
			...post,
			author: {
				id: post.author.id,
				name: post.author.name,
				imageUrl:
					post.author.image ||
					`https://placehold.co/40x40/A78BFA/ffffff?text=${post.author.name ? post.author.name[0].toUpperCase() : "U"
					}`,
				headline: post.author.profile?.headline || "No headline available",
			},
			comments: post.comments.map((comment) => ({
				...comment,
				user: {
					id: comment.author.id,
					name: comment.author.name,
					imageUrl:
						comment.author.image ||
						`https://placehold.co/32x32/A78BFA/ffffff?text=${comment.author.name ? comment.author.name[0].toUpperCase() : "U"
						}`,
				},
				timestamp: formatTimestamp(comment.createdAt),
				replies: (comment.replies || []).map((reply) => ({
					...reply,
					user: {
						id: reply.author.id,
						name: reply.author.name,
						imageUrl:
							reply.author.image ||
							`https://placehold.co/24x24/A78BFA/ffffff?text=${reply.author.name ? reply.author.name[0].toUpperCase() : "U"
							}`,
					},
					timestamp: formatTimestamp(reply.createdAt),
				})),
			})),
		}));

		return NextResponse.json({ posts: formattedPosts, hasMore: hasMore }, { status: 200 });
	} catch (error) {
		console.error("API Error fetching posts:", error);
		return NextResponse.json(
			{
				message: "Internal server error fetching posts.",
				error: error.message,
			},
			{ status: 500 }
		);
	}
}

export async function PATCH(request) {
	try {
		const session = await getServerSession(authOptions);

		if (!session || !session.user?.id) {
			return NextResponse.json(
				{ message: "Unauthorized. Please log in." },
				{ status: 401 }
			);
		}

		const requestBody = await request.json();
		const { postId, commentId, action } = requestBody;

		let commentContent;

		if (action === "comment") {
			// Frontend sends it as 'comment' for top-level comments
			commentContent = requestBody.comment;
		} else if (action === "reply_comment") {
			// CORRECTED: Frontend sends it as 'commentContent' for replies
			commentContent = requestBody.commentContent; // <-- This is the change!
		}
		// For other actions (like, delete_comment), commentContent might not be relevant or will remain undefined.


		const userId = session.user.id;

		if (!action) {
			return NextResponse.json(
				{ message: "Action is required." },
				{ status: 400 }
			);
		}

		let updatedEntity;

		if (action === "like") {
			if (!postId) {
				return NextResponse.json(
					{ message: "Post ID is required for liking a post." },
					{ status: 400 }
				);
			}
			updatedEntity = await prisma.post.update({
				where: { id: postId },
				data: { likesCount: { increment: 1 } },
				select: { likesCount: true },
			});
			return NextResponse.json(
				{
					message: "Post liked successfully.",
					likesCount: updatedEntity.likesCount,
				},
				{ status: 200 }
			);
		} else if (action === "comment") {
			if (!postId || !commentContent || commentContent.trim() === "") {
				return NextResponse.json(
					{
						message: "Post ID and comment content are required for commenting.",
					},
					{ status: 400 }
				);
			}

			await prisma.comment.create({
				data: {
					content: commentContent,
					authorId: session.user.id,
					postId: postId,
				},
			});

			updatedEntity = await prisma.post.update({
				where: { id: postId },
				data: { commentsCount: { increment: 1 } },
				select: { commentsCount: true },
			});
			return NextResponse.json(
				{
					message: "Comment added successfully.",
					commentsCount: updatedEntity.commentsCount,
				},
				{ status: 200 }
			);
		} else if (action === "like_comment") {
			if (!commentId) {
				return NextResponse.json(
					{ message: "Comment ID is required for liking a comment." },
					{ status: 400 }
				);
			}
			updatedEntity = await prisma.comment.update({
				where: { id: commentId },
				data: { likesCount: { increment: 1 } },
				select: { likesCount: true },
			});
			return NextResponse.json(
				{
					message: "Comment liked successfully.",
					likesCount: updatedEntity.likesCount,
				},
				{ status: 200 }
			);
		} else if (action === "delete_comment") {
			if (!commentId || !postId) {
				return NextResponse.json(
					{ message: "Comment ID and Post ID are required for deleting a comment." },
					{ status: 400 }
				);
			}

			const commentToDelete = await prisma.comment.findUnique({
				where: { id: commentId },
				include: { replies: true },
			});

			if (!commentToDelete) {
				return NextResponse.json(
					{ message: "Comment not found." },
					{ status: 404 }
				);
			}

			if (commentToDelete.authorId !== userId) {
				return NextResponse.json(
					{ message: "You are not authorized to delete this comment." },
					{ status: 403 }
				);
			}

			let commentsDeletedCount = 1;

			if (commentToDelete.parentCommentId === null && commentToDelete.replies && commentToDelete.replies.length > 0) {
				commentsDeletedCount += commentToDelete.replies.length;
			}

			await prisma.comment.delete({
				where: { id: commentId },
			});

			await prisma.post.update({
				where: { id: commentToDelete.postId },
				data: { commentsCount: { decrement: commentsDeletedCount } },
			});

			return NextResponse.json(
				{ message: "Comment deleted successfully." },
				{ status: 200 }
			);
		} else if (action === "reply_comment") {
			if (!commentId || !postId || !commentContent || commentContent.trim() === "") {
				return NextResponse.json(
					{ message: "Parent comment ID, Post ID, and reply content are required." },
					{ status: 400 }
				);
			}

			const parentComment = await prisma.comment.findUnique({
				where: { id: commentId },
				select: { postId: true }
			});

			if (!parentComment || parentComment.postId !== postId) {
				return NextResponse.json(
					{ message: "Parent comment not found or does not belong to this post." },
					{ status: 400 }
				);
			}

			const newReply = await prisma.comment.create({
				data: {
					content: commentContent,
					authorId: userId,
					postId: postId,
					parentCommentId: commentId,
				},
			});

			await prisma.post.update({
				where: { id: postId },
				data: { commentsCount: { increment: 1 } },
			});

			return NextResponse.json(
				{ message: "Reply added successfully.", reply: newReply },
				{ status: 201 }
			);
		} else {
			return NextResponse.json(
				{ message: "Invalid action specified." },
				{ status: 400 }
			);
		}
	} catch (error) {
		console.error(
			"API Error updating entity (like/comment/like_comment/delete_comment/reply_comment):",
			error
		);
		if (error.code === "P2025") {
			return NextResponse.json(
				{ message: "Entity not found." },
				{ status: 404 }
			);
		}
		return NextResponse.json(
			{
				message: "Internal server error updating entity.",
				error: error.message,
			},
			{ status: 500 }
		);
	}
}