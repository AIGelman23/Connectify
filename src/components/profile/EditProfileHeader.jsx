"use client";
export default function EditProfileHeader({
	currentProfileState,
	viewMode,
	handleFileChange,
	handleRemoveProfilePicture,
	handleRemoveCoverPhoto,
	enterEditMode,
}) {
	return (
		<div className="dark:shadow-lg rounded-lg overflow-hidden">
			{/* Cover Photo */}
			<div className="relative">
				{currentProfileState.coverPhoto ? (
					<img
						src={currentProfileState.coverPhoto}
						alt="Cover Photo"
						className="w-full h-56 object-cover"
						onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x200/cccccc/333333?text=Cover+Photo+Error' }}
					/>
				) : (
					<div className="w-full h-56 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
						<p>No cover photo</p>
					</div>
				)}
				{viewMode === 'edit' && (
					<>
						<label
							htmlFor="coverPhoto"
							className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 text-white text-lg font-medium rounded-t-lg cursor-pointer opacity-0 hover:opacity-100 transition"
						>
							<i className="fas fa-camera text-2xl mr-2"></i>
							<span>Change Cover</span>
							<input
								type="file"
								id="coverPhoto"
								name="coverPhoto"
								accept="image/jpeg,image/png,image/webp"
								onChange={(e) => handleFileChange(e, 'coverPhoto')}
								className="hidden"
							/>
						</label>
						{currentProfileState.coverPhoto && (
							<button
								type="button"
								onClick={handleRemoveCoverPhoto}
								className="absolute top-3 right-3 bg-[#1877f2] dark:bg-blue-700 text-white text-sm font-semibold py-1 px-3 rounded-full shadow-sm hover:bg-[#166fe5] transition"
								title="Remove Cover Photo"
							>
								<i className="fas fa-trash-alt"></i>
							</button>
						)}
					</>
				)}
			</div>
			{/* Profile Picture and Basic Info */}
			<div className="relative px-4 pb-6 flex flex-col items-center profile-main-info">
				{/* Avatar positioned with negative margin */}
				<div className="-mt-16 mb-2">
					<div className="w-32 h-32 rounded-full border-4 border-white shadow-lg dark:shadow-xl overflow-hidden group flex items-center justify-center relative">
						{currentProfileState.profilePicture ? (
							<div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
								<img
									src={currentProfileState.profilePicture}
									alt="Profile Picture"
									className="w-full h-full object-cover object-center"
									style={{
										aspectRatio: "1 / 1",
										display: "block",
										width: "100%",
										height: "100%",
										borderRadius: "9999px",
									}}
									onError={(e) => {
										e.target.onerror = null;
										e.target.src = `https://placehold.co/128x128/A78BFA/ffffff?text=${currentProfileState.name ? currentProfileState.name[0].toUpperCase() : 'U'}`;
									}}
								/>
							</div>
						) : (
							<div className="w-full h-full bg-indigo-400 dark:bg-indigo-600 flex items-center justify-center rounded-full">
								<span className="text-white text-5xl font-bold">
									{currentProfileState.name ? currentProfileState.name[0].toUpperCase() : 'U'}
								</span>
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
										onChange={(e) => handleFileChange(e, 'profilePicture')}
										className="hidden"
									/>
								</label>
							</>
						)}
					</div>
				</div>
				<div className="mt-4 text-center w-full flex flex-col items-center">
					<h1 className="text-2xl font-bold">{currentProfileState.name}</h1>
					<p className="text-md">{currentProfileState.headline}</p>
					<p className="text-sm flex items-center justify-center mt-1">
						<i className="fas fa-map-marker-alt text-xs mr-1 mt-px"></i>
						{currentProfileState.location}
					</p>
					{viewMode === 'view' && currentProfileState.summary && (
						<div className="my-4 px-3 py-1 rounded-full inline-block">
							<p className="text-sm">{currentProfileState.summary}</p>
						</div>
					)}
					{viewMode === 'view' && typeof enterEditMode === "function" && (
						<button
							type="button"
							onClick={enterEditMode}
							className="profile-edit-btn bg-[#1877f2] dark:bg-blue-700 text-white font-semibold py-1 px-3 rounded-full shadow-sm hover:bg-[#166fe5] transition flex items-center space-x-2"
						>
							<i className="fas fa-pencil-alt text-sm"></i>
							<span>Edit Profile</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
}