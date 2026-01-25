"use client";

import { useEffect } from "react";
import { VerifiedBadge, AdminBadge } from "@/components/ui/Badge";

export default function EditProfileHeader({
	currentProfileState,
	viewMode,
	handleFileChange,
	handleRemoveProfilePicture,
	handleRemoveCoverPhoto,
	enterEditMode,
	isOwnProfile = true,
	isFollowing = false,
	onFollowToggle,
	followersCount = 0,
	followingCount = 0,
	subscriptionPlan = null,
	userRole = null,
}) {

	// Debug logging to track state
	useEffect(() => {
		console.log("EditProfileHeader render - viewMode:", viewMode);
		console.log("Current profile picture:", currentProfileState.profilePicture);
		console.log("Current cover photo:", currentProfileState.coverPhoto);
	}, [currentProfileState.profilePicture, currentProfileState.coverPhoto, viewMode]);

	// Handle profile image change without session update
	const handleProfileImageChange = (e) => {
		// Just call the passed handler, don't update session
		handleFileChange(e, 'profilePicture');
	};

	return (
		<div className="bg-white dark:bg-slate-800 dark:shadow-lg rounded-lg overflow-hidden">
			{/* Cover Photo */}
			<div className="relative h-52 bg-gradient-to-r from-blue-400 to-indigo-500">
				{currentProfileState.coverPhoto ? (
					<img
						src={currentProfileState.coverPhoto}
						alt="Cover"
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-white">
						{viewMode === "view" ? (
							<span className="text-white/70">No cover photo</span>
						) : (
							<>
								<label
									htmlFor="coverPhoto"
									className="cursor-pointer flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition"
								>
									<i className="fas fa-image"></i>
									<span>Add Cover Photo</span>
									<input
										type="file"
										id="coverPhoto"
										name="coverPhoto"
										accept="image/jpeg,image/png,image/webp"
										onChange={(e) => handleFileChange(e, "coverPhoto")}
										className="hidden"
									/>
								</label>
							</>
						)}
					</div>
				)}

				{viewMode === "edit" && currentProfileState.coverPhoto && (
					<div className="absolute bottom-4 right-4 flex space-x-2">
						<label
							htmlFor="coverPhoto"
							className="cursor-pointer bg-white text-gray-700 px-3 py-1 rounded-md hover:bg-gray-100 transition shadow-md flex items-center space-x-1"
						>
							<i className="fas fa-camera"></i>
							<span>Change</span>
							<input
								type="file"
								id="coverPhoto"
								name="coverPhoto"
								accept="image/jpeg,image/png,image/webp"
								onChange={(e) => handleFileChange(e, "coverPhoto")}
								className="hidden"
							/>
						</label>
						<button
							onClick={handleRemoveCoverPhoto}
							className="bg-white text-red-500 px-3 py-1 rounded-md hover:bg-gray-100 transition shadow-md flex items-center space-x-1"
						>
							<i className="fas fa-trash"></i>
							<span>Remove</span>
						</button>
					</div>
				)}
			</div>

			{/* Profile Picture and Basic Info */}
			<div className="relative px-4 pb-6 flex flex-col items-center profile-main-info">
				<div className="-mt-16 mb-2">
					<div className="relative">
						<div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 shadow-lg dark:shadow-xl overflow-hidden group flex items-center justify-center">
							{currentProfileState.profilePicture ? (
								<img
									src={currentProfileState.profilePicture}
									alt="Profile"
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-300 text-5xl">
									<i className="fas fa-user"></i>
								</div>
							)}
							{viewMode === 'edit' && (
								<>
									<label
										htmlFor="profilePicture"
										className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 text-white text-xs font-medium rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1"
										style={{
											minWidth: 0,
											minHeight: 0,
											fontSize: "0.85rem",
											lineHeight: 1.2,
										}}
									>
										<i className="fas fa-camera text-base mr-1"></i>
										<span className="text-xs">Change</span>
										<input
											type="file"
											id="profilePicture"
											name="profilePicture"
											accept="image/jpeg,image/png,image/webp"
											onChange={handleProfileImageChange}
											className="hidden"
										/>
									</label>
									{currentProfileState.profilePicture && (
										<button
											onClick={handleRemoveProfilePicture}
											className="absolute bottom-0 transform translate-y-8 opacity-0 group-hover:opacity-100 group-hover:translate-y-6 transition-all duration-200 bg-white text-red-500 px-2 py-1 text-xs rounded shadow"
										>
											Remove
										</button>
									)}
								</>
							)}
						</div>
						{/* Badge overlays on profile avatar */}
						{userRole && userRole !== 'USER' && (
							<div className="absolute bottom-2 left-2 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-lg flex items-center justify-center">
								<AdminBadge 
									role={userRole.toLowerCase()} 
									size="xl"
									showTooltip={true}
								/>
							</div>
						)}
						{subscriptionPlan && (
							<div className="absolute bottom-2 right-2 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-lg flex items-center justify-center">
								<VerifiedBadge 
									plan={subscriptionPlan.toLowerCase()} 
									size="xl"
									showTooltip={true}
								/>
							</div>
						)}
					</div>
				</div>

				<div className="text-center">
					<div className="flex items-center justify-center gap-1.5">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
							{currentProfileState.name || "Your Name"}
						</h1>
					</div>
					<p className="mt-1 text-gray-700 dark:text-slate-300">
						{currentProfileState.headline || "Your Headline"}
					</p>
					<p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
						{currentProfileState.location || "Your Location"}
					</p>

					<div className="flex items-center justify-center space-x-6 mt-4">
						<div className="text-center">
							<span className="block font-bold text-gray-900 dark:text-slate-100 text-lg">{followersCount}</span>
							<span className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Followers</span>
						</div>
						<div className="text-center">
							<span className="block font-bold text-gray-900 dark:text-slate-100 text-lg">{followingCount}</span>
							<span className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Following</span>
						</div>
					</div>
				</div>

				{viewMode === "view" && isOwnProfile ? (
					<button
						onClick={enterEditMode}
						className="mt-5 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-150 ease-in-out"
					>
						Edit Profile
					</button>
				) : viewMode === "view" && !isOwnProfile ? (
					<button
						onClick={onFollowToggle}
						className={`mt-5 px-6 py-2 font-medium rounded-lg transition duration-150 ease-in-out ${isFollowing
							? "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
							: "bg-blue-600 text-white hover:bg-blue-700"
							}`}
					>
						{isFollowing ? "Following" : "Follow"}
					</button>
				) : null}
			</div>
		</div>
	);
}