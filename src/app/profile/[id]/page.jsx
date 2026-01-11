"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from '../../../components/NavBar';
import EditProfileHeader from "../../../components/profile/EditProfileHeader";
import EditProfileExperience from "../../../components/profile/EditProfileExperience";
import EditProfileEducation from "../../../components/profile/EditProfileEducation";
import EditProfileSkills from "../../../components/profile/EditProfileSkills";
import FriendsListContainer from "../../../components/profile/FriendsListContainer";
import Posts from "../../../components/Posts";
import ConnectifyLogo from "../../../components/ConnectifyLogo";

export default function ProfilePage() {
	const { id } = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { data: session, status } = useSession();
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isOwnProfile, setIsOwnProfile] = useState(false);
	const [activeTab, setActiveTab] = useState('profile');
	const [isFollowing, setIsFollowing] = useState(false);
	const [followersCount, setFollowersCount] = useState(0);
	const [followingCount, setFollowingCount] = useState(0);

	useEffect(() => {
		if (status === "loading") return;

		if (status === "unauthenticated") {
			router.push("/auth/login");
			return;
		}

		const fetchProfile = async () => {
			try {
				setLoading(true);

				// Determine if viewing own profile or someone else's
				const isOwn = session?.user?.id === id;
				setIsOwnProfile(isOwn);

				// API endpoint - different for own profile vs. other profiles
				const endpoint = isOwn ? "/api/profile" : `/api/profile/${id}`;

				const res = await fetch(endpoint);

				if (!res.ok) {
					if (res.status === 404) {
						throw new Error("Profile not found");
					}
					throw new Error("Failed to fetch profile");
				}

				const data = await res.json();
				setProfile(data.profile);
				setIsFollowing(data.isFollowing || false);
				setFollowersCount(data.followersCount || 0);
				setFollowingCount(data.followingCount || 0);
			} catch (err) {
				console.error("Failed to fetch profile:", err);
				setError(err.message || "Failed to load profile");
			} finally {
				setLoading(false);
			}
		};

		fetchProfile();
	}, [id, status, router, session]);

	// Handle tab change from URL
	useEffect(() => {
		const tab = searchParams.get('tab');
		if (tab && ['profile', 'posts', 'saved'].includes(tab)) {
			setActiveTab(tab);
		}
	}, [searchParams]);

	const handleFollowToggle = async () => {
		try {
			const res = await fetch(`/api/users/${id}/follow`, {
				method: isFollowing ? 'DELETE' : 'POST',
			});

			if (!res.ok) {
				throw new Error("Failed to update follow status");
			}

			setIsFollowing(!isFollowing);
			setFollowersCount((prev) => isFollowing ? Math.max(0, prev - 1) : prev + 1);
		} catch (err) {
			console.error("Error toggling follow:", err);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100">
				<div className="flex flex-col items-center">
					<ConnectifyLogo width={350} height={350} className="mx-auto animate-pulse" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
				<div className="p-8 rounded-lg shadow-md bg-white dark:bg-slate-800 max-w-md">
					<h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h2>
					<p className="text-gray-700 dark:text-slate-300">{error}</p>
					<button
						onClick={() => router.push('/dashboard')}
						className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
					>
						Go to Dashboard
					</button>
				</div>
			</div>
		);
	}

	if (!profile) {
		return null;
	}

	// Prepare the profile data for the components
	const formattedProfile = {
		name: profile.user?.name || "",
		email: profile.user?.email || "",
		headline: profile.headline || "",
		summary: profile.bio || "", // Map bio field to summary
		location: profile.location || "",
		profilePicture: profile.profilePictureUrl || "",
		coverPhoto: profile.coverPhotoUrl || "",
		resume: profile.resumeUrl || "",
		isProfileComplete: profile.isProfileComplete || false,
		experience: Array.isArray(profile.experiences) ? profile.experiences : [],
		education: Array.isArray(profile.education) ? profile.education : [],
		skills: Array.isArray(profile.skills) ? profile.skills : [],
	};

	return (
		<div className="min-h-screen font-sans antialiased text-gray-900 dark:text-slate-100 bg-gray-100 dark:bg-slate-900">
			<Navbar session={session} router={router} />
			<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
				<EditProfileHeader
					currentProfileState={formattedProfile}
					viewMode="view"
					handleFileChange={() => { }} // Empty function as we're in view mode
					handleRemoveProfilePicture={() => { }} // Empty function as we're in view mode
					handleRemoveCoverPhoto={() => { }} // Empty function as we're in view mode
					enterEditMode={() => {
						// Only allow editing if it's the user's own profile
						if (isOwnProfile) {
							router.push('/edit-profile');
						}
					}}
					isOwnProfile={isOwnProfile} // Pass flag to hide edit button for other users' profiles
					isFollowing={isFollowing}
					onFollowToggle={handleFollowToggle}
					followersCount={followersCount}
					followingCount={followingCount}
				/>

				{/* Friends List Section */}
				<FriendsListContainer />

				{/* Tabs */}
				<div className="flex border-b border-gray-200 dark:border-slate-700 mb-6 overflow-x-auto">
					<button
						className={`px-4 py-2 font-medium text-sm focus:outline-none whitespace-nowrap ${activeTab === 'profile' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
						onClick={() => setActiveTab('profile')}
					>
						Profile
					</button>
					<button
						className={`px-4 py-2 font-medium text-sm focus:outline-none whitespace-nowrap ${activeTab === 'posts' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
						onClick={() => setActiveTab('posts')}
					>
						Posts
					</button>
					{/* Only show Saved tab on own profile */}
					{isOwnProfile && (
						<button
							className={`px-4 py-2 font-medium text-sm focus:outline-none whitespace-nowrap ${activeTab === 'saved' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
							onClick={() => setActiveTab('saved')}
						>
							Saved
						</button>
					)}
				</div>

				{/* Profile sections in view mode */}
				{activeTab === 'profile' && (
					<>
						<EditProfileExperience
							currentProfileState={formattedProfile}
							formErrors={{}}
							isEditable={false}
						/>

						<EditProfileEducation
							currentProfileState={formattedProfile}
							formErrors={{}}
							isEditable={false}
						/>

						<EditProfileSkills
							currentProfileState={formattedProfile}
							formErrors={{}}
							isEditable={false}
						/>
					</>
				)}

				{activeTab === 'posts' && (
					<Posts userId={id} />
				)}

				{activeTab === 'saved' && isOwnProfile && (
					<Posts userId={id} type="saved" />
				)}
			</div>
		</div>
	);
}