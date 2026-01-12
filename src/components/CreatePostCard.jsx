"use client";

import React, { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import EmojiSelector from './EmojiSelector'; // Import the EmojiSelector component
import PostCard from './PostCard';
import Tooltip from './Tooltip';

const MAX_POST_LENGTH = 2000;

// Modern Facebook-style Media Modal
function ModernMediaModal({ isOpen, onClose, onFileSelected, fileType, previewUrl, file, onRemove }) {
	const fileInputRef = useRef();

	const handleChooseFile = () => {
		if (fileInputRef.current) fileInputRef.current.click();
	};

	const handleFileChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			onFileSelected(file);
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed left-0 right-0 bottom-0 z-50 flex items-center justify-center"
			style={{
				top: "4rem", // Adjust this value to match your navbar height (e.g., 64px = 4rem)
				background: "rgba(0,0,0,0.5)",
				height: "calc(100vh - 4rem)"
			}}
		>
			<div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in-down">
				<button
					className="absolute top-4 right-4 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 text-2xl z-10"
					onClick={onClose}
					aria-label="Close"
				>
					<i className="fas fa-times"></i>
				</button>
				<div className="flex flex-col items-center p-8">
					<h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-4">
						{fileType === "image" ? "Add Photo" : "Add Video"}
					</h2>
					<div className="w-full flex flex-col items-center">
						{previewUrl ? (
							<div className="relative w-full flex flex-col items-center">
								{fileType === "image" ? (
									<img
										src={previewUrl}
										alt="Preview"
										className="rounded-xl object-contain border border-gray-200 shadow-lg"
									/>
								) : (
									<video
										src={previewUrl}
										controls
										className="rounded-xl max-h-96 object-contain border border-gray-200 shadow-lg"
									/>
								)}
								<button
									className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-2 shadow hover:bg-opacity-100 transition"
									onClick={onRemove}
									title="Remove"
								>
									<i className="fas fa-trash text-red-500"></i>
								</button>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700/50">
								<input
									type="file"
									accept={fileType === "image" ? "image/*" : "video/*"}
									ref={fileInputRef}
									onChange={handleFileChange}
									className="hidden"
								/>
								<button
									className="flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 focus:outline-none"
									onClick={handleChooseFile}
								>
									<i className={`fas ${fileType === "image" ? "fa-image" : "fa-video"} text-4xl mb-2`}></i>
									<span className="font-semibold text-lg">
										Click to {fileType === "image" ? "add a photo" : "add a video"}
									</span>
									<span className="text-gray-500 dark:text-slate-400 text-sm mt-1">
										{fileType === "image"
											? "JPG, PNG, WEBP up to 10MB"
											: "MP4, WEBM, OGG up to 10MB"}
									</span>
								</button>
							</div>
						)}
					</div>
					<div className="flex justify-end w-full mt-6 space-x-3">
						<button
							className="px-5 py-2 rounded-lg bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold hover:bg-gray-300 dark:hover:bg-slate-500 transition"
							onClick={onClose}
						>
							Cancel
						</button>
						<button
							className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={onClose}
							disabled={!file}
						>
							Done
						</button>
					</div>
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
			<div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in-down p-6">
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
				<div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto">
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
						<span className="text-xs text-gray-500 font-semibold">Powered by GIPHY</span>
					</a>
				</div>
			</div>
		</div>
	);
}

export default function CreatePostCard() {
	const { data: session } = useSession();
	const [selectedFile, setSelectedFile] = useState(null);
	const [filePreviewUrl, setFilePreviewUrl] = useState(null);
	const [showFileModal, setShowFileModal] = useState(false);
	const [fileTypeToSelect, setFileTypeToSelect] = useState("image");
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

	// Auto-resize textarea
	useEffect(() => {
		if (isEditing && textInputRef.current) {
			textInputRef.current.style.height = 'auto';
			textInputRef.current.style.height = `${textInputRef.current.scrollHeight}px`;
		}
	}, [postText, isEditing]);

	// Debug: log whenever selectedFile changes
	useEffect(() => {
		console.log("DEBUG: selectedFile updated:", selectedFile);
	}, [selectedFile]);

	const openFileModal = (type) => {
		setFileTypeToSelect(type);
		setShowFileModal(true);
	};

	const handleFileSelected = (file) => {
		console.log("DEBUG: handleFileSelected called with:", file);
		if (file && file.type === "image/gif" && file.url) {
			setSelectedFile(file);
			setFilePreviewUrl(file.url);
		} else if (file) {
			setSelectedFile(file);
			setFilePreviewUrl(URL.createObjectURL(file));
		}
	};

	const handleRemoveFile = () => {
		setSelectedFile(null);
		setFilePreviewUrl(null);
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
		console.log("DEBUG: handlePost - postText:", postText, "selectedFile:", selectedFile);
		setIsUploading(true);
		if (!postText.trim() && !selectedFile && !showPollCreator) {
			setIsUploading(false);
			return;
		}
		try {
			let uploadedUrl = null;
			let fileType = null;
			const start = Date.now(); // Start timing

			// Extract the IDs of tagged friends
			const tagIds = taggedFriends.map(f => f.id);
			// Filter valid poll options
			const validPollOptions = showPollCreator ? pollOptions.filter(o => o.trim()) : [];
			const expiresAt = showPollCreator ? new Date(Date.now() + pollDuration * 24 * 60 * 60 * 1000).toISOString() : null;

			if (selectedFile && selectedFile.type === "image/gif" && selectedFile.url) {
				uploadedUrl = selectedFile.url;
				fileType = "gif";
				const payload = {
					imageUrl: uploadedUrl,
					fileType,
					content: postText,
					taggedFriends: tagIds, // Add tagged friends to payload
					pollOptions: validPollOptions,
					expiresAt,
				};
				console.log("DEBUG: handlePost GIF payload:", payload);
				await defaultOnCreatePost(payload);
			} else if (selectedFile) {
				const formData = new FormData();
				formData.append("file", selectedFile);

				// Set loading state before upload
				setIsUploading(true);

				const uploadStart = Date.now();
				const res = await fetch("/api/upload", {
					method: "POST",
					body: formData,
				});
				const data = await res.json();
				const uploadEnd = Date.now();
				console.log("DEBUG: Upload time (ms):", uploadEnd - uploadStart);
				if (!res.ok || !data.url) {
					alert(data.error || "Failed to upload file.");
					setIsUploading(false);
					return;
				}
				uploadedUrl = data.url;
				fileType = selectedFile.type.startsWith("video") ? "video" : "image";
				const payload = {
					[fileType === "video" ? "videoUrl" : "imageUrl"]: uploadedUrl,
					fileType,
					content: postText,
					taggedFriends: tagIds, // Add tagged friends to payload
					pollOptions: validPollOptions,
					expiresAt,
				};
				console.log("DEBUG: handlePost image/video payload:", payload);
				await defaultOnCreatePost(payload);
			} else {
				const payload = {
					content: postText,
					taggedFriends: tagIds, // Add tagged friends to payload
					pollOptions: validPollOptions,
					expiresAt,
				};
				console.log("DEBUG: handlePost text-only payload:", payload);
				await defaultOnCreatePost(payload);
			}

			const end = Date.now();
			console.log("DEBUG: Total post time (ms):", end - start);

			setSelectedFile(null);
			setFilePreviewUrl(null);
			setPostText("");
			setTaggedFriends([]); // Clear tagged friends after posting
			setShowPollCreator(false);
			setPollOptions(["", ""]);
			setPollDuration(1);
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
		const isVideo = selectedFile?.type?.startsWith('video');
		let imageUrl = null;
		let videoUrl = null;
		const validPollOptions = showPollCreator ? pollOptions.filter(o => o.trim()) : [];
		const expiresAt = showPollCreator ? new Date(Date.now() + pollDuration * 24 * 60 * 60 * 1000).toISOString() : null;

		if (selectedFile) {
			if (selectedFile.type === 'image/gif' && selectedFile.url) {
				imageUrl = selectedFile.url;
			} else if (selectedFile.type.startsWith('image')) {
				imageUrl = filePreviewUrl;
			} else if (selectedFile.type.startsWith('video')) {
				videoUrl = filePreviewUrl;
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
		<div className="create-post-card bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-200 dark:border-slate-700 mb-6 w-full max-w-3xl mx-auto p-0">
			<div className="flex items-start px-4 pt-4 pb-2">
				<img
					src={
						session?.user?.profile?.profilePictureUrl ||
						session?.user?.image ||
						`https://placehold.co/40x40/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'
						}`
					}
					alt="Your avatar"
					className="w-10 h-10 rounded-full object-cover border border-gray-200 mt-1"
				/>
				<div className="flex-1 ml-3">
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
							className="flex-1 text-left bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 focus:bg-gray-200 dark:focus:bg-slate-600 rounded-full px-5 py-3 text-gray-700 dark:text-slate-200 text-base font-normal transition outline-none border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 placeholder-gray-500 whitespace-pre-line break-words w-full"
							style={{ minHeight: 44 }}
							onClick={() => setIsEditing(true)}
							type="button"
						>
							{postText ? postText : `What's on your mind, ${session?.user?.name?.split(' ')[0] || ''}?`}
						</button>
					) : (
						<div className="w-full relative" ref={inputContainerRef}>
							<textarea
								ref={textInputRef}
								autoFocus
								placeholder={`What's on your mind, ${session?.user?.name?.split(' ')[0] || ''}?`}
								rows={3}
								value={postText}
								onChange={e => setPostText(e.target.value)}
								onBlur={handleInputBlur}
								maxLength={MAX_POST_LENGTH}
								className="flex-1 w-full px-5 py-3 bg-gray-100 dark:bg-slate-700 rounded-2xl border border-gray-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-slate-400 text-base text-gray-700 dark:text-slate-100 whitespace-pre-line break-words transition min-h-[44px] resize-none"
								style={{ minHeight: 44 }}
							/>
							<div className="absolute right-3 bottom-2 flex items-center space-x-2" tabIndex={-1}>
								<span className={`text-xs ${postText.length >= MAX_POST_LENGTH ? 'text-red-600 font-bold' : (postText.length > MAX_POST_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-400')}`}>
									{postText.length}/{MAX_POST_LENGTH}
								</span>
								<EmojiSelector
									onEmojiSelect={handleAddEmoji}
									parentRef={inputContainerRef}
								/>
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
			{filePreviewUrl && (
				<div className="px-4 pb-2">
					<div className="relative w-full flex justify-center">
						{selectedFile && selectedFile.type === "image/gif" && selectedFile.url ? (
							<img src={selectedFile.url} alt="GIF Preview" className="rounded-xl border border-gray-200 shadow" />
						) : selectedFile && selectedFile.type && selectedFile.type.startsWith("image") ? (
							<img src={filePreviewUrl} alt="Preview" className="max-h-64 rounded-xl border border-gray-200 shadow" />
						) : selectedFile && selectedFile.type && selectedFile.type.startsWith("video") ? (
							<video src={filePreviewUrl} controls className="max-h-64 rounded-xl border border-gray-200 shadow" />
						) : null}
						<button
							className="absolute top-2 right-2 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full p-1 h-8 w-8 shadow transition"
							onClick={handleRemoveFile}
							title="Remove"
						>
							<i className="fas fa-times text-lg"></i>
						</button>
					</div>
				</div>
			)}
			{/* Poll Creator UI */}
			{showPollCreator && (
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
			)}
			<div className="border-t border-gray-200 dark:border-slate-700 mt-2" />
			<div className="flex flex-wrap items-center justify-between px-4 py-2 gap-2">
				<div className="flex items-center gap-2">
					<Tooltip text="Add Photo">
						<button
							type="button"
							className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
							onClick={() => openFileModal("image")}
							aria-label="Add Photo"
						>
							<i className="fas fa-image text-xl"></i>
						</button>
					</Tooltip>
					<Tooltip text="Add Video">
						<button
							type="button"
							className="p-2 rounded-full hover:bg-green-50 dark:hover:bg-slate-700 text-green-600 dark:text-green-400 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/50"
							onClick={() => openFileModal("video")}
							aria-label="Add Video"
						>
							<i className="fas fa-video text-xl"></i>
						</button>
					</Tooltip>
					<Tooltip text="Add GIF">
						<button
							type="button"
							className="p-2 rounded-full hover:bg-purple-50 dark:hover:bg-slate-700 text-purple-600 dark:text-purple-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
							onClick={() => setShowGiphyModal(true)}
							aria-label="Add GIF"
						>
							<i className="fas fa-gift text-xl"></i>
						</button>
					</Tooltip>
					<Tooltip text="Create Poll">
						<button
							type="button"
							className={`p-2 rounded-full hover:bg-orange-50 dark:hover:bg-slate-700 text-orange-600 dark:text-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${showPollCreator ? 'bg-orange-100 dark:bg-slate-600' : ''}`}
							onClick={togglePollCreator}
							aria-label="Create Poll"
						>
							<i className="fas fa-poll text-xl"></i>
						</button>
					</Tooltip>
				</div>
				<div className="flex items-center gap-2 ml-auto sm:ml-0">
					<Tooltip text="Preview Post">
						<button
							type="button"
							className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={() => setShowPreview(true)}
							disabled={!postText && !selectedFile && (!showPollCreator || pollOptions.filter(o => o.trim()).length < 2)}
							aria-label="Preview Post"
						>
							<i className="fas fa-eye text-xl"></i>
						</button>
					</Tooltip>
					<button
						className="bg-[#2374e1] hover:bg-[#1b63c9] text-white font-semibold rounded-lg py-2 px-4 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2374e1] text-sm sm:text-base"
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
				onFileSelected={handleFileSelected}
				fileType={fileTypeToSelect}
				previewUrl={filePreviewUrl}
				file={selectedFile}
				onRemove={handleRemoveFile}
			/>
			{showGiphyModal && (
				<GiphyModal
					isOpen={showGiphyModal}
					onClose={() => setShowGiphyModal(false)}
					onGifSelected={(url) => {
						const gifFile = { type: "image/gif", name: "giphy.gif", url };
						console.log("DEBUG: onGifSelected called with:", gifFile);
						handleFileSelected(gifFile);
					}}
				/>
			)}
			{/* Preview Modal */}
			{showPreview && (
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
			)}
		</div>
	);
}