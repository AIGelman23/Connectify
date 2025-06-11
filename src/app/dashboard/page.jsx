// src/app/dashboard/page.jsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Keep useMutation for createPost

import Navbar from '../../components/NavBar';
import PostFeed from '../../components/PostFeed';

export default function HomePage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [profile, setProfile] = useState(null);
	const [loadingInitialData, setLoadingInitialData] = useState(true);

	const [newPostContent, setNewPostContent] = useState("");
	const [postError, setPostError] = useState(null);

	const [replyModalVisible, setReplyModalVisible] = useState(false);
	const [activePostForReply, setActivePostForReply] = useState(null);
	const [activeCommentForReply, setActiveCommentForReply] = useState(null);
	const [replyText, setReplyText] = useState("");

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

	// Add Reply Mutation (kept here as it's part of the modal logic in HomePage)
	const { mutate: addReply } = useMutation({
		mutationFn: async ({ postId, commentId, replyContent }) => {
			const res = await fetch('/api/posts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					postId,
					commentId,
					action: 'reply_comment',
					commentContent: replyContent,
				}),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to add reply.");
			}
			return res.json();
		},
		onSuccess: () => {
			closeReplyModal();
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		onError: (err) => {
			setPostError(err.message || "Failed to add reply. Please try again.");
		},
	});

	const handleReplySubmit = useCallback(() => {
		if (!session?.user?.id) {
			setPostError("You must be logged in to reply to a comment.");
			return;
		}
		if (replyText.trim() && activePostForReply && activeCommentForReply) {
			addReply({ postId: activePostForReply, commentId: activeCommentForReply, replyContent: replyText });
		}
	}, [session?.user?.id, replyText, activePostForReply, activeCommentForReply, addReply, setPostError]);

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

	const openReplyModal = useCallback((commentId) => {
		// This will require finding the postId from the commentId if the commentId can be a reply.
		// For simplicity, we'll assume commentId is always a top-level comment for now.
		// In a real app, you might need a more sophisticated way to find the parent post.
		const post = queryClient.getQueryData(['posts'])?.pages?.flatMap(page => page.posts).find(p =>
			p.comments.some(c => c.id === commentId) || p.comments.some(c => c.replies.some(r => r.id === commentId))
		);

		if (post) {
			setActivePostForReply(post.id);
			setActiveCommentForReply(commentId);
			setReplyText("");
			setReplyModalVisible(true);
		}
	}, [queryClient]);

	const closeReplyModal = () => {
		setReplyModalVisible(false);
		setActivePostForReply(null);
		setActiveCommentForReply(null);
		setReplyText("");
	};

	// Combine loading states for initial display
	const finalLoadingState = loadingInitialData || (status === "authenticated" && !profile && !postError);

	if (finalLoadingState) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
				<div className="flex items-center space-x-2 text-indigo-600">
					<svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
						<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Loading your home feed...
				</div>
			</div>
		);
	}

	if (status === "authenticated" && (!profile || profile.isProfileComplete === false)) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
				<div className="bg-white shadow-xl rounded-2xl p-6 sm:p-10 max-w-md w-full text-center border border-gray-200">
					<h2 className="text-2xl font-bold text-gray-800 mb-4">
						{profile ? "Complete Your Profile!" : "Profile Missing"}
					</h2>
					<p className="text-gray-600 mb-6">
						{profile
							? "Please complete your professional profile to unlock the full Connectify experience."
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
		<div className="min-h-screen bg-gray-100 flex flex-col">
			<Navbar session={session} router={router} />
			<main className="flex-1 overflow-hidden">
				<div className="max-w-lg mx-auto py-8 px-4">
					{/* Post Creation Section */}
					<div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
						<h3 className="text-lg font-semibold text-gray-800 mb-3">Create Post</h3>
						<div className="flex items-center space-x-3 mb-4">
							<img
								src={session?.user?.image || `https://placehold.co/40x40/A78BFA/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}`}
								alt="Your avatar"
								className="w-10 h-10 rounded-full object-cover border border-gray-200"
							/>
							<textarea
								className="flex-1 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 placeholder-gray-500 resize-y min-h-[60px]"
								placeholder="What's on your mind?"
								value={newPostContent}
								onChange={(e) => setNewPostContent(e.target.value)}
								rows="3"
							></textarea>
						</div>
						{postError && <p className="text-red-600 text-sm mb-3">{postError}</p>}
						<div className="flex justify-end space-x-3 border-t border-gray-100 pt-3">
							<button
								type="button"
								className="flex items-center space-x-2 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-full transition duration-150"
								onClick={() => alert("Photo functionality not implemented yet.")}
							>
								<i className="fas fa-image"></i> <span>Photo</span>
							</button>
							<button
								type="button"
								className="flex items-center space-x-2 text-green-600 hover:bg-green-50 px-4 py-2 rounded-full transition duration-150"
								onClick={() => alert("Video functionality not implemented yet.")}
							>
								<i className="fas fa-video"></i> <span>Video</span>
							</button>
							<button
								onClick={handlePostSubmit}
								disabled={isPosting}
								className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isPosting ? "Posting..." : "Post"}
							</button>
						</div>
					</div>

					{/* Posts Feed Component */}
					<PostFeed
						sessionUserId={session?.user?.id}
						setPostError={setPostError}
						openReplyModal={openReplyModal}
					/>
				</div>
			</main>

			{/* Reply Modal */}
			{replyModalVisible && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
						<h3 className="text-lg font-bold mb-4">Reply to Comment</h3>
						<textarea
							className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-1 focus:ring-indigo-500"
							placeholder="Write your reply..."
							value={replyText}
							onChange={(e) => setReplyText(e.target.value)}
							rows="3"
						></textarea>
						<div className="flex justify-end space-x-3">
							<button
								onClick={closeReplyModal}
								className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
							>
								Cancel
							</button>
							<button
								onClick={handleReplySubmit}
								className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
							>
								Reply
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}