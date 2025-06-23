"use client";

import { useState, useEffect } from "react";

const formatDate = (dateString) => {
	if (!dateString) return '';
	try {
		return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(new Date(dateString));
	} catch (e) {
		console.error("Error formatting date:", dateString, e);
		return dateString;
	}
};

export default function EducationModal({ isOpen, onClose, onSave, educationToEdit }) {
	const [formData, setFormData] = useState(() => ({
		id: educationToEdit?.id || '',
		institution: educationToEdit?.institution || '',
		degree: educationToEdit?.degree || '',
		fieldOfStudy: educationToEdit?.fieldOfStudy || '',
		startDate: educationToEdit?.startDate || '',
		endDate: educationToEdit?.endDate || '',
		description: educationToEdit?.description || '',
	}));
	const [errors, setErrors] = useState({});

	useEffect(() => {
		if (isOpen) {
			setFormData({
				id: educationToEdit?.id || '',
				institution: educationToEdit?.institution || '',
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
		setErrors(prev => ({ ...prev, [name]: '', dateRange: '' }));
	};

	const validateForm = () => {
		const newErrors = {};
		let isValid = true;

		if (!formData.institution.trim()) {
			newErrors.institution = 'Institution is required.';
			isValid = false;
		}
		if (!formData.degree.trim()) {
			newErrors.degree = 'Degree is required.';
			isValid = false;
		}
		if (!formData.startDate) {
			newErrors.startDate = 'Start Date is required.';
			isValid = false;
		}
		if (!formData.endDate) {
			newErrors.endDate = 'End Date is required.';
			isValid = false;
		}

		if (formData.startDate && formData.endDate) {
			const start = new Date(formData.startDate);
			const end = new Date(formData.endDate);
			if (start > end) {
				newErrors.dateRange = 'Start date cannot be after end date.';
				isValid = false;
			}
		}

		setErrors(newErrors);
		return isValid;
	};

	const handleSave = () => {
		if (validateForm()) {
			// Debug: log formData before saving
			console.log("EducationModal handleSave formData:", formData);
			// Ensure id is present for new entries (parent may also handle this)
			onSave({
				...formData,
				id: formData.id || undefined // Let parent assign uuid if needed
			});
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
				<h3 className="text-2xl font-bold mb-4 border-b pb-2">
					{educationToEdit?.id ? 'Edit Education' : 'Add Education'}
				</h3>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-1">Institution</label>
						<input
							type="text"
							name="institution"
							value={formData.institution}
							onChange={handleChange}
							className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-1 ${errors.institution ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
								}`}
						/>
						{errors.institution && <p className="text-red-500 text-xs mt-1">{errors.institution}</p>}
					</div>
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-1">Degree</label>
						<input
							type="text"
							name="degree"
							value={formData.degree}
							onChange={handleChange}
							className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 ${errors.degree ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
								} dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600`}
						/>
						{errors.degree && <p className="text-red-500 text-xs mt-1">{errors.degree}</p>}
					</div>
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-1">Field of Study (Optional)</label>
						<input
							type="text"
							name="fieldOfStudy"
							value={formData.fieldOfStudy}
							onChange={handleChange}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
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
								className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 ${errors.startDate ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
									} dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600`}
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
								className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 ${errors.endDate ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
									} dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600`}
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
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
						></textarea>
					</div>
				</div>
				<div className="flex justify-end space-x-3 mt-6">
					<button
						onClick={onClose}
						className="px-5 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition duration-150 ease-in-out flex items-center space-x-2"
					>
						<i className="fas fa-times"></i>
						<span>Cancel</span>
					</button>
					<button
						onClick={handleSave}
						className="px-5 py-2 bg-[#1877f2] dark:bg-blue-700 text-white font-semibold rounded-lg hover:bg-[#166fe5] dark:hover:bg-blue-600 transition duration-150 ease-in-out flex items-center space-x-2"
					>
						<i className="fas fa-check"></i>
						<span>Save</span>
					</button>
				</div>
			</div>
		</div>
	);
}