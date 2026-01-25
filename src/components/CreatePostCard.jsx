"use client";

import React, { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import EmojiSelector from './EmojiSelector'; // Import the EmojiSelector component
import PostCard from './PostCard';
import Tooltip from './Tooltip';
import Cropper from 'react-easy-crop';
import confetti from 'canvas-confetti';

const MAX_POST_LENGTH = 2000;

// Helper to create the cropped image
const getCroppedImg = async (imageSrc, pixelCrop) => {
	const image = new Image();
	image.src = imageSrc;
	await new Promise((resolve) => { image.onload = resolve; });

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	canvas.width = pixelCrop.width;
	canvas.height = pixelCrop.height;

	ctx.drawImage(
		image,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
		0,
		0,
		pixelCrop.width,
		pixelCrop.height
	);

	return new Promise((resolve) => {
		canvas.toBlob((blob) => {
			resolve(blob);
		}, 'image/jpeg');
	});
};

const CircularProgress = ({ progress, size = 48, strokeWidth = 4 }) => {
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const offset = circumference - (progress / 100) * circumference;

	return (
		<div className="relative flex items-center justify-center">
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				className="transform -rotate-90 drop-shadow-md"
			>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="currentColor"
					strokeWidth={strokeWidth}
					fill="transparent"
					className="text-white/30"
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="currentColor"
					strokeWidth={strokeWidth}
					fill="transparent"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					strokeLinecap="round"
					className={`${progress === 100 ? 'text-green-500' : 'text-blue-500'} transition-all duration-300 ease-out`}
				/>
			</svg>
			<span className="absolute text-xs font-bold text-white drop-shadow-md">{Math.round(progress)}%</span>
		</div>
	);
};

// Helper to upload file with progress tracking
const uploadFile = (file, onProgress) => {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', '/api/upload');

		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) {
				const percentComplete = Math.round((event.loaded / event.total) * 100);
				onProgress(percentComplete);
			}
		};

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				try {
					const data = JSON.parse(xhr.responseText);
					resolve(data);
				} catch (e) {
					reject(new Error('Failed to parse response'));
				}
			} else {
				reject(new Error('Upload failed'));
			}
		};

		xhr.onerror = () => reject(new Error('Upload failed'));

		const formData = new FormData();
		formData.append('file', file);
		xhr.send(formData);
	});
};

// Modern Facebook-style Media Modal
function ModernMediaModal({ isOpen, onClose, onFilesSelected, fileType, selectedFiles, onRemove, onCropStart, onReorder }) {
	const fileInputRef = useRef();
	const [draggedIndex, setDraggedIndex] = useState(null);
	const [isDragging, setIsDragging] = useState(false);

	const handleDragStart = (e, index) => {
		setDraggedIndex(index);
		e.dataTransfer.effectAllowed = "move";
	};

	const handleDragOver = (e, index) => {
		e.preventDefault(); // Necessary to allow dropping
		e.dataTransfer.dropEffect = "move";
	};

	const handleDrop = (e, index) => {
		e.preventDefault();
		if (draggedIndex !== null && draggedIndex !== index) {
			onReorder(draggedIndex, index);
		}
		setDraggedIndex(null);
	};

	const handleChooseFile = () => {
		if (fileInputRef.current) fileInputRef.current.click();
	};

	const handleFileChange = (e) => {
		if (e.target.files && e.target.files.length > 0) {
			onFilesSelected(Array.from(e.target.files));
		}
	};

	const handleDragEnter = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.currentTarget.contains(e.relatedTarget)) return;
		setIsDragging(false);
	};

	const handleDropZone = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			onFilesSelected(Array.from(e.dataTransfer.files));
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
			onClick={onClose}
		>
			<div
				className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-down flex flex-col max-h-[90vh]"
				onClick={e => e.stopPropagation()}
			>
				<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
					<h2 className="text-xl font-bold text-gray-900 dark:text-white text-center flex-1">
						{fileType === "image" ? "Add Photos" : "Add Video"}
					</h2>
					<button
						className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
						onClick={onClose}
						aria-label="Close"
					>
						<i className="fas fa-times"></i>
					</button>
				</div>

				<div className="p-4 overflow-y-auto custom-scrollbar">
					{selectedFiles.length > 0 ? (
						<div className="grid grid-cols-2 gap-4">
							{selectedFiles.map((fileObj, index) => (
								<div
									key={fileObj.preview}
									className={`relative group aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 ${fileType === "image" ? "cursor-move" : ""}`}
									draggable={fileType === "image"}
									onDragStart={(e) => handleDragStart(e, index)}
									onDragOver={(e) => handleDragOver(e, index)}
									onDrop={(e) => handleDrop(e, index)}
								>
									{fileType === "image" ? (
										<img
											src={fileObj.preview}
											alt={`Preview ${index}`}
											className="w-full h-full object-cover"
										/>
									) : (
										<video
											src={fileObj.preview}
											className="w-full h-full object-cover"
										/>
									)}
									{fileObj.uploading && (
										<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] z-10">
											<CircularProgress progress={fileObj.progress} />
										</div>
									)}
									<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
									<div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
										{fileType === "image" && (
											<button
												className="w-8 h-8 flex items-center justify-center bg-white text-gray-700 rounded-full shadow-md hover:bg-gray-50 transition-colors"
												onClick={() => onCropStart(index)}
												title="Crop"
											>
												<i className="fas fa-crop-alt text-sm"></i>
											</button>
										)}
										<button
											className="w-8 h-8 flex items-center justify-center bg-white text-red-500 rounded-full shadow-md hover:bg-gray-50 transition-colors"
											onClick={() => onRemove(index)}
											title="Remove"
										>
											<i className="fas fa-trash text-sm"></i>
										</button>
									</div>
								</div>
							))}
							<button
								className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700/30 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
								onClick={handleChooseFile}
							>
								<div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
									<i className="fas fa-plus text-gray-500 dark:text-slate-400"></i>
								</div>
								<span className="text-sm font-medium text-gray-600 dark:text-slate-300">Add Photos/Videos</span>
							</button>
						</div>
					) : (
						<div
							className={`flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-xl transition-all duration-200 ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/30 hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}
							onDragEnter={handleDragEnter}
							onDragLeave={handleDragLeave}
							onDragOver={(e) => e.preventDefault()}
							onDrop={handleDropZone}
						>
							<div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform duration-200 ${isDragging ? 'scale-110 bg-blue-100 dark:bg-blue-800' : 'bg-gray-200 dark:bg-slate-600'}`}>
								<i className={`fas ${fileType === "image" ? "fa-images" : "fa-video"} text-3xl ${isDragging ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-slate-400'}`}></i>
							</div>
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
								{fileType === "image" ? "Add Photos" : "Add Video"}
							</h3>
							<p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
								or drag and drop
							</p>
							<button
								className="px-4 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 rounded-lg text-sm font-medium text-gray-900 dark:text-white transition-colors"
								onClick={handleChooseFile}
							>
								Choose Files
							</button>
							<input
								type="file"
								accept={fileType === "image" ? "image/*" : "video/*"}
								ref={fileInputRef}
								onChange={handleFileChange}
								className="hidden"
								multiple={fileType === "image"}
							/>
						</div>
					)}
				</div>

				<div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
					<button
						className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
						onClick={onClose}
					>
						Cancel
					</button>
					<button
						className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={onClose}
						disabled={selectedFiles.length === 0}
					>
						Done
					</button>
				</div>
			</div>
			<style jsx>{`
				@keyframes fade-in-down {
					0% { opacity: 0; transform: translateY(-20px);}
					100% { opacity: 1; transform: translateY(0);}
				}
				.animate-fade-in-down {
					animation: fade-in-down 0.25s cubic-bezier(0.4,0,0.2,1);
				}
			`}</style>
		</div>
	);
}

function GiphyModal({ isOpen, onClose, onGifSelected }) {
	const [search, setSearch] = useState("");
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		setResults([]);
		setSearch("");
	}, [isOpen]);

	const handleSearch = async (e) => {
		e.preventDefault();
		setLoading(true);
		const apiKey = "7r6adPGUcQgoiqagBiKg2AwXmPFvrBPl"; // <-- Use your provided key
		const q = encodeURIComponent(search);
		const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${q}&limit=16&rating=pg`);
		const data = await res.json();
		setResults(data.data || []);
		setLoading(false);
	};

	// Add trending GIFs on open
	useEffect(() => {
		if (!isOpen) return;
		const fetchTrending = async () => {
			setLoading(true);
			const apiKey = "7r6adPGUcQgoiqagBiKg2AwXmPFvrBPl"; // <-- Use your provided key
			const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=16&rating=pg`);
			const data = await res.json();
			setResults(data.data || []);
			setLoading(false);
		};
		fetchTrending();
	}, [isOpen]);

	if (!isOpen) return null;
	return (
		<div
			className="fixed left-0 right-0 bottom-0 z-50 flex items-center justify-center"
			style={{
				top: "4rem", // Adjust this value to match your navbar height
				background: "rgba(0,0,0,0.5)",
				height: "calc(100vh - 4rem)"
			}}
		>
			<div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in-down p-4 sm:p-6">
				<button className="absolute top-4 right-4 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 text-2xl z-10" onClick={onClose} aria-label="Close"><i className="fas fa-times"></i></button>
				<h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-slate-100">Add a GIF</h2>
				<form onSubmit={handleSearch} className="flex mb-4 gap-2">
					<input
						type="text"
						value={search}
						onChange={e => setSearch(e.target.value)}
						placeholder="Search GIFs"
						className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
					/>
					<button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Search</button>
				</form>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
					{loading ? <div className="col-span-4 text-center text-gray-600 dark:text-slate-300">Loading...</div> :
						results.map(gif => (
							<img
								key={gif.id}
								src={gif.images.fixed_width.url}
								alt={gif.title}
								className="rounded-lg cursor-pointer hover:opacity-80"
								onClick={() => {
									onGifSelected(gif.images.original.url); // Only call the callback
									onClose();
								}}
							/>
						))}
				</div>
				<div className="flex items-center justify-center mt-6">
					<a href="https://giphy.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 opacity-80 hover:opacity-100">
						<img src="https://giphy.com/static/img/giphy_logo_square_social.png" alt="Powered by GIPHY" className="w-8 h-8" />
						<span className="text-xs text-gray-500 dark:text-slate-400 font-semibold">Powered by GIPHY</span>
					</a>
				</div>
			</div>
		</div>
	);
}

export default function CreatePostCard({ groupId = null, postType = 'post', placeholder }) {
	const { data: session } = useSession();
	const [selectedFiles, setSelectedFiles] = useState([]); // Array of { file, preview }
	const [showFileModal, setShowFileModal] = useState(false);
	const [fileTypeToSelect, setFileTypeToSelect] = useState("image");
	const [layout, setLayout] = useState('classic');
	const [defaultVisibility, setDefaultVisibility] = useState('PUBLIC');

	// Cropping state
	const [cropImageIndex, setCropImageIndex] = useState(null);
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

	const [postText, setPostText] = useState("");
	const [isUploading, setIsUploading] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [showGiphyModal, setShowGiphyModal] = useState(false);
	const [showPreview, setShowPreview] = useState(false);
	const [showPollCreator, setShowPollCreator] = useState(false);
	const [pollOptions, setPollOptions] = useState(["", ""]);
	const [pollDuration, setPollDuration] = useState(1); // Default 1 day

	// Add missing refs
	const textInputRef = useRef(null);
	const inputContainerRef = useRef(null);

	// Tag friends state
	const [taggedFriends, setTaggedFriends] = useState([]);
	const [friends, setFriends] = useState([]);
	const [showTagDropdown, setShowTagDropdown] = useState(false);
	const [tagSearch, setTagSearch] = useState("");
	const tagSearchRef = useRef(null);
	const emojiButtonRef = useRef(null);

	// Visibility state - use default from settings
	const [visibility, setVisibility] = useState(defaultVisibility);
	const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);
	const [allowedViewers, setAllowedViewers] = useState([]);
	const [showFriendsSelector, setShowFriendsSelector] = useState(false);
	const visibilityRef = useRef(null);

	const [draggedIndex, setDraggedIndex] = useState(null);
	const [dragOverIndex, setDragOverIndex] = useState(null);

	// Load default visibility from settings on mount
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const savedSettings = localStorage.getItem('userSettings');
			if (savedSettings) {
				const settings = JSON.parse(savedSettings);
				if (settings.defaultPostVisibility) {
					setDefaultVisibility(settings.defaultPostVisibility);
					setVisibility(settings.defaultPostVisibility);
				}
			}
		}
	}, []);

	// Auto-scroll for carousel preview
	const previewScrollRef = useRef(null);
	const [isPreviewPaused, setIsPreviewPaused] = useState(false);

	useEffect(() => {
		if (layout === 'carousel' && !isPreviewPaused && selectedFiles.length > 1) {
			const interval = setInterval(() => {
				if (previewScrollRef.current) {
					const { scrollLeft, scrollWidth, clientWidth } = previewScrollRef.current;
					if (scrollLeft + clientWidth >= scrollWidth - 10) {
						previewScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
					} else {
						const firstChild = previewScrollRef.current.firstElementChild;
						if (firstChild) {
							const gap = 8; // gap-2
							previewScrollRef.current.scrollBy({ left: firstChild.clientWidth + gap, behavior: 'smooth' });
						}
					}
				}
			}, 3000);
			return () => clearInterval(interval);
		}
	}, [layout, isPreviewPaused, selectedFiles.length]);

	const handleDragStart = (e, index) => {
		setDraggedIndex(index);
		e.dataTransfer.effectAllowed = "move";
		e.target.style.opacity = '0.5';
	};

	const handleDragEnd = (e) => {
		e.target.style.opacity = '1';
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	const handleDragOver = (e, index) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		if (draggedIndex !== null && draggedIndex !== index) {
			setDragOverIndex(index);
		}
	};

	const handleDragLeaveItem = (e) => {
		if (e.currentTarget.contains(e.relatedTarget)) return;
		setDragOverIndex(null);
	};

	const handleDrop = (e, index) => {
		e.preventDefault();
		e.target.style.opacity = '1';
		if (draggedIndex !== null && draggedIndex !== index) {
			handleReorderFiles(draggedIndex, index);
		}
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	// Auto-resize textarea
	useEffect(() => {
		if (isEditing && textInputRef.current) {
			textInputRef.current.style.height = 'auto';
			textInputRef.current.style.height = `${textInputRef.current.scrollHeight}px`;
		}
	}, [postText, isEditing]);

	// Debug: log whenever selectedFile changes
	useEffect(() => {
		console.log("DEBUG: selectedFiles updated:", selectedFiles);
	}, [selectedFiles]);

	const openFileModal = (type) => {
		setFileTypeToSelect(type);
		setShowFileModal(true);
	};

	const handleFilesSelected = (files) => {
		const newFiles = files.map(file => {
			const isRemote = !!file.url; // Check if it's a pre-existing URL (like GIF)
			return {
				id: Math.random().toString(36).substr(2, 9),
				file,
				preview: file.url || URL.createObjectURL(file),
				type: file.type || 'image/jpeg', // Fallback
				uploading: !isRemote,
				progress: isRemote ? 100 : 0,
				url: isRemote ? file.url : null,
				error: false
			}
		});

		if (fileTypeToSelect === 'video') {
			// Only allow one video
			setSelectedFiles([newFiles[0]]);
			if (newFiles[0].uploading) startUpload(newFiles[0]);
		} else {
			setSelectedFiles(prev => [...prev, ...newFiles]);
			newFiles.forEach(f => {
				if (f.uploading) startUpload(f);
			});
		}
	};

	const startUpload = (fileObj) => {
		uploadFile(fileObj.file, (progress) => {
			setSelectedFiles(prev => prev.map(item => item.id === fileObj.id ? { ...item, progress } : item));
		}).then(data => {
			setSelectedFiles(prev => prev.map(item => item.id === fileObj.id ? { ...item, uploading: false, url: data.url } : item));
		}).catch(err => {
			setSelectedFiles(prev => prev.map(item => item.id === fileObj.id ? { ...item, uploading: false, error: true } : item));
		});
	};

	const handleRemoveFile = (index) => {
		setSelectedFiles(prev => prev.filter((_, i) => i !== index));
	};

	const handleReorderFiles = (fromIndex, toIndex) => {
		setSelectedFiles(prev => {
			const newFiles = [...prev];
			const [movedItem] = newFiles.splice(fromIndex, 1);
			newFiles.splice(toIndex, 0, movedItem);
			return newFiles;
		});
	};

	const handleCropComplete = (croppedArea, croppedAreaPixels) => {
		setCroppedAreaPixels(croppedAreaPixels);
	};

	const saveCroppedImage = async () => {
		if (cropImageIndex === null || !croppedAreaPixels) return;

		try {
			const imageSrc = selectedFiles[cropImageIndex].preview;
			const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
			const croppedFile = new File([croppedBlob], selectedFiles[cropImageIndex].file.name, { type: 'image/jpeg' });
			const croppedPreview = URL.createObjectURL(croppedBlob);

			setSelectedFiles(prev => prev.map((item, i) =>
				i === cropImageIndex ? { ...item, file: croppedFile, preview: croppedPreview } : item
			));

			setCropImageIndex(null);
			setCrop({ x: 0, y: 0 });
			setZoom(1);
		} catch (e) {
			console.error("Error cropping image:", e);
		}
	};

	const togglePollCreator = () => {
		setShowPollCreator(!showPollCreator);
		if (!showPollCreator) {
			setPollOptions(["", ""]);
		}
	};

	const handlePollOptionChange = (index, value) => {
		const newOptions = [...pollOptions];
		newOptions[index] = value;
		setPollOptions(newOptions);
	};

	const addPollOption = () => {
		if (pollOptions.length < 4) setPollOptions([...pollOptions, ""]);
	};

	const removePollOption = (index) => {
		if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, i) => i !== index));
	};

	// Add a default onCreatePost function to be used if parent's onCreatePost is not provided or if you want to test without it
	const defaultOnCreatePost = async (payload) => {
		console.log("DEBUG: defaultOnCreatePost called with payload:", payload);
		const res = await fetch("/api/posts", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		const data = await res.json();
		console.log("DEBUG: defaultOnCreatePost received response:", data);
		return data;
	};

	const handlePost = async () => {
		console.log("DEBUG: handlePost - postText:", postText, "selectedFiles:", selectedFiles);
		setIsUploading(true);

		// Check if any files are still uploading
		if (selectedFiles.some(f => f.uploading)) {
			alert("Please wait for all files to finish uploading.");
			setIsUploading(false);
			return;
		}

		if (!postText.trim() && selectedFiles.length === 0 && !showPollCreator) {
			setIsUploading(false);
			return;
		}
		try {
			// Collect URLs from the already uploaded files
			let uploadedUrls = selectedFiles.map(f => f.url).filter(Boolean);
			let fileType = null;
			const start = Date.now(); // Start timing

			// Extract the IDs of tagged friends
			const tagIds = taggedFriends.map(f => f.id);
			// Filter valid poll options
			const validPollOptions = showPollCreator ? pollOptions.filter(o => o.trim()) : [];
			const expiresAt = showPollCreator ? new Date(Date.now() + pollDuration * 24 * 60 * 60 * 1000).toISOString() : null;

			// Handle GIF (special case, usually single file from Giphy)
			if (selectedFiles.length === 1 && selectedFiles[0].file.type === "image/gif" && selectedFiles[0].file.url) {
				fileType = "gif";
				const payload = {
					imageUrl: uploadedUrls[0], // Backward compatibility
					imageUrls: uploadedUrls,
					fileType,
					content: postText,
					taggedFriends: tagIds, // Add tagged friends to payload
					pollOptions: validPollOptions,
					expiresAt,
					groupId,
					type: postType,
					visibility,
					allowedViewers: visibility === 'SPECIFIC_FRIENDS' ? allowedViewers.map(f => f.id) : [],
				};
				console.log("DEBUG: handlePost GIF payload:", payload);
				await defaultOnCreatePost(payload);
			} else if (selectedFiles.length > 0) {
				fileType = selectedFiles[0].file.type.startsWith("video") ? "video" : "image";

				// If video, we typically only allow one, but let's handle it generally
				const videoUrl = fileType === "video" ? uploadedUrls[0] : null;
				const imageUrl = fileType === "image" ? uploadedUrls[0] : null; // Primary image

				const payload = {
					imageUrl,
					imageUrls: fileType === "image" ? uploadedUrls : [],
					videoUrl,
					fileType,
					content: postText,
					taggedFriends: tagIds, // Add tagged friends to payload
					pollOptions: validPollOptions,
					expiresAt,
					layout,
					groupId,
					type: postType === 'post' ? fileType : postType, // Use fileType (video/image) if default post, else preserve specific type like 'discussion'
					visibility,
					allowedViewers: visibility === 'SPECIFIC_FRIENDS' ? allowedViewers.map(f => f.id) : [],
				};
				console.log("DEBUG: handlePost image/video payload:", payload);
				await defaultOnCreatePost(payload);
			} else {
				const payload = {
					content: postText,
					taggedFriends: tagIds, // Add tagged friends to payload
					pollOptions: validPollOptions,
					expiresAt,
					groupId,
					type: postType,
					visibility,
					allowedViewers: visibility === 'SPECIFIC_FRIENDS' ? allowedViewers.map(f => f.id) : [],
				};
				console.log("DEBUG: handlePost text-only payload:", payload);
				await defaultOnCreatePost(payload);
			}

			const end = Date.now();
			console.log("DEBUG: Total post time (ms):", end - start);

			// Trigger confetti celebration
			confetti({
				particleCount: 100,
				spread: 70,
				origin: { y: 0.6 }
			});

			setSelectedFiles([]);
			setPostText("");
			setLayout('classic');
			setTaggedFriends([]); // Clear tagged friends after posting
			setShowPollCreator(false);
			setPollOptions(["", ""]);
			setPollDuration(1);
			setVisibility(defaultVisibility); // Reset visibility to default after posting
			setAllowedViewers([]); // Clear allowed viewers after posting
		} catch (error) {
			console.error("Post error:", error);
			alert(error.message || "Failed to create post.");
		} finally {
			setIsUploading(false);
		}
	};

	// Fetch friends when tag dropdown is opened
	useEffect(() => {
		if (!session?.user?.id || !showTagDropdown) return;

		const fetchFriends = async () => {
			try {
				// Fetch connected users from the connections API
				const res = await fetch('/api/connections');
				if (!res.ok) throw new Error('Failed to fetch connections');

				const data = await res.json();
				// Use the accepted connections from the API response
				if (data.connections && Array.isArray(data.connections.accepted)) {
					setFriends(data.connections.accepted);
				} else {
					setFriends([]);
				}
			} catch (error) {
				console.error('Error fetching friends:', error);
				setFriends([]);
			}
		};

		fetchFriends();
	}, [session?.user?.id, showTagDropdown]);

	// Fetch friends when visibility friends selector is opened
	useEffect(() => {
		if (!session?.user?.id || !showFriendsSelector) return;

		const fetchFriendsForVisibility = async () => {
			try {
				const res = await fetch('/api/connections');
				if (!res.ok) throw new Error('Failed to fetch connections');

				const data = await res.json();
				if (data.connections && Array.isArray(data.connections.accepted)) {
					setFriends(data.connections.accepted);
				} else {
					setFriends([]);
				}
			} catch (error) {
				console.error('Error fetching friends:', error);
				setFriends([]);
			}
		};

		fetchFriendsForVisibility();
	}, [session?.user?.id, showFriendsSelector]);

	// Click outside handler for visibility dropdown
	useEffect(() => {
		if (!showVisibilityDropdown && !showFriendsSelector) return;

		const handleClickOutside = (event) => {
			if (visibilityRef.current && !visibilityRef.current.contains(event.target)) {
				setShowVisibilityDropdown(false);
				setShowFriendsSelector(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showVisibilityDropdown, showFriendsSelector]);

	// Click outside handler for tag dropdown
	useEffect(() => {
		if (!showTagDropdown) return;

		const handleClickOutside = (event) => {
			if (tagSearchRef.current && !tagSearchRef.current.contains(event.target)) {
				setShowTagDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showTagDropdown]);

	const handleAddTag = (friend) => {
		if (!taggedFriends.some(f => f.id === friend.id)) {
			setTaggedFriends([...taggedFriends, friend]);
		}
		setShowTagDropdown(false);
		setTagSearch("");
	};

	const handleRemoveTag = (friendId) => {
		setTaggedFriends(taggedFriends.filter(f => f.id !== friendId));
	};

	const handleToggleTagDropdown = (e) => {
		e.preventDefault(); // Prevent form submission
		setShowTagDropdown(!showTagDropdown);
		if (!showTagDropdown) {
			// Focus search input when opening dropdown
			setTimeout(() => {
				if (tagSearchRef.current) tagSearchRef.current.focus();
			}, 10);
		}
	};

	const handleAddEmoji = (emoji) => {
		setPostText(prev => prev + emoji);
		if (!isEditing) {
			setIsEditing(true);
		}
		// Refocus the input after adding emoji
		if (textInputRef.current) {
			setTimeout(() => textInputRef.current.focus(), 0);
		}
	};

	// Visibility options configuration
	const visibilityOptions = [
		{ value: 'PUBLIC', label: 'Public', icon: '🌍', description: 'Anyone can see this post' },
		{ value: 'FRIENDS', label: 'Friends', icon: '👥', description: 'Only your connections can see' },
		{ value: 'SPECIFIC_FRIENDS', label: 'Specific Friends', icon: '👤', description: 'Only selected friends can see' },
		{ value: 'PRIVATE', label: 'Only Me', icon: '🔒', description: 'Only you can see this post' },
	];

	const getVisibilityLabel = () => {
		const option = visibilityOptions.find(o => o.value === visibility);
		return option ? `${option.icon} ${option.label}` : '🌍 Public';
	};

	const handleVisibilitySelect = (value) => {
		setVisibility(value);
		if (value === 'SPECIFIC_FRIENDS') {
			setShowVisibilityDropdown(false);
			setShowFriendsSelector(true);
		} else {
			setShowVisibilityDropdown(false);
			setShowFriendsSelector(false);
			setAllowedViewers([]);
		}
	};

	const handleAddAllowedViewer = (friend) => {
		if (!allowedViewers.some(f => f.id === friend.id)) {
			setAllowedViewers([...allowedViewers, friend]);
		}
	};

	const handleRemoveAllowedViewer = (friendId) => {
		setAllowedViewers(allowedViewers.filter(f => f.id !== friendId));
	};

	// Keep focus in the textarea when clicking inside our container
	const handleInputBlur = (e) => {
		// Check if the related target (element receiving focus) is inside our container
		if (inputContainerRef.current && inputContainerRef.current.contains(e.relatedTarget)) {
			// If the blur is happening because we're clicking inside our container,
			// prevent the blur behavior by refocusing the input
			if (textInputRef.current) {
				setTimeout(() => textInputRef.current.focus(), 0);
			}
			return;
		}

		// Only hide editor if there's no text and not clicking within our container
		if (!postText) {
			setIsEditing(false);
		}
	};

	// Helper to generate mock post for preview
	const getMockPost = () => {
		const isVideo = selectedFiles[0]?.file?.type?.startsWith('video');
		let imageUrl = null;
		let imageUrls = [];
		let videoUrl = null;
		const validPollOptions = showPollCreator ? pollOptions.filter(o => o.trim()) : [];
		const expiresAt = showPollCreator ? new Date(Date.now() + pollDuration * 24 * 60 * 60 * 1000).toISOString() : null;

		if (selectedFiles.length > 0) {
			if (selectedFiles[0].file.type === 'image/gif' && selectedFiles[0].file.url) {
				imageUrl = selectedFiles[0].file.url;
			} else if (selectedFiles[0].file.type.startsWith('image')) {
				imageUrls = selectedFiles.map(f => f.preview);
				imageUrl = imageUrls[0];
			} else if (selectedFiles[0].file.type.startsWith('video')) {
				videoUrl = selectedFiles[0].preview;
			}
		}

		return {
			id: 'preview-post',
			author: {
				id: session?.user?.id,
				name: session?.user?.name || 'You',
				image: session?.user?.image,
				profileUrl: '#'
			},
			content: postText,
			imageUrl,
			imageUrls,
			videoUrl,
			createdAt: new Date().toISOString(),
			likesCount: 0,
			commentsCount: 0,
			likedByCurrentUser: false,
			comments: [],
			taggedFriends: taggedFriends,
			pollOptions: validPollOptions,
			expiresAt
		};
	};

	return (
		<div className="create-post-card bg-white dark:bg-slate-800 shadow-md border border-gray-200 dark:border-slate-700 mb-4 sm:mb-6 w-full max-w-3xl mx-auto p-0">
			<div className="flex items-start px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
				<img
					src={
						session?.user?.profile?.profilePictureUrl ||
						session?.user?.image ||
						`https://placehold.co/40x40/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'
						}`
					}
					alt="Your avatar"
					className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-gray-200 mt-1"
				/>
				<div className="flex-1 ml-2 sm:ml-3">
					{/* Tag friends UI */}
					<div className="flex flex-wrap gap-2 mb-2">
						{taggedFriends.map(friend => (
							<span key={friend.id} className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full flex items-center text-sm">
								{friend.name}
								<button
									type="button"
									className="ml-1 text-blue-500 hover:text-red-500"
									onClick={() => handleRemoveTag(friend.id)}
									aria-label="Remove tag"
								>
									&times;
								</button>
							</span>
						))}
						<button
							type="button"
							className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-2 py-1 rounded-full flex items-center text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-700 dark:hover:text-blue-300"
							onClick={handleToggleTagDropdown}
						>
							<i className="fas fa-user-tag mr-1"></i>
							Tag friends
						</button>
					</div>

					{/* Tag friends dropdown */}
					{showTagDropdown && (
						<div className="relative z-50" ref={tagSearchRef}>
							<input
								type="text"
								placeholder="Search friends..."
								value={tagSearch}
								onChange={e => setTagSearch(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
								autoFocus
							/>
							<div className="absolute bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-lg max-h-48 overflow-y-auto w-full">
								{friends.length === 0 ? (
									<div className="px-3 py-4 text-center text-gray-500 dark:text-slate-400">
										{friends.length === 0 ? 'Loading friends...' : 'No matching friends found.'}
									</div>
								) : (
									<>
										{friends
											.filter(f =>
												(f.name || "").toLowerCase().includes(tagSearch.toLowerCase()) &&
												!taggedFriends.some(tf => tf.id === f.id)
											)
											.map(friend => (
												<div
													key={friend.id}
													className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer flex items-center text-gray-900 dark:text-slate-100"
													onClick={() => handleAddTag(friend)}
												>
													<img
														src={
															friend.imageUrl ||
															`https://placehold.co/32x32/1877F2/ffffff?text=${friend.name ? friend.name[0].toUpperCase() : 'U'}`
														}
														alt={friend.name}
														className="w-6 h-6 rounded-full object-cover mr-2"
													/>
													<span>{friend.name}</span>
												</div>
											))}

										{friends.filter(f =>
											(f.name || "").toLowerCase().includes(tagSearch.toLowerCase()) &&
											!taggedFriends.some(tf => tf.id === f.id)
										).length === 0 && (
												<div className="px-3 py-2 text-gray-400 dark:text-slate-500">
													{tagSearch ? 'No friends found matching your search' : 'No friends available to tag'}
												</div>
											)}
									</>
								)}
							</div>
						</div>
					)}

					{!isEditing ? (
						<button
							className="flex-1 text-left bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 focus:bg-gray-200 dark:focus:bg-slate-600 rounded-full px-4 py-2 sm:px-5 sm:py-3 text-gray-700 dark:text-slate-200 text-sm sm:text-base font-normal transition outline-none border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 placeholder-gray-500 whitespace-pre-line break-words w-full min-h-[40px] sm:min-h-[44px]"
							onClick={() => setIsEditing(true)}
							type="button"
						>
							{postText ? postText : (placeholder || `What's on your mind, ${session?.user?.name?.split(' ')[0] || ''}?`)}
						</button>
					) : (
						<div className="w-full relative" ref={inputContainerRef}>
							<textarea
								ref={textInputRef}
								autoFocus
								placeholder={placeholder || `What's on your mind, ${session?.user?.name?.split(' ')[0] || ''}?`}
								rows={3}
								value={postText}
								onChange={e => setPostText(e.target.value)}
								onBlur={handleInputBlur}
								maxLength={MAX_POST_LENGTH}
								className="flex-1 w-full px-4 py-2 sm:px-5 sm:py-3 bg-gray-100 dark:bg-slate-700 rounded-2xl border border-gray-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-slate-400 text-sm sm:text-base text-gray-700 dark:text-slate-100 whitespace-pre-line break-words transition min-h-[40px] sm:min-h-[44px] resize-none"
							/>
							<div className="absolute right-3 bottom-2 flex items-center space-x-2" tabIndex={-1}>
								<span className={`text-xs ${postText.length >= MAX_POST_LENGTH ? 'text-red-600 font-bold' : (postText.length > MAX_POST_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-400 dark:text-slate-500')}`}>
									{postText.length}/{MAX_POST_LENGTH}
								</span>
								{/* Emoji selector moved to action bar for better mobile usability */}
							</div>
							{postText.length >= MAX_POST_LENGTH && (
								<div className="absolute top-full right-0 mt-1 text-red-600 text-xs font-medium bg-red-50 px-2 py-1 rounded shadow-sm z-10 border border-red-100">
									Character limit reached!
								</div>
							)}
						</div>
					)}
				</div>
			</div>
			{/* Media preview below input */}
			{selectedFiles.length > 0 && (
				<div className="px-4 pb-2">
					{selectedFiles.length > 1 && fileTypeToSelect === 'image' && (
						<div className="flex justify-end mb-2">
							<div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
								<button
									onClick={() => setLayout('classic')}
									className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${layout === 'classic' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}
								>
									Classic
								</button>
								<button
									onClick={() => setLayout('grid')}
									className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${layout === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}
								>
									Grid
								</button>
								<button
									onClick={() => setLayout('masonry')}
									className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${layout === 'masonry' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}
								>
									Masonry
								</button>
								<button
									onClick={() => setLayout('carousel')}
									className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${layout === 'carousel' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}
								>
									Carousel
								</button>
							</div>
						</div>
					)}
					<div ref={previewScrollRef}
						onMouseEnter={() => setIsPreviewPaused(true)}
						onMouseLeave={() => setIsPreviewPaused(false)}
						onTouchStart={() => setIsPreviewPaused(true)}
						onTouchEnd={() => setIsPreviewPaused(false)}
						className={
							layout === 'carousel' ? 'flex overflow-x-auto gap-2 pb-2 snap-x snap-mandatory scrollbar-hide touch-pan-y' :
								layout === 'masonry' ? 'columns-2 md:columns-3 gap-1 space-y-1 px-1' :
									`grid gap-0.5 rounded-xl overflow-hidden ${layout === 'grid'
										? 'grid-cols-2'
										: selectedFiles.length === 1 ? 'grid-cols-1' :
											selectedFiles.length === 2 ? 'grid-cols-2' :
												selectedFiles.length === 3 ? 'grid-cols-2' :
													'grid-cols-2'}`
						}>
						{selectedFiles.map((fileObj, index) => {
							const isThreeImages = selectedFiles.length === 3 && layout === 'classic';
							const isFirstOfThree = isThreeImages && index === 0;
							const isFourthWithMore = selectedFiles.length > 4 && index === 3 && layout === 'classic';

							if (layout === 'classic' && selectedFiles.length > 4 && index > 3) return null;

							return (
								<div
									key={fileObj.id || index}
									className={`relative group ${isFirstOfThree ? 'col-span-2' : ''} ${layout === 'masonry' ? 'break-inside-avoid mb-1' : ''} ${layout === 'carousel' ? 'min-w-[80%] snap-center shrink-0' : ''} ${selectedFiles.length > 1 ? 'cursor-move' : ''} ${dragOverIndex === index ? 'ring-4 ring-blue-500 ring-inset z-10' : ''}`}
									draggable={selectedFiles.length > 1}
									onDragStart={(e) => handleDragStart(e, index)}
									onDragEnd={handleDragEnd}
									onDragOver={(e) => handleDragOver(e, index)}
									onDragLeave={handleDragLeaveItem}
									onDrop={(e) => handleDrop(e, index)}
								>
									{fileObj.file.type.startsWith("video") ? (
										<video src={fileObj.preview} controls className={`w-full object-cover bg-black ${layout === 'masonry' ? 'h-auto rounded-lg' : layout === 'carousel' ? 'h-64 rounded-xl' : `rounded-none ${layout === 'grid' ? 'aspect-square' : (isFirstOfThree ? 'h-72' : 'h-48')}`}`} />
									) : (
										<img src={fileObj.preview} alt="Preview" className={`${layout === 'masonry' ? 'w-full h-auto rounded-lg' : layout === 'carousel' ? 'w-full h-64 object-cover rounded-xl' : `w-full object-cover rounded-none ${layout === 'grid' ? 'aspect-square' : (isFirstOfThree ? 'h-72' : 'h-48')}`}`} />
									)}

									{fileObj.uploading && (
										<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10">
											<CircularProgress progress={fileObj.progress} />
										</div>
									)}

									{isFourthWithMore && (
										<div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px] z-20 pointer-events-none">
											<span className="text-white text-3xl font-bold">+{selectedFiles.length - 4}</span>
										</div>
									)}

									<button
										className="absolute top-2 right-2 bg-gray-900/60 hover:bg-gray-900/80 text-white rounded-full p-1.5 h-8 w-8 shadow-sm transition opacity-0 group-hover:opacity-100 z-30 flex items-center justify-center"
										onClick={() => handleRemoveFile(index)}
										title="Remove"
									>
										<i className="fas fa-times text-sm"></i>
									</button>

									{fileObj.file.type.startsWith("image") && !fileObj.file.type.includes("gif") && !isFourthWithMore && (
										<button
											className="absolute top-2 right-12 bg-gray-900/60 hover:bg-gray-900/80 text-white rounded-full p-1.5 h-8 w-8 shadow-sm transition opacity-0 group-hover:opacity-100 z-30 flex items-center justify-center"
											onClick={() => setCropImageIndex(index)}
											title="Crop"
										>
											<i className="fas fa-crop-alt text-sm"></i>
										</button>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)
			}
			{/* Poll Creator UI */}
			{
				showPollCreator && (
					<div className="px-4 pb-2 space-y-2">
						{pollOptions.map((option, index) => (
							<div key={index} className="flex items-center gap-2">
								<input
									type="text"
									value={option}
									onChange={(e) => handlePollOptionChange(index, e.target.value)}
									placeholder={`Option ${index + 1}`}
									className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
								/>
								{pollOptions.length > 2 && (
									<button
										onClick={() => removePollOption(index)}
										className="text-red-500 hover:text-red-700 p-2"
									>
										<i className="fas fa-times"></i>
									</button>
								)}
							</div>
						))}
						{pollOptions.length < 4 && (
							<button onClick={addPollOption} className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
								<i className="fas fa-plus"></i> Add Option
							</button>
						)}
						<div className="mt-3 flex items-center gap-2">
							<label className="text-sm text-gray-600 dark:text-slate-300 font-medium">Duration:</label>
							<select
								value={pollDuration}
								onChange={(e) => setPollDuration(Number(e.target.value))}
								className="text-sm border border-gray-300 dark:border-slate-600 rounded-md p-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value={1}>1 Day</option>
								<option value={3}>3 Days</option>
								<option value={7}>1 Week</option>
								<option value={30}>1 Month</option>
							</select>
						</div>
					</div>
				)
			}
			<div className="border-t border-gray-200 dark:border-slate-700 mt-2" />
			<div className="flex flex-nowrap items-center justify-between px-2 sm:px-4 py-2 gap-1 sm:gap-2">
				<div className="flex items-center gap-0.5 sm:gap-2">
					<Tooltip text="Add Photo">
						<button
							type="button"
							className="p-1.5 sm:p-2 rounded-full hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
							onClick={() => openFileModal("image")}
							aria-label="Add Photo"
						>
							<i className="fas fa-image text-lg sm:text-xl"></i>
						</button>
					</Tooltip>
					<Tooltip text="Add Video">
						<button
							type="button"
							className="p-1.5 sm:p-2 rounded-full hover:bg-green-50 dark:hover:bg-slate-700 text-green-600 dark:text-green-400 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/50"
							onClick={() => openFileModal("video")}
							aria-label="Add Video"
						>
							<i className="fas fa-video text-lg sm:text-xl"></i>
						</button>
					</Tooltip>
					<Tooltip text="Add GIF">
						<button
							type="button"
							className="p-1.5 sm:p-2 rounded-full hover:bg-purple-50 dark:hover:bg-slate-700 text-purple-600 dark:text-purple-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
							onClick={() => setShowGiphyModal(true)}
							aria-label="Add GIF"
						>
							<i className="fas fa-gift text-lg sm:text-xl"></i>
						</button>
					</Tooltip>
					<Tooltip text="Create Poll">
						<button
							type="button"
							className={`p-1.5 sm:p-2 rounded-full hover:bg-orange-50 dark:hover:bg-slate-700 text-orange-600 dark:text-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${showPollCreator ? 'bg-orange-100 dark:bg-slate-600' : ''}`}
							onClick={togglePollCreator}
							aria-label="Create Poll"
						>
							<i className="fas fa-poll text-lg sm:text-xl"></i>
						</button>
					</Tooltip>
					<Tooltip text="Add Emoji">
						<div
							ref={emojiButtonRef}
							className="relative p-1.5 sm:p-2 rounded-full hover:bg-yellow-50 dark:hover:bg-slate-700 text-yellow-500 dark:text-yellow-400 transition-colors"
						>
							{/* 
                The EmojiSelector is now positioned relative to this div, making it more reliable on mobile.
                It will render its own button icon.
              */}
							<EmojiSelector onEmojiSelect={handleAddEmoji} />
						</div>
					</Tooltip>
				</div>
				<div className="flex items-center gap-1 sm:gap-2 ml-auto sm:ml-0 flex-shrink-0">
					{/* Visibility Selector */}
					<div className="relative" ref={visibilityRef}>
						<Tooltip text="Post visibility">
							<button
								type="button"
								className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/50 flex items-center gap-1 text-xs sm:text-sm"
								onClick={() => {
									setShowVisibilityDropdown(!showVisibilityDropdown);
									setShowFriendsSelector(false);
								}}
								aria-label="Set post visibility"
							>
								<span>{getVisibilityLabel()}</span>
								<i className="fas fa-chevron-down text-[10px]"></i>
							</button>
						</Tooltip>

						{/* Visibility Dropdown */}
						{showVisibilityDropdown && (
							<div className="absolute bottom-full mb-2 right-0 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
								<div className="p-2 border-b border-gray-100 dark:border-slate-700">
									<p className="text-sm font-medium text-gray-700 dark:text-slate-300">Who can see this post?</p>
								</div>
								<div className="py-1">
									{visibilityOptions.map((option) => (
										<button
											key={option.value}
											type="button"
											className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 ${visibility === option.value ? 'bg-blue-50 dark:bg-blue-900/30' : ''
												}`}
											onClick={() => handleVisibilitySelect(option.value)}
										>
											<span className="text-xl">{option.icon}</span>
											<div>
												<p className={`text-sm font-medium ${visibility === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300'}`}>
													{option.label}
												</p>
												<p className="text-xs text-gray-500 dark:text-slate-400">{option.description}</p>
											</div>
											{visibility === option.value && (
												<i className="fas fa-check ml-auto text-blue-600 dark:text-blue-400"></i>
											)}
										</button>
									))}
								</div>
							</div>
						)}

						{/* Specific Friends Selector */}
						{showFriendsSelector && (
							<div className="absolute bottom-full mb-2 right-0 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
								<div className="p-3 border-b border-gray-100 dark:border-slate-700">
									<div className="flex items-center justify-between">
										<p className="text-sm font-medium text-gray-700 dark:text-slate-300">Select friends</p>
										<button
											type="button"
											className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
											onClick={() => setShowFriendsSelector(false)}
										>
											Done
										</button>
									</div>
									{allowedViewers.length > 0 && (
										<div className="flex flex-wrap gap-1 mt-2">
											{allowedViewers.map((friend) => (
												<span
													key={friend.id}
													className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full"
												>
													{friend.name}
													<button
														type="button"
														onClick={() => handleRemoveAllowedViewer(friend.id)}
														className="hover:text-blue-900 dark:hover:text-blue-100"
													>
														<i className="fas fa-times text-[10px]"></i>
													</button>
												</span>
											))}
										</div>
									)}
								</div>
								<div className="max-h-48 overflow-y-auto">
									{friends.length === 0 ? (
										<p className="p-3 text-sm text-gray-500 dark:text-slate-400 text-center">No connections found</p>
									) : (
										friends.map((friend) => {
											const isSelected = allowedViewers.some(f => f.id === friend.id);
											return (
												<button
													key={friend.id}
													type="button"
													className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
														}`}
													onClick={() => isSelected ? handleRemoveAllowedViewer(friend.id) : handleAddAllowedViewer(friend)}
												>
													<img
														src={friend.image || `https://placehold.co/32x32/3B82F6/FFFFFF?text=${friend.name?.[0]?.toUpperCase() || 'U'}`}
														alt={friend.name}
														className="w-8 h-8 rounded-full object-cover"
													/>
													<span className="text-sm text-gray-700 dark:text-slate-300 flex-1">{friend.name}</span>
													{isSelected && (
														<i className="fas fa-check text-blue-600 dark:text-blue-400"></i>
													)}
												</button>
											);
										})
									)}
								</div>
							</div>
						)}
					</div>
					<Tooltip text="Preview Post">
						<button
							type="button"
							className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={() => setShowPreview(true)}
							disabled={!postText && selectedFiles.length === 0 && (!showPollCreator || pollOptions.filter(o => o.trim()).length < 2)}
							aria-label="Preview Post"
						>
							<i className="fas fa-eye text-lg sm:text-xl"></i>
						</button>
					</Tooltip>
					<button
						className="bg-[#2374e1] hover:bg-[#1b63c9] text-white font-semibold rounded-lg py-1.5 px-3 sm:py-2 sm:px-4 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2374e1] text-sm sm:text-base whitespace-nowrap"
						onClick={handlePost}
						disabled={isUploading}
					>
						{isUploading ? (
							<span>
								<i className="fas fa-spinner fa-spin mr-2"></i>
								<span className="hidden sm:inline">Posting...</span>
							</span>
						) : (
							"Post"
						)}
					</button>
				</div>
			</div>
			{/* Modern Facebook-style modal for media selection/preview */}
			<ModernMediaModal
				isOpen={showFileModal}
				onClose={() => setShowFileModal(false)}
				onFilesSelected={handleFilesSelected}
				fileType={fileTypeToSelect}
				selectedFiles={selectedFiles}
				onRemove={handleRemoveFile}
				onCropStart={setCropImageIndex}
				onReorder={handleReorderFiles}
			/>

			{/* Crop Modal */}
			{
				cropImageIndex !== null && (
					<div className="fixed inset-0 z-[60] bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
						<div className="relative w-full max-w-2xl h-[60vh] bg-black rounded-lg overflow-hidden">
							<Cropper
								image={selectedFiles[cropImageIndex].preview}
								crop={crop}
								zoom={zoom}
								aspect={4 / 3}
								onCropChange={setCrop}
								onCropComplete={handleCropComplete}
								onZoomChange={setZoom}
							/>
						</div>
						<div className="flex gap-4 mt-4">
							<input
								type="range"
								value={zoom}
								min={1}
								max={3}
								step={0.1}
								aria-labelledby="Zoom"
								onChange={(e) => setZoom(e.target.value)}
								className="w-64"
							/>
						</div>
						<div className="flex gap-4 mt-4">
							<button onClick={() => setCropImageIndex(null)} className="px-4 py-2 bg-gray-600 text-white rounded-lg">Cancel</button>
							<button onClick={saveCroppedImage} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save Crop</button>
						</div>
					</div>
				)
			}

			{
				showGiphyModal && (
					<GiphyModal
						isOpen={showGiphyModal}
						onClose={() => setShowGiphyModal(false)}
						onGifSelected={(url) => {
							const gifFile = { type: "image/gif", name: "giphy.gif", url };
							console.log("DEBUG: onGifSelected called with:", gifFile);
							handleFilesSelected([gifFile]);
						}}
					/>
				)
			}
			{/* Preview Modal */}
			{
				showPreview && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
						<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-fade-in-down">
							<div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-2xl">
								<h2 className="text-xl font-bold text-gray-900 dark:text-white">Post Preview</h2>
								<button
									onClick={() => setShowPreview(false)}
									className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
								>
									<i className="fas fa-times text-xl"></i>
								</button>
							</div>
							<div className="p-4">
								<PostCard
									post={getMockPost()}
									sessionUserId={session?.user?.id}
									isPreview={true}
								/>
							</div>
							<div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-b-2xl">
								<button
									onClick={() => setShowPreview(false)}
									className="px-4 py-2 text-gray-700 dark:text-slate-200 font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition"
								>
									Keep Editing
								</button>
								<button
									onClick={() => {
										setShowPreview(false);
										handlePost();
									}}
									className="px-4 py-2 bg-[#2374e1] hover:bg-[#1b63c9] text-white font-semibold rounded-lg transition"
								>
									Post
								</button>
							</div>
						</div>
					</div>
				)
			}
		</div >
	);
}