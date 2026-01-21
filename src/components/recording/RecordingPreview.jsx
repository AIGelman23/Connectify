// src/components/recording/RecordingPreview.jsx
"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function RecordingPreview({ videoBlob, onRetake, onProceed }) {
	const videoRef = useRef(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [videoUrl, setVideoUrl] = useState(null);

	useEffect(() => {
		if (videoBlob) {
			const url = URL.createObjectURL(videoBlob);
			setVideoUrl(url);
			return () => URL.revokeObjectURL(url);
		}
	}, [videoBlob]);

	useEffect(() => {
		if (videoRef.current && videoUrl) {
			videoRef.current.src = videoUrl;
			videoRef.current.play().then(() => {
				setIsPlaying(true);
			}).catch(() => { });
		}
	}, [videoUrl]);

	const togglePlayPause = () => {
		if (!videoRef.current) return;

		if (videoRef.current.paused) {
			videoRef.current.play();
			setIsPlaying(true);
		} else {
			videoRef.current.pause();
			setIsPlaying(false);
		}
	};

	const handleVideoEnd = () => {
		if (videoRef.current) {
			videoRef.current.currentTime = 0;
			videoRef.current.play();
		}
	};

	return (
		<div className="h-screen w-full relative bg-black">
			{/* Video preview */}
			<video
				ref={videoRef}
				className="absolute inset-0 w-full h-full object-contain"
				playsInline
				loop
				onClick={togglePlayPause}
				onEnded={handleVideoEnd}
			/>

			{/* Play/Pause indicator */}
			{!isPlaying && (
				<div
					className="absolute inset-0 flex items-center justify-center cursor-pointer"
					onClick={togglePlayPause}
				>
					<div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center">
						<svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
					</div>
				</div>
			)}

			{/* Action buttons */}
			<div className="absolute bottom-8 left-4 right-4 flex justify-between items-center z-10">
				<button
					onClick={onRetake}
					className="flex items-center space-x-2 px-5 py-3 bg-white/20 backdrop-blur-sm rounded-full text-white font-medium"
				>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					<span>Retake</span>
				</button>

				<button
					onClick={onProceed}
					className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full text-white font-medium"
				>
					<span>Next</span>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>

			{/* Preview label */}
			<div className="absolute top-16 left-0 right-0 flex justify-center z-10">
				<span className="px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full text-white text-sm font-medium">
					Preview
				</span>
			</div>
		</div>
	);
}
