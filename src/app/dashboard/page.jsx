// src/app/dashboard/page.jsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Keep useMutation for createPost

import Navbar from '../../components/NavBar';
import PostFeed from '../../components/PostFeed';
import CreatePostCard from '../../components/CreatePostCard'; // <-- Make sure this import is at the top level
import ConnectifyLogo from "@/components/ConnectifyLogo";

export default function HomePage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [profile, setProfile] = useState(null);
	const [loadingInitialData, setLoadingInitialData] = useState(true);

	const [newPostContent, setNewPostContent] = useState("");
	const [postError, setPostError] = useState(null);

	const queryClient = useQueryClient();

	// Post Creation Mutation
	const { mutate: createPost, isPending: isPosting } = useMutation({
		mutationFn: async (content) => {
			const res = await fetch('/api/posts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content }),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to create post.");
			}
			return res.json();
		},
		onSuccess: () => {
			setNewPostContent("");
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setPostError(err.message || "Failed to post. Please try again.");
		},
	});

	const handlePostSubmit = (e) => {
		e.preventDefault();
		if (!session?.user?.id) {
			setPostError("You must be logged in to create a post.");
			return;
		}
		if (newPostContent.trim()) {
			createPost(newPostContent);
		} else {
			setPostError("Post content cannot be empty.");
		}
	};

	// Reply Mutation (supports replying to comments and replies)
	const { mutate: addReply } = useMutation({
		mutationFn: async ({ postId, commentId, parentId, replyContent }) => {
			const res = await fetch('/api/comments/reply', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					postId,
					commentId,
					parentId,
					content: replyContent,
				}),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to add reply.");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setPostError(err.message || "Failed to add reply. Please try again.");
		},
	});

	// Like Reply Mutation
	const { mutate: likeReply } = useMutation({
		mutationFn: async ({ replyId }) => {
			const res = await fetch('/api/comments/like', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ replyId }),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to like reply.");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setPostError(err.message || "Failed to like reply. Please try again.");
		},
	});

	// Inline reply handler (for comments and replies)
	const handleInlineReply = useCallback(
		async (postId, commentId, replyContent, parentId = null) => {
			if (!session?.user?.id) {
				setPostError("You must be logged in to reply to a comment.");
				return;
			}
			// Always require commentId (the root comment) and optionally parentId (the reply being replied to)
			if (replyContent.trim() && postId && commentId) {
				addReply({ postId, commentId, parentId, replyContent });
			}
		},
		[session?.user?.id, addReply]
	);

	// Like reply handler
	const handleLikeReply = useCallback(
		(replyId) => {
			if (!session?.user?.id) {
				setPostError("You must be logged in to like a reply.");
				return;
			}
			if (replyId) {
				likeReply({ replyId });
			}
		},
		[session?.user?.id, likeReply]
	);

	useEffect(() => {
		if (status === "loading") {
			return;
		}
		if (status === "unauthenticated") {
			router.push("/auth/login");
			return;
		}
		if (status === "authenticated") {
			const fetchProfile = async () => {
				setLoadingInitialData(true);
				try {
					const profileRes = await fetch("/api/profile");
					if (profileRes.ok) {
						const profileData = await profileRes.json();
						setProfile(profileData.profile);
						if (!profileData.profile || !profileData.profile.isProfileComplete) {
							router.push('/profile');
							return;
						}
					} else {
						console.warn("No profile found for this user or failed to fetch, prompting to create.");
						setProfile(null);
						router.push('/profile');
						return;
					}
				} catch (err) {
					console.error("Failed to load profile:", err);
					setPostError("Failed to load profile data. Please try again.");
				} finally {
					setLoadingInitialData(false);
				}
			};
			fetchProfile();
		}
	}, [status, router]);

	// --- All hooks must be called unconditionally and in the same order ---
	const handleCreatePost = useCallback(
		async ({ fileUrl, fileType, content }) => {
			if (!session?.user?.id) {
				setPostError("You must be logged in to create a post.");
				return;
			}
			// Remove the condition that forces text when media is provided.
			// if (!content?.trim() && !fileUrl) { ... }
			try {
				const res = await fetch('/api/posts', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						content: content,
						imageUrl: fileType === "image" ? fileUrl : undefined,
						videoUrl: fileType === "video" ? fileUrl : undefined,
					}),
				});
				if (!res.ok) {
					const errorData = await res.json();
					throw new Error(errorData.message || "Failed to create post.");
				}
				setNewPostContent("");
				queryClient.invalidateQueries({ queryKey: ['posts'] });
			} catch (err) {
				setPostError(err.message || "Failed to post. Please try again.");
			}
		},
		[session?.user?.id, queryClient]
	);
	// --- All hooks above this line ---

	// --- Conditional rendering below this line only ---
	const finalLoadingState = loadingInitialData || (status === "authenticated" && !profile && !postError);

	if (finalLoadingState) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 p-4">
				<div className="flex flex-col items-center space-y-4">
					<ConnectifyLogo width={350} height={350} className="animate-pulse" />
				</div>
			</div>
		);
	}

	if (status === "authenticated" && (!profile || profile.isProfileComplete === false)) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4">
				<div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6 sm:p-10 max-w-md w-full text-center border border-gray-200 dark:border-slate-700">
					<h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-4">
						{profile ? "Complete Your Profile!" : "Profile Missing"}
					</h2>
					<p className="text-gray-600 dark:text-slate-300 mb-6">
						{profile
							? "Please complete your professional profile to unlock the full ConnectifAI experience."
							: "It looks like you haven't set up your professional profile yet. Please create one to get started."}
					</p>
					<button
						onClick={() => router.push("/edit-profile")}
						className="w-full sm:w-auto flex-shrink-0 flex justify-center py-2.5 px-6 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-300 ease-in-out"
					>
						{profile ? "Complete Profile" : "Create Profile"}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-gray-100 dark:bg-slate-900">
			<Navbar session={session} router={router} />
			<main className="flex-1 overflow-hidden">
				<div className="max-w-lg mx-auto py-8 px-4">
					{/* Post Creation Section */}
					<CreatePostCard onCreatePost={handleCreatePost} />
					{/* Posts Feed Component */}
					<PostFeed
						sessionUserId={session?.user?.id}
						setPostError={setPostError}
						onReply={handleInlineReply} // <-- Pass the inline reply handler
						onLikeReply={handleLikeReply} // <-- Pass the like reply handler
					/>
				</div>
			</main>
		</div>
	);
}