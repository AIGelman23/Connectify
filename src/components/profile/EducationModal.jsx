"use client";

import { useState, useEffect } from "react";

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(new Date(dateString));
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return dateString; // Return original if invalid
  }
};

export default function EducationModal({ isOpen, onClose, onSave, educationToEdit }) {
  const [formData, setFormData] = useState({
    id: educationToEdit?.id || '',
    school: educationToEdit?.school || '', // Frontend uses 'school'
    degree: educationToEdit?.degree || '',
    fieldOfStudy: educationToEdit?.fieldOfStudy || '',
    startDate: educationToEdit?.startDate || '',
    endDate: educationToEdit?.endDate || '',
    description: educationToEdit?.description || '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        id: educationToEdit?.id || '',
        school: educationToEdit?.school || '',
        degree: educationToEdit?.degree || '',
        fieldOfStudy: educationToEdit?.fieldOfStudy || '',
        startDate: educationToEdit?.startDate || '',
        endDate: educationToEdit?.endDate || '',
        description: educationToEdit?.description || '',
      });
      setErrors({});
    }
  }, [isOpen, educationToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSave = () => {
    const newErrors = {};
    if (!formData.school.trim()) newErrors.school = 'School is required.';
    if (!formData.degree.trim()) newErrors.degree = 'Degree is required.';
    if (!formData.startDate) newErrors.startDate = 'Start Date is required.';
    if (!formData.endDate) newErrors.endDate = 'End Date is required.';
    if (newErrors.startDate && newErrors.endDate) {
      newErrors.dateRange = 'Invalid date range.';
    } else if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.dateRange = 'Start date cannot be after end date.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 animate-scale-in">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
          {educationToEdit ? 'Edit Education' : 'Add Education'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">School</label>
            <input
              type="text"
              name="school"
              value={formData.school}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.school && <p className="text-red-500 text-xs mt-1">{errors.school}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Degree</label>
            <input
              type="text"
              name="degree"
              value={formData.degree}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.degree && <p className="text-red-500 text-xs mt-1">{errors.degree}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Field of Study</label>
            <input
              type="text"
              name="fieldOfStudy"
              value={formData.fieldOfStudy}
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
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
            </div>
          </div>
          {errors.dateRange && <p className="text-red-500 text-xs mt-1 text-center">{errors.dateRange}</p>}
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
            className="px-5 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition duration-150 ease-in-out flex items-center space-x-2"
          >
            <i className="fas fa-times"></i>
            <span>Cancel</span>
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#1877f2] text-white font-semibold rounded-lg hover:bg-[#166fe5] transition duration-150 ease-in-out flex items-center space-x-2"
          >
            <i className="fas fa-check"></i>
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}