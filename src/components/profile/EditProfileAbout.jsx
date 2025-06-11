"use client";
export default function EditProfileAbout({ currentProfileState, formErrors, handleChange, MAX_HEADLINE_LENGTH, MAX_SUMMARY_LENGTH, MAX_LOCATION_LENGTH, isEditable }) {
	return (
		<section className="bg-white p-8 rounded-md shadow border border-gray-200">
			<h2 className="text-2xl font-semibold text-gray-800 mb-6">About</h2>
			<div className="space-y-4">
				<div>
					<label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
					<input
						type="text"
						id="name"
						name="name"
						value={currentProfileState.name}
						onChange={handleChange}
						disabled={!isEditable}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
					/>
					{formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
				</div>
				<div>
					<label htmlFor="headline" className="block text-sm font-semibold text-gray-700 mb-1">Headline</label>
					<input
						type="text"
						id="headline"
						name="headline"
						value={currentProfileState.headline}
						onChange={handleChange}
						disabled={!isEditable}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
						maxLength={MAX_HEADLINE_LENGTH}
					/>
					{formErrors.headline && <p className="text-red-500 text-xs mt-1">{formErrors.headline}</p>}
				</div>
				<div>
					<label htmlFor="summary" className="block text-sm font-semibold text-gray-700 mb-1">Summary</label>
					<textarea
						id="summary"
						name="summary"
						value={currentProfileState.summary}
						onChange={handleChange}
						disabled={!isEditable}
						rows="4"
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
						maxLength={MAX_SUMMARY_LENGTH}
					></textarea>
					{formErrors.summary && <p className="text-red-500 text-xs mt-1">{formErrors.summary}</p>}
				</div>
				<div>
					<label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
					<input
						type="text"
						id="location"
						name="location"
						value={currentProfileState.location}
						onChange={handleChange}
						disabled={!isEditable}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
						maxLength={MAX_LOCATION_LENGTH}
					/>
					{formErrors.location && <p className="text-red-500 text-xs mt-1">{formErrors.location}</p>}
				</div>
			</div>
		</section>
	);
}
