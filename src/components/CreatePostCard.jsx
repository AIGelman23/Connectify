"use client";

import React, { useRef, useState } from "react";
import { useSession } from "next-auth/react";

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
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
			<div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in-down">
				<button
					className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl z-10"
					onClick={onClose}
					aria-label="Close"
				>
					<i className="fas fa-times"></i>
				</button>
				<div className="flex flex-col items-center p-8">
					<h2 className="text-2xl font-bold text-gray-800 mb-4">
						{fileType === "image" ? "Add Photo" : "Add Video"}
					</h2>
					<div className="w-full flex flex-col items-center">
						{previewUrl ? (
							<div className="relative w-full flex flex-col items-center">
								{fileType === "image" ? (
									<img
										src={previewUrl}
										alt="Preview"
										className="rounded-xl max-h-96 object-contain border border-gray-200 shadow-lg"
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
							<div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
								<input
									type="file"
									accept={fileType === "image" ? "image/*" : "video/*"}
									ref={fileInputRef}
									onChange={handleFileChange}
									className="hidden"
								/>
								<button
									className="flex flex-col items-center justify-center text-indigo-600 hover:text-indigo-800 focus:outline-none"
									onClick={handleChooseFile}
								>
									<i className={`fas ${fileType === "image" ? "fa-image" : "fa-video"} text-4xl mb-2`}></i>
									<span className="font-semibold text-lg">
										Click to {fileType === "image" ? "add a photo" : "add a video"}
									</span>
									<span className="text-gray-500 text-sm mt-1">
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
							className="px-5 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
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

export default function CreatePostCard({ onCreatePost }) {
	const { data: session } = useSession();
	const [selectedFile, setSelectedFile] = useState(null);
	const [filePreviewUrl, setFilePreviewUrl] = useState(null);
	const [showFileModal, setShowFileModal] = useState(false);
	const [fileTypeToSelect, setFileTypeToSelect] = useState("image");
	const [postText, setPostText] = useState(""); // <-- Add state for post text
	const [isUploading, setIsUploading] = useState(false); // Add this state

	const openFileModal = (type) => {
		setFileTypeToSelect(type);
		setShowFileModal(true);
	};

	const handleFileSelected = (file) => {
		setSelectedFile(file);
		setFilePreviewUrl(URL.createObjectURL(file));
	};

	const handleRemoveFile = () => {
		setSelectedFile(null);
		setFilePreviewUrl(null);
	};

	const handlePost = async () => {
		// Immediately set loading indicator
		setIsUploading(true);
		// Ensure that at least text or media is provided
		if (!postText.trim() && !selectedFile) {
			setIsUploading(false);
			// Optionally set an error state (if available) here
			return;
		}
		try {
			let uploadedUrl = null;
			let fileType = null;
			if (selectedFile) {
				const formData = new FormData();
				formData.append("file", selectedFile);
				const res = await fetch("/api/upload", {
					method: "POST",
					body: formData,
				});
				const data = await res.json();
				uploadedUrl = data.url;
				fileType = selectedFile.type.startsWith("video") ? "video" : "image";
			}
			await onCreatePost && onCreatePost({
				fileUrl: uploadedUrl,
				fileType,
				content: postText
			});
			// Reset post fields after upload
			setSelectedFile(null);
			setFilePreviewUrl(null);
			setPostText("");
		} catch (error) {
			console.error("Post error:", error);
		} finally {
			// Always clear loading state
			setIsUploading(false);
		}
	};

	return (
		<div className="create-post-card rounded-lg shadow-md p-4 mb-6 border border-gray-200">
			<h3 className="text-lg font-semibold text-gray-800 mb-3">Create Post</h3>
			<div className="flex items-center space-x-3 mb-4">
				<img
					src={
						session?.user?.profile?.profilePictureUrl ||
						session?.user?.image ||
						`https://placehold.co/40x40/1877F2/ffffff?text=${session?.user?.name ? session.user.name[0].toUpperCase() : 'U'
						}`
					}
					alt="Your avatar"
					className="w-10 h-10 rounded-full object-cover border border-gray-200"
				/>
				<textarea
					placeholder="What's on your mind?"
					rows="3"
					value={postText}
					onChange={e => setPostText(e.target.value)}
					className="
						w-full 
						p-4 
						bg-gray-100 
						rounded-xl 
						border 
						border-gray-300 
						focus:outline-none 
						focus:ring-2 
						focus:ring-blue-500 
						focus:border-transparent 
						shadow-sm 
						transition 
						duration-200 
						resize-y 
						min-h-[60px]"
				></textarea>
			</div>
			{/* Modern preview below the input */}
			{filePreviewUrl && (
				<div className="mb-3 flex flex-col items-center">
					<div className="relative w-full flex justify-center">
						{selectedFile.type.startsWith("image") ? (
							<img src={filePreviewUrl} alt="Preview" className="max-h-64 rounded-xl border border-gray-200 shadow" />
						) : (
							<video src={filePreviewUrl} controls className="max-h-64 rounded-xl border border-gray-200 shadow" />
						)}
						<button
							className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-2 shadow hover:bg-opacity-100 transition"
							onClick={handleRemoveFile}
							title="Remove"
						>
							<i className="fas fa-trash text-red-500"></i>
						</button>
					</div>
				</div>
			)}
			<div className="flex justify-end space-x-3 pt-3">
				<button
					type="button"
					className="flex items-center space-x-2 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-full transition duration-150"
					onClick={() => openFileModal("image")}
				>
					<i className="fas fa-image"></i>
					<span>Photo</span>
				</button>
				<button
					type="button"
					className="flex items-center space-x-2 text-green-600 hover:bg-green-50 px-4 py-2 rounded-full transition duration-150"
					onClick={() => openFileModal("video")}
				>
					<i className="fas fa-video"></i>
					<span>Video</span>
				</button>
				<button
					className={`
						px-5 py-2.5 
						rounded-full 
						font-medium 
						text-white 
						bg-[#2374e1]
						shadow-sm
						transition 
						duration-150 
						ease-in-out
						disabled:opacity-60 
						disabled:cursor-not-allowed 
						hover:bg-[#1b63c9] 
						focus:outline-none 
						focus:ring-2 
						focus:ring-offset-1 
						focus:ring-[#2374e1]
					`}
					onClick={handlePost}
					disabled={isUploading}
				>
					{isUploading ? (
						<span>
							<i className="fas fa-spinner fa-spin mr-2"></i>
							Posting...
						</span>
					) : (
						"Post"
					)}
				</button>
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
		</div>
	);
}
