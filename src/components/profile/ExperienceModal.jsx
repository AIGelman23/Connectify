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

	const [errors, setErrors] = useState({});

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
			setErrors({}); // Clear errors when modal opens
		}
	}, [isOpen, experienceToEdit]);

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
		// Clear error for the current field as the user types
		setErrors(prev => ({
			...prev,
			[name]: '',
		}));
	};

	const validateForm = () => {
		let newErrors = {};
		let isValid = true;

		if (!formData.title.trim()) {
			newErrors.title = "Title is required.";
			isValid = false;
		}
		if (!formData.company.trim()) {
			newErrors.company = "Company is required.";
			isValid = false;
		}
		if (!formData.startDate) {
			newErrors.startDate = "Start Date is required.";
			isValid = false;
		}

		if (!formData.isCurrent && !formData.endDate) {
			newErrors.endDate = "End Date is required unless 'I currently work here' is checked.";
			isValid = false;
		}

		if (formData.startDate && formData.endDate && !formData.isCurrent) {
			const start = new Date(formData.startDate);
			const end = new Date(formData.endDate);
			if (start > end) {
				newErrors.endDate = "End Date cannot be before Start Date.";
				isValid = false;
			}
		}

		setErrors(newErrors);
		return isValid;
	};

	const handleSave = () => {
		if (validateForm()) {
			onSave(formData);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="p-8 rounded-md shadow w-full max-w-md bg-white dark:bg-gray-800 animate-scale-in">
				<h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 border-b pb-2">
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
							className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 ${errors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
								} dark:bg-gray-700 dark:text-gray-100`}
						/>
						{errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
					</div>
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-1">Company</label>
						<input
							type="text"
							name="company"
							value={formData.company}
							onChange={handleChange}
							className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 ${errors.company ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
								} dark:bg-gray-700 dark:text-gray-100`}
						/>
						{errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
					</div>
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
						<input
							type="text"
							name="location"
							value={formData.location}
							onChange={handleChange}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
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
									} dark:bg-gray-700 dark:text-gray-100`}
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
									} dark:bg-gray-700 dark:text-gray-100`}
								disabled={formData.isCurrent}
							/>
							{errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
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
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y dark:bg-gray-700 dark:text-gray-100"
						></textarea>
					</div>
				</div>
				<div className="flex justify-end space-x-3 mt-6">
					<button
						onClick={onClose}
						className="px-5 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition duration-150 ease-in-out"
					>
						Cancel
					</button>
					<button
						onClick={handleSave}
						className="px-5 py-2 bg-[#1877f2] dark:bg-blue-700 text-white font-semibold rounded-md hover:bg-[#166fe5] dark:hover:bg-blue-600 transition duration-150 ease-in-out"
					>
						Save
					</button>
				</div>
			</div>
		</div>
	);
}