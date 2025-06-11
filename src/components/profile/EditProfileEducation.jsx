"use client";
import EducationModal from "../../components/profile/EducationModal";
export default function EditProfileEducation({ currentProfileState, openEducationModal, handleDeleteEducation, formErrors, isEditable, isEducationModalOpen, closeEducationModal, handleSaveEducation, editingEducation }) {
	const formatDate = (dateString) => {
		if (!dateString) return '';
		try {
			return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(new Date(dateString));
		} catch (e) {
			return dateString;
		}
	};
	return (
		<section className="bg-white p-8 rounded-md shadow border border-gray-200">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-semibold text-gray-800">Education</h2>
				{isEditable && (
					<button
						type="button"
						onClick={() => openEducationModal()}
						className="px-4 py-2 bg-[#1877f2] text-white font-semibold rounded-md hover:bg-[#166fe5] transition duration-150 ease-in-out"
					>
						Add New
					</button>
				)}
			</div>
			<div className="space-y-4">
				{currentProfileState.education?.length === 0 ? (
					<p className="text-gray-600 text-center py-4">
						No education added. {isEditable && 'Click "Add New" to get started.'}
					</p>
				) : (
					currentProfileState.education.map((edu) => (
						<div key={edu.id} className="bg-white rounded-lg shadow border p-4">
							<p className="font-semibold text-gray-800">{edu.school}</p>
							<p className="text-gray-600 text-sm">
								{edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}
							</p>
							<p className="text-gray-500 text-xs">
								{formatDate(edu.startDate)} – {formatDate(edu.endDate)}
							</p>
							{isEditable && (
								<div className="flex space-x-2 mt-2">
									<button
										type="button"
										onClick={() => openEducationModal(edu)}
										className="text-[#1877f2] hover:text-[#166fe5] p-1 rounded-full hover:bg-indigo-50 transition"
										title="Edit Education"
									>
										<i className="fas fa-edit"></i>
									</button>
									<button
										type="button"
										onClick={() => handleDeleteEducation(edu.id)}
										className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition"
										title="Delete Education"
									>
										<i className="fas fa-trash-alt"></i>
									</button>
								</div>
							)}
						</div>
					))
				)}
			</div>
			{formErrors.education && <p className="text-red-500 text-xs mt-1">{formErrors.education}</p>}
			{isEditable && (
				<EducationModal
					isOpen={isEducationModalOpen}
					onClose={closeEducationModal}
					onSave={handleSaveEducation}
					educationToEdit={editingEducation}
				/>
			)}
		</section>
	);
}
