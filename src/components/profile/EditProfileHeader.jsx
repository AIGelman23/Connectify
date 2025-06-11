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
		<div className="bg-white shadow-md border border-gray-200 rounded-lg overflow-hidden">
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
					<div className="w-full h-56 bg-gray-200 flex items-center justify-center">
						<p className="text-gray-500">No cover photo</p>
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
								className="absolute top-3 right-3 bg-[#1877f2] text-white text-sm font-semibold py-1 px-3 rounded-full shadow-sm hover:bg-[#166fe5] transition"
								title="Remove Cover Photo"
							>
								<i className="fas fa-trash-alt"></i>
							</button>
						)}
					</>
				)}
			</div>
			{/* Profile Picture and Basic Info */}
			<div className="relative px-4 pb-4 -mt-16 flex flex-col items-center">
				<div className="relative w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden">
					{currentProfileState.profilePicture ? (
						<img
							src={currentProfileState.profilePicture}
							alt="Profile Picture"
							className="w-full h-full object-cover"
							onError={(e) => {
								e.target.onerror = null;
								e.target.src = `https://placehold.co/128x128/A78BFA/ffffff?text=${currentProfileState.name ? currentProfileState.name[0].toUpperCase() : 'U'}`;
							}}
						/>
					) : (
						<span className="text-white text-5xl font-bold">
							{currentProfileState.name ? currentProfileState.name[0].toUpperCase() : 'U'}
						</span>
					)}
				</div>
				<div className="mt-4 text-center">
					<h1 className="text-2xl font-bold text-gray-800">{currentProfileState.name}</h1>
					<p className="text-md text-gray-600">{currentProfileState.headline}</p>
					<p className="text-sm text-gray-500 flex items-center justify-center mt-1">
						<i className="fas fa-map-marker-alt text-xs mr-1 mt-px"></i>
						{currentProfileState.location}
					</p>
					{/* Display summary in view mode in a rounded light-gray badge */}
					{viewMode === 'view' && currentProfileState.summary && (
						<div className="mt-2 bg-gray-100 px-3 py-1 rounded-full inline-block">
							<p className="text-sm text-gray-700">{currentProfileState.summary}</p>
						</div>
					)}
				</div>
				{viewMode === 'view' && (
					<button
						type="button"
						onClick={enterEditMode}
						className="absolute top-4 right-4 bg-[#1877f2] text-white font-semibold py-1 px-3 rounded-full shadow-sm hover:bg-[#166fe5] transition flex items-center space-x-2"
					>
						<i className="fas fa-pencil-alt text-sm"></i>
						<span>Edit Profile</span>
					</button>
				)}
			</div>
		</div>
	);
}
