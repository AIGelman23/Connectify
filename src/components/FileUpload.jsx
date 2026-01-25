// src/components/FileUpload.js

import React, { useState, useRef } from 'react';
import { Upload, X, Image, FileText, Camera } from 'lucide-react';

const FileUpload = ({
	onFileSelect,
	acceptedTypes,
	maxSize = 10,
	uploadType,
	currentUrl = null,
	label,
	className = ""
}) => {
	const [dragOver, setDragOver] = useState(false);
	const [selectedFile, setSelectedFile] = useState(null);
	const [preview, setPreview] = useState(currentUrl);
	const fileInputRef = useRef(null);

	const formatFileSize = (bytes) => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	const validateFile = (file) => {
		if (!acceptedTypes.includes(file.type)) {
			throw new Error(`File type not supported. Accepted types: ${acceptedTypes.join(', ')}`);
		}

		if (file.size > maxSize * 1024 * 1024) {
			throw new Error(`File size too large. Maximum size: ${maxSize}MB`);
		}

		return true;
	};

	const handleFileSelect = (file) => {
		try {
			validateFile(file);
			setSelectedFile(file);

			// Create preview for images
			if (file.type.startsWith('image/')) {
				const reader = new FileReader();
				reader.onload = (e) => setPreview(e.target.result);
				reader.readAsDataURL(file);
			} else {
				setPreview(null);
			}

			onFileSelect(file, uploadType);
		} catch (error) {
			alert(error.message);
		}
	};

	const handleDrop = (e) => {
		e.preventDefault();
		setDragOver(false);

		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) {
			handleFileSelect(files[0]);
		}
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		setDragOver(true);
	};

	const handleDragLeave = () => {
		setDragOver(false);
	};

	const handleFileInputChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			handleFileSelect(file);
		}
	};

	const clearFile = () => {
		setSelectedFile(null);
		setPreview(currentUrl);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
		onFileSelect(null, uploadType);
	};

	const openFileDialog = () => {
		fileInputRef.current?.click();
	};

	const getIcon = () => {
		if (uploadType === 'profilePicture' || uploadType === 'coverPhoto') {
			return <Image className="w-8 h-8 text-gray-400 dark:text-slate-500" />;
		}
		return <FileText className="w-8 h-8 text-gray-400 dark:text-slate-500" />;
	};

	const isImage = selectedFile?.type.startsWith('image/') || (currentUrl && !selectedFile);

	return (
		<div className={`space-y-4 ${className}`}>
			{label && (
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					{label}
				</label>
			)}

			{/* Preview Area */}
			{preview && isImage && (
				<div className="relative">
					<img
						src={preview}
						alt="Preview"
						className={`w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-slate-600 ${uploadType === 'profilePicture' ? 'w-32 h-32 rounded-full' : ''
							}`}
					/>
					{selectedFile && (
						<button
							onClick={clearFile}
							className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>
			)}

			{/* File Info */}
			{selectedFile && !isImage && (
				<div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border dark:border-slate-600">
					<div className="flex items-center space-x-3">
						<FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
						<div>
							<p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
							<p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
						</div>
					</div>
					<button
						onClick={clearFile}
						className="text-red-500 hover:text-red-700 transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			)}

			{/* Upload Area */}
			{!selectedFile && (
				<div
					className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragOver
						? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
						: 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
						}`}
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
				>
					{getIcon()}
					<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
						Drag and drop your file here, or{' '}
						<button
							type="button"
							onClick={openFileDialog}
							className="text-blue-600 dark:text-blue-400 hover:text-blue-500 font-medium"
						>
							browse
						</button>
					</p>
					<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
						Max size: {maxSize}MB
					</p>
				</div>
			)}

			{/* Change File Button */}
			{selectedFile && (
				<button
					type="button"
					onClick={openFileDialog}
					className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					Change File
				</button>
			)}

			{/* Hidden File Input */}
			<input
				ref={fileInputRef}
				type="file"
				accept={acceptedTypes.join(',')}
				onChange={handleFileInputChange}
				className="hidden"
			/>
		</div>
	);
};

export default FileUpload;