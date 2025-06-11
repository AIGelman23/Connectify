"use client";
import SkillModal from "../../components/profile/SkillModal";
export default function EditProfileSkills({
	currentProfileState,
	skillInput,
	setSkillInput,
	handleAddSkill,
	handleDeleteSkill,
	openSkillModal,
	formErrors,
	MAX_SKILL_LENGTH,
	isEditable
}) {
	return (
		<section className="bg-white p-8 rounded-md shadow border border-gray-200">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-semibold text-gray-800">Skills</h2>
				{isEditable && (
					<button
						type="button"
						onClick={() => openSkillModal()}
						className="px-4 py-2 bg-[#1877f2] text-white font-semibold rounded-md hover:bg-[#166fe5] transition duration-150 ease-in-out"
					>
						Add Skill
					</button>
				)}
			</div>
			<div className="space-y-4">
				{currentProfileState.skills?.length === 0 ? (
					<p className="text-gray-600 text-center py-4 w-full">
						No skills added yet.
					</p>
				) : (
					<div className="flex flex-wrap gap-2">
						{currentProfileState.skills.map(skill => (
							<div key={skill.id} className="flex items-center bg-gray-200 text-gray-800 px-3 py-1 rounded-full">
								<span>{skill.name}</span>
								{isEditable && (
									<button
										type="button"
										onClick={() => handleDeleteSkill(skill.id)}
										className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
										title="Remove Skill"
									>
										<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 
											1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 
											01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
										</svg>
									</button>
								)}
							</div>
						))}
					</div>
				)}
			</div>
			{isEditable && (
				<div className="mt-4">
					<input
						type="text"
						value={skillInput}
						onChange={(e) => setSkillInput(e.target.value)}
						placeholder="Enter a skill..."
						className="w-full px-3 py-2 border border-[#1877f2] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1877f2]"
					/>
				</div>
			)}
			{formErrors.skillInput && <p className="text-red-500 text-xs mt-1">{formErrors.skillInput}</p>}
			{formErrors.skills && <p className="text-red-500 text-xs mt-1">{formErrors.skills}</p>}
			{/* Note: SkillModal remains handled separately */}
		</section>
	);
}
