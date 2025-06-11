"use client";

import ExperienceModal from "../../components/profile/ExperienceModal";

// Experience section component
export default function EditProfileExperience({ currentProfileState, openExperienceModal, handleDeleteExperience, formErrors, isEditable }) {
	// For date formatting, assume using same helper from page.jsx or inline comment.
	const formatDate = (dateString) => {
		// ...existing code...
		if (!dateString) return '';
		try {
			return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(new Date(dateString));
		} catch (e) {
			return dateString;
		}
	};
	return (
		<section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-semibold text-gray-800">Experience</h2>
				{isEditable && (
					<button
						type="button"
						onClick={() => openExperienceModal()}
						className="px-4 py-2 bg-[#1877f2] text-white font-semibold rounded-md hover:bg-[#166fe5] transition duration-150 ease-in-out"
					>
						Add New
					</button>
				)}
			</div>
			<div className="space-y-4">
				{currentProfileState.experience?.length === 0 ? (
					<p className="text-gray-600 text-center py-4">
						No experience added. {isEditable && 'Click "Add New" to get started.'}
					</p>
				) : (
					currentProfileState.experience.map((exp) => (
						<div key={exp.id} className="bg-white rounded-lg shadow border p-4">
							<p className="font-semibold text-gray-800">{exp.title}</p>
							<p className="text-gray-600 text-sm">{exp.company}</p>
							<p className="text-gray-500 text-xs">{exp.location}</p>
							<p className="text-gray-500 text-xs">
								{formatDate(exp.startDate)} – {exp.isCurrent ? 'Present' : formatDate(exp.endDate)}
							</p>
							{isEditable && (
								<div className="flex space-x-2 mt-2">
									<button
										type="button"
										onClick={() => openExperienceModal(exp)}
										className="text-[#1877f2] hover:text-[#166fe5] p-1 rounded-full hover:bg-indigo-50 transition"
										title="Edit Experience"
									>
										<i className="fas fa-edit"></i>
									</button>
									<button
										type="button"
										onClick={() => handleDeleteExperience(exp.id)}
										className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition"
										title="Delete Experience"
									>
										<i className="fas fa-trash-alt"></i>
									</button>
								</div>
							)}
						</div>
					))
				)}
			</div>
			{formErrors.experience && <p className="text-red-500 text-xs mt-1">{formErrors.experience}</p>}
		</section>
	);
}