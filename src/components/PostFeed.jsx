// src/components/PostFeed.jsx
"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MinimalSpinnerLoader from './MinimalSpinnerLoader'; // Assuming this is in components
import PostCard from './PostCard';
import { formatTimestamp } from '../lib/utils'; // Assuming you move formatTimestamp here

export default function PostFeed({ sessionUserId, setPostError, openReplyModal }) {
	const mainScrollRef = useRef(null); // Ref for the scrollable container
	const loaderRef = useRef(null);     // Ref for the element to observe

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
							user: {
								id: commentAuthor.id || 'unknown',
								name: commentAuthor.name || 'Unknown User',
								imageUrl: commentAuthor.image || `https://placehold.co/32x32/A78BFA/ffffff?text=${commentAuthor.name ? commentAuthor.name[0].toUpperCase() : 'U'}`,
							},
							timestamp: formatTimestamp(comment.createdAt),
							replies: (comment.replies || []).map(reply => {
								const replyAuthor = reply.author || {};
								return {
									...reply,
									user: {
										id: replyAuthor.id || 'unknown',
										name: replyAuthor.name || 'Unknown User',
										imageUrl: replyAuthor.image || `https://placehold.co/24x24/A78BFA/ffffff?text=${replyAuthor.name ? replyAuthor.name[0].toUpperCase() : 'U'}`,
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
				posts.map((post) => (
					<PostCard
						key={post.id}
						post={post}
						sessionUserId={sessionUserId}
						setPostError={setPostError}
						openReplyModal={openReplyModal}
					/>
				))
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