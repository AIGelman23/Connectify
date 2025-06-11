"use client";

import { useState, useEffect } from "react";

// ExperienceModal component
export default function ExperienceModal({ isOpen, onClose, onSave, experienceToEdit }) {
  const [formData, setFormData] = useState({
    id: experienceToEdit?.id || '',
    title: experienceToEdit?.title || '',
    company: experienceToEdit?.company || '',
    location: experienceToEdit?.location || '',
    startDate: experienceToEdit?.startDate || '',
    endDate: experienceToEdit?.endDate || '',
    isCurrent: experienceToEdit?.isCurrent || false,
    description: experienceToEdit?.description || '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        id: experienceToEdit?.id || '',
        title: experienceToEdit?.title || '',
        company: experienceToEdit?.company || '',
        location: experienceToEdit?.location || '',
        startDate: experienceToEdit?.startDate || '',
        endDate: experienceToEdit?.endDate || '',
        isCurrent: experienceToEdit?.isCurrent || false,
        description: experienceToEdit?.description || '',
      });
    }
  }, [isOpen, experienceToEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = () => {
    // Optional: perform field validations here
    if (!formData.title.trim() || !formData.company.trim() || !formData.startDate) {
      // Optionally, display validation errors.
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-md shadow border border-gray-200 w-full max-w-md animate-scale-in">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
          {experienceToEdit ? 'Edit Experience' : 'Add Experience'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Company</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={formData.isCurrent}
              />
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isCurrent"
              checked={formData.isCurrent}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">I currently work here</span>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
            ></textarea>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300 transition duration-150 ease-in-out"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#1877f2] text-white font-semibold rounded-md hover:bg-[#166fe5] transition duration-150 ease-in-out"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}