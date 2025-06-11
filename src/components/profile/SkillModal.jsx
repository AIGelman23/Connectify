"use client";

import { useState, useEffect } from "react";

// SkillModal component
export default function SkillModal({ isOpen, onClose, onAdd, skillToEdit, onUpdate, MAX_SKILL_LENGTH }) {
  const [currentSkillInput, setCurrentSkillInput] = useState(skillToEdit?.name || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCurrentSkillInput(skillToEdit?.name || '');
      setError('');
    }
  }, [isOpen, skillToEdit]);

  const handleSkillChange = (e) => {
    setCurrentSkillInput(e.target.value);
    setError('');
  };

  const handleSave = () => {
    const trimmedSkill = currentSkillInput.trim();
    if (!trimmedSkill) {
      setError('Skill cannot be empty.');
      return;
    }
    if (trimmedSkill.length > MAX_SKILL_LENGTH) {
      setError(`Skill cannot exceed ${MAX_SKILL_LENGTH} characters.`);
      return;
    }

    if (skillToEdit) {
      onUpdate(skillToEdit, trimmedSkill);
    } else {
      onAdd(trimmedSkill);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 animate-scale-in">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
          {skillToEdit ? 'Edit Skill' : 'Add New Skill'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Skill Name</label>
            <input
              type="text"
              value={currentSkillInput}
              onChange={handleSkillChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g., JavaScript, Project Management"
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition duration-150 ease-in-out flex items-center space-x-2"
          >
            <i className="fas fa-times"></i>
            <span>Cancel</span>
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#1877f2] text-white font-semibold rounded-lg hover:bg-[#166fe5] transition duration-150 ease-in-out flex items-center space-x-2"
          >
            {skillToEdit ? (
              <>
                <i className="fas fa-edit"></i>
                <span>Update Skill</span>
              </>
            ) : (
              <>
                <i className="fas fa-plus"></i>
                <span>Add Skill</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}