// components/profile/EditProfileSkills.jsx
"use client";

import { useState } from 'react'; // Import useState for local editing state

export default function EditProfileSkills({
	currentProfileState,
	skillInput,
	setSkillInput,
	handleAddSkill,
	handleDeleteSkill,
	handleUpdateSkill,
	formErrors,
	MAX_SKILL_LENGTH,
	isEditable
}) {
	// State to manage which skill is currently being edited
	const [editingSkillId, setEditingSkillId] = useState(null);
	const [editSkillName, setEditSkillName] = useState('');
	const [editSkillError, setEditSkillError] = useState('');

	const handleEditClick = (skill) => {
		setEditingSkillId(skill.id);
		setEditSkillName(skill.name);
		setEditSkillError(''); // Clear any previous errors
	};

	const handleCancelEdit = () => {
		setEditingSkillId(null);
		setEditSkillName('');
		setEditSkillError('');
	};

	const handleSaveInlineEdit = (skill) => {
		const trimmedNewName = editSkillName.trim();

		if (!trimmedNewName) {
			setEditSkillError('Skill name cannot be empty.');
			return;
		}
		if (trimmedNewName.length > MAX_SKILL_LENGTH) {
			setEditSkillError(`Skill cannot exceed ${MAX_SKILL_LENGTH} characters.`);
			return;
		}

		// Check for duplicate skill name (excluding the current skill being edited)
		const isDuplicate = currentProfileState.skills.some(s =>
			s.id !== skill.id && s.name.toLowerCase() === trimmedNewName.toLowerCase()
		);
		if (isDuplicate) {
			setEditSkillError('This skill already exists.');
			return;
		}

		handleUpdateSkill(skill, trimmedNewName); // Call parent update handler
		setEditingSkillId(null); // Exit edit mode
		setEditSkillName('');
		setEditSkillError('');
	};


	return (
		<section className="p-8 rounded-md shadow bg-white dark:bg-slate-800">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Skills</h2>
			</div>
			<div className="space-y-4">
				{currentProfileState.skills?.length === 0 ? (
					<p className="text-gray-600 dark:text-gray-300 text-center py-4 w-full">
						No skills added yet.
					</p>
				) : (
					<div className="flex flex-wrap gap-2">
						{currentProfileState.skills.map(skill => (
							<div key={skill.id} className="flex items-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-1 rounded-full">
								{isEditable && editingSkillId === skill.id ? (
									// Inline edit mode for a skill
									<div className="flex items-center space-x-2">
										<input
											type="text"
											value={editSkillName}
											onChange={(e) => {
												setEditSkillName(e.target.value);
												setEditSkillError(''); // Clear error on change
											}}
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault(); // Prevent form submission
													handleSaveInlineEdit(skill);
												}
												if (e.key === 'Escape') {
													handleCancelEdit();
												}
											}}
											maxLength={MAX_SKILL_LENGTH}
											className="px-2 py-1 border border-gray-400 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
										/>
										<button
											type="button"
											onClick={() => handleSaveInlineEdit(skill)}
											className="text-green-600 hover:text-green-800"
											title="Save Skill"
										>
											<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
										</button>
										<button
											type="button"
											onClick={handleCancelEdit}
											className="text-red-500 hover:text-red-700"
											title="Cancel Edit"
										>
											<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
										</button>
										{editSkillError && <p className="text-red-500 text-xs ml-2">{editSkillError}</p>}
									</div>
								) : (
									// Display mode for a skill
									<>
										<span>{skill.name}</span>
										{isEditable && (
											<>
												{/* Edit button */}
												<button
													type="button"
													onClick={() => handleEditClick(skill)}
													className="ml-2 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none cursor-pointer"
													title="Edit Skill"
												>
													<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
														<path fillRule="evenodd" d="M13.586 3.586a2 2 0 112.828 2.828l-7.793 7.793-2.828.707.707-2.828 7.793-7.793zM10.97 4.97a1 1 0 00-1.414 1.414L10 8.586l1.414-1.414L10.97 4.97z" clipRule="evenodd" />
													</svg>
												</button>
												{/* Delete button */}
												<button
													type="button"
													onClick={() => handleDeleteSkill(skill.id)}
													className="ml-2 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none cursor-pointer"
													title="Remove Skill"
												>
													<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
														<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
													</svg>
												</button>
											</>
										)}
									</>
								)}
							</div>
						))}
					</div>
				)}
			</div>
			{isEditable && (
				<div className="mt-4 flex items-center gap-2">
					<input
						type="text"
						value={skillInput}
						onChange={(e) => setSkillInput(e.target.value)}
						placeholder="Enter a new skill..."
						className="flex-grow px-3 py-2 border border-[#1877f2] dark:border-blue-600 rounded-md focus:outline-none focus:ring-1 focus:ring-[#1877f2] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault(); // Prevent form submission
								handleAddSkill(skillInput);
								setSkillInput(''); // Clear input after adding
							}
						}}
					/>
					<button
						type="button"
						onClick={() => {
							handleAddSkill(skillInput);
							setSkillInput(''); // Clear input after adding
						}}
						className="px-4 py-2 bg-[#1877f2] dark:bg-blue-700 text-white font-semibold rounded-md hover:bg-[#166fe5] dark:hover:bg-blue-600 transition duration-150 ease-in-out"
					>
						Add Skill
					</button>
				</div>
			)}
			{formErrors.skillInput && <p className="text-red-500 text-xs mt-1">{formErrors.skillInput}</p>}
			{formErrors.skills && <p className="text-red-500 text-xs mt-1">{formErrors.skills}</p>}
		</section>
	);
}