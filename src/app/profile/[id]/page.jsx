"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from '../../../components/NavBar';
import EditProfileHeader from "../../../components/profile/EditProfileHeader";
import EditProfileExperience from "../../../components/profile/EditProfileExperience";
import EditProfileEducation from "../../../components/profile/EditProfileEducation";
import EditProfileSkills from "../../../components/profile/EditProfileSkills";

export default function UserProfilePage() {
	const { id } = useParams();
	const router = useRouter();
	const { data: session } = useSession();
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!id) return;
		const fetchUser = async () => {
			try {
				const res = await fetch(`/api/users/${id}`);
				if (!res.ok) throw new Error("User not found");
				const data = await res.json();
				setUser(data.user);
			} catch (err) {
				setUser(null);
			} finally {
				setLoading(false);
			}
		};
		fetchUser();
	}, [id]);

	if (loading) return <div className="p-8 text-center">Loading profile...</div>;
	if (!user) return <div className="p-8 text-center text-red-600">User not found.</div>;

	const profileState = {
		name: user.name,
		email: user.email,
		headline: user.profile?.headline || "",
		summary: user.profile?.bio || "",
		location: user.profile?.location || "",
		profilePicture: user.profile?.profilePictureUrl || user.image || "",
		coverPhoto: user.profile?.coverPhotoUrl || "",
		resume: user.profile?.resumeUrl || "",
		isProfileComplete: user.profile?.isProfileComplete || false,
		experience: user.profile?.experiences || [], // <-- use .experiences
		education: user.profile?.education || [],    // <-- use .education
		skills: user.profile?.skills || [],          // <-- use .skills
	};

	return (
		<div className="min-h-screen bg-gray-100 font-sans antialiased text-gray-900">
			<Navbar session={session} router={router} />
			<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
				<EditProfileHeader
					currentProfileState={profileState}
					viewMode="view"
				/>
				<EditProfileExperience
					currentProfileState={profileState}
					formErrors={{}}
					isEditable={false}
				/>
				<EditProfileEducation
					currentProfileState={profileState}
					formErrors={{}}
					isEditable={false}
				/>
				<EditProfileSkills
					currentProfileState={profileState}
					formErrors={{}}
					MAX_SKILL_LENGTH={50}
					isEditable={false}
				/>
			</div>
		</div>
	);
}
