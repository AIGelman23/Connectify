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

	// Determine a unique key for the modal based on what's being edited
	// If editing an existing item, use its ID. If adding new, use a constant key.
	// This key will change when you switch from "Add New" to "Edit X" or "Edit X" to "Edit Y".
	// It will also change if you close and reopen for a new item if you reset `editingEducation` to `null`
	// when closing the modal, as you should.
	const modalKey = editingEducation?.id || 'new-education-modal';

	return (
		<section className="p-8 rounded-md shadow bg-white dark:bg-slate-800">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Education</h2>
				{isEditable && (
					<button
						type="button"
						// This `openEducationModal` function should set `editingEducation` to `null` for new entries
						// and set `isEducationModalOpen` to `true`.
						onClick={() => openEducationModal()}
						className="px-4 py-2 bg-[#1877f2] dark:bg-blue-700 text-white font-semibold rounded-md hover:bg-[#166fe5] dark:hover:bg-blue-600 transition duration-150 ease-in-out"
					>
						Add New
					</button>
				)}
			</div>
			<div className="space-y-4">
				{currentProfileState.education?.length === 0 ? (
					<p className="text-center py-4 text-gray-600 dark:text-slate-400">
						No education added. {isEditable && 'Click "Add New" to get started.'}
					</p>
				) : (
					currentProfileState.education.map((edu) => (
						<div key={edu.id} className="rounded-lg shadow p-4 bg-gray-50 dark:bg-slate-700">
							{/* Always show institution, even in preview mode */}
							<p className="font-semibold text-gray-900 dark:text-slate-100">{edu.institution}</p>
							<p className="text-sm text-gray-700 dark:text-slate-300">
								{edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}
							</p>
							<p className="text-xs text-gray-500 dark:text-slate-400">
								{formatDate(edu.startDate)} – {formatDate(edu.endDate)}
							</p>
							{isEditable && (
								<div className="flex space-x-2 mt-2">
									<button
										type="button"
										// This `openEducationModal` function should pass the `edu` object
										// and set `isEducationModalOpen` to `true`.
										onClick={() => openEducationModal(edu)}
										className="text-[#1877f2] dark:text-blue-400 hover:text-[#166fe5] dark:hover:text-blue-300 p-1 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-600 transition"
										title="Edit Education"
									>
										<i className="fas fa-edit"></i>
									</button>
									<button
										type="button"
										onClick={() => handleDeleteEducation(edu.id)}
										className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 transition"
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

			{/* Apply the key prop here */}
			{isEditable && isEducationModalOpen && ( // Only render if editable AND open
				<EducationModal
					key={modalKey}
					isOpen={isEducationModalOpen}
					onClose={closeEducationModal}
					onSave={handleSaveEducation}
					educationToEdit={editingEducation}
				/>
			)}
		</section>
	);
}
