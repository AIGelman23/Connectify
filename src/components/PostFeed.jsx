// src/components/PostFeed.jsx
"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MinimalSpinnerLoader from './MinimalSpinnerLoader'; // Assuming this is in components
import PostCard from './PostCard';
import { formatTimestamp } from '../lib/utils'; // Assuming you move formatTimestamp here

export default function PostFeed({ sessionUserId, setPostError, openReplyModal, highlightPostId }) {
	const mainScrollRef = useRef(null); // Ref for the scrollable container
	const loaderRef = useRef(null);     // Ref for the element to observe
	const highlightedPostRef = useRef(null); // Ref for the highlighted post

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading: isPostsLoading,
		isError: isPostsError,
		error: postsErrorObject,
		refetch: refetchPosts
	} = useInfiniteQuery({
		queryKey: ['posts'],
		queryFn: async ({ pageParam = 0 }) => {
			console.log(`[RQ] Fetching posts page, skip: ${pageParam}`);
			const res = await fetch(`/api/posts?take=10&skip=${pageParam}`);
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || `Failed to fetch posts: ${res.statusText}`);
			}
			const apiResponse = await res.json();

			const formattedPosts = apiResponse.posts.map(post => {
				const author = post.author || {};
				return {
					...post,
					user: {
						id: author.id || 'unknown',
						name: author.name || 'Unknown User',
						imageUrl: author.image || `https://placehold.co/40x40/A78BFA/ffffff?text=${author.name ? author.name[0].toUpperCase() : 'U'}`,
						headline: author.profile?.headline || "No headline available",
					},
					timestamp: formatTimestamp(post.createdAt),
					comments: (post.comments || []).map(comment => {
						const commentAuthor = comment.author || {};
						return {
							...comment,
							likesCount: comment.likesCount || 0,
							likedByCurrentUser: comment.likedByCurrentUser || false,
							likerNames: comment.likerNames || [],
							user: {
								id: commentAuthor.id || comment.user?.id || 'unknown',
								name: commentAuthor.name || comment.user?.name || 'Unknown User',
								imageUrl: commentAuthor.image || comment.user?.imageUrl || `https://placehold.co/32x32/A78BFA/ffffff?text=${(commentAuthor.name || comment.user?.name)?.[0]?.toUpperCase() || 'U'}`,
							},
							timestamp: formatTimestamp(comment.createdAt),
							replies: (comment.replies || []).map(reply => {
								// API already formats replies with 'user' object, but handle 'author' as fallback
								const replyUser = reply.user || reply.author || {};
								return {
									...reply,
									likesCount: reply.likesCount || 0,
									likedByCurrentUser: reply.likedByCurrentUser || false,
									likerNames: reply.likerNames || [],
									user: {
										id: replyUser.id || 'unknown',
										name: replyUser.name || 'Unknown User',
										imageUrl: replyUser.imageUrl || replyUser.image || `https://placehold.co/24x24/A78BFA/ffffff?text=${replyUser.name ? replyUser.name[0].toUpperCase() : 'U'}`,
									},
									timestamp: formatTimestamp(reply.createdAt),
								};
							})
						};
					})
				};
			});
			return {
				posts: formattedPosts,
				hasMore: apiResponse.hasMore,
			};
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) => {
			if (lastPage.hasMore) {
				return allPages.reduce((totalCount, page) => totalCount + page.posts.length, 0);
			}
			return undefined;
		},
		refetchOnWindowFocus: true,
		refetchInterval: 30000,
	});

	const posts = data?.pages?.flatMap(page => page.posts) || [];

	// Scroll to highlighted post when it's loaded
	useEffect(() => {
		if (highlightPostId && highlightedPostRef.current) {
			// Small delay to ensure the DOM is ready
			setTimeout(() => {
				highlightedPostRef.current?.scrollIntoView({
					behavior: 'smooth',
					block: 'center',
				});
			}, 100);
		}
	}, [highlightPostId, posts]);

	useEffect(() => {
		const currentLoader = loaderRef.current;
		const currentMainScrollContainer = mainScrollRef.current;

		if (!currentLoader || !currentMainScrollContainer || !hasNextPage) {
			return;
		}

		const observer = new IntersectionObserver((entries) => {
			const [entry] = entries;
			if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
				fetchNextPage();
			}
		}, {
			root: currentMainScrollContainer,
			rootMargin: '500px 0px',
			threshold: 0.1
		});

		observer.observe(currentLoader);

		return () => {
			if (currentLoader) {
				observer.unobserve(currentLoader);
			}
		};
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	return (
		<div
			className="feed space-y-6"
			ref={mainScrollRef}
			style={{
				overflowY: 'scroll',
				WebkitOverflowScrolling: 'touch',
				height: 'calc(100vh - 4rem - 64px)', // Adjust height as needed
			}}
		>
			{isPostsError && (
				<p className="text-center text-red-600 py-4">
					Error loading posts: {postsErrorObject?.message || "Unknown error."}
				</p>
			)}

			{posts.length > 0 ? (
				posts.map((post) => {
					const isHighlighted = highlightPostId === post.id;
					return (
						<div
							key={post.id}
							ref={isHighlighted ? highlightedPostRef : null}
							className={isHighlighted ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg animate-pulse-once' : ''}
						>
							<PostCard
								post={post}
								sessionUserId={sessionUserId}
								setPostError={setPostError}
								openReplyModal={openReplyModal}
								isHighlighted={isHighlighted}
							/>
						</div>
					);
				})
			) : (
				!isPostsLoading && !isPostsError && (
					<p className="text-center text-gray-500 py-10">No posts yet. Start by creating one!</p>
				)
			)}
			{hasNextPage && (
				<MinimalSpinnerLoader isFetchingNextPage={isFetchingNextPage} loaderRef={loaderRef} />
			)}
			{!hasNextPage && posts.length > 0 && (
				<p className="text-center text-gray-500 py-4">You've reached the end of the feed!</p>
			)}
		</div>
	);
}