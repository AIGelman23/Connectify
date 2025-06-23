"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from '../../../components/NavBar';
import EditProfileHeader from "../../../components/profile/EditProfileHeader";
import EditProfileExperience from "../../../components/profile/EditProfileExperience";
import EditProfileEducation from "../../../components/profile/EditProfileEducation";
import EditProfileSkills from "../../../components/profile/EditProfileSkills";
import FriendsListContainer from "../../../components/profile/FriendsListContainer";
import Posts from "../../../components/Posts";

export default function ProfilePage() {
	const { id } = useParams();
	const router = useRouter();
	const { data: session, status } = useSession();
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isOwnProfile, setIsOwnProfile] = useState(false);

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
			} catch (err) {
				console.error("Failed to fetch profile:", err);
				setError(err.message || "Failed to load profile");
			} finally {
				setLoading(false);
			}
		};

		fetchProfile();
	}, [id, status, router, session]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="flex flex-col items-center">
					<div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
					<p className="mt-4 text-lg text-gray-700">Loading profile...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="p-8 rounded-lg shadow-md bg-white max-w-md">
					<h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
					<p className="text-gray-700">{error}</p>
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
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="p-8 rounded-lg shadow-md bg-white max-w-md text-center">
					<h2 className="text-xl font-bold text-gray-800 mb-4">Profile Not Found</h2>
					<p className="text-gray-600">The profile you're looking for doesn't exist or you don't have permission to view it.</p>
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

	// Prepare the profile data for the components
	const formattedProfile = {
		name: profile.user?.name || "",
		email: profile.user?.email || "",
		headline: profile.headline || "",
		summary: profile.bio || "", // Map bio field to summary
		location: profile.location || "",
		profilePicture: profile.profilePictureUrl || session?.user?.image || "",
		coverPhoto: profile.coverPhotoUrl || "",
		resume: profile.resumeUrl || "",
		isProfileComplete: profile.isProfileComplete || false,
		experience: Array.isArray(profile.experiences) ? profile.experiences : [],
		education: Array.isArray(profile.education) ? profile.education : [],
		skills: Array.isArray(profile.skills) ? profile.skills : [],
	};

	return (
		<div className="min-h-screen font-sans antialiased text-gray-900">
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
				/>

				{/* Friends List Section */}
				<FriendsListContainer userId={id} isOwnProfile={isOwnProfile} />

				{/* Profile sections in view mode */}
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
			</div>
		</div>
	);
}
