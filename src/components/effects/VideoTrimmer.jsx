// src/components/effects/VideoTrimmer.jsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function VideoTrimmer({ videoBlob, onTrimComplete, onCancel }) {
	const videoRef = useRef(null);
	const timelineRef = useRef(null);
	const [videoUrl, setVideoUrl] = useState(null);
	const [duration, setDuration] = useState(0);
	const [startTime, setStartTime] = useState(0);
	const [endTime, setEndTime] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [isDragging, setIsDragging] = useState(null); // 'start' | 'end' | 'playhead'
	const [thumbnails, setThumbnails] = useState([]);

	useEffect(() => {
		if (videoBlob) {
			const url = URL.createObjectURL(videoBlob);
			setVideoUrl(url);
			return () => URL.revokeObjectURL(url);
		}
	}, [videoBlob]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !videoUrl) return;

		const handleLoadedMetadata = () => {
			setDuration(video.duration);
			setEndTime(video.duration);
			generateThumbnails(video);
		};

		const handleTimeUpdate = () => {
			setCurrentTime(video.currentTime);
			// Loop within trim range
			if (video.currentTime >= endTime) {
				video.currentTime = startTime;
			}
		};

		video.addEventListener('loadedmetadata', handleLoadedMetadata);
		video.addEventListener('timeupdate', handleTimeUpdate);

		return () => {
			video.removeEventListener('loadedmetadata', handleLoadedMetadata);
			video.removeEventListener('timeupdate', handleTimeUpdate);
		};
	}, [videoUrl, startTime, endTime]);

	const generateThumbnails = async (video) => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const thumbCount = 10;
		const thumbWidth = 60;
		const thumbHeight = 40;
		canvas.width = thumbWidth;
		canvas.height = thumbHeight;

		const thumbs = [];
		const duration = video.duration;

		for (let i = 0; i < thumbCount; i++) {
			const time = (i / thumbCount) * duration;
			video.currentTime = time;
			await new Promise(resolve => {
				video.onseeked = resolve;
			});
			ctx.drawImage(video, 0, 0, thumbWidth, thumbHeight);
			thumbs.push(canvas.toDataURL());
		}

		setThumbnails(thumbs);
		video.currentTime = 0;
		video.play().catch(() => { });
	};

	const getTimeFromPosition = useCallback((clientX) => {
		if (!timelineRef.current) return 0;
		const rect = timelineRef.current.getBoundingClientRect();
		const position = (clientX - rect.left) / rect.width;
		return Math.max(0, Math.min(duration, position * duration));
	}, [duration]);

	const handleMouseDown = (type) => (e) => {
		e.preventDefault();
		setIsDragging(type);
	};

	const handleMouseMove = useCallback((e) => {
		if (!isDragging) return;

		const time = getTimeFromPosition(e.clientX);

		if (isDragging === 'start') {
			setStartTime(Math.min(time, endTime - 1));
		} else if (isDragging === 'end') {
			setEndTime(Math.max(time, startTime + 1));
		} else if (isDragging === 'playhead') {
			if (videoRef.current) {
				videoRef.current.currentTime = Math.max(startTime, Math.min(endTime, time));
			}
		}
	}, [isDragging, startTime, endTime, getTimeFromPosition]);

	const handleMouseUp = useCallback(() => {
		setIsDragging(null);
	}, []);

	useEffect(() => {
		if (isDragging) {
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);
			window.addEventListener('touchmove', handleTouchMove);
			window.addEventListener('touchend', handleMouseUp);
			return () => {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('mouseup', handleMouseUp);
				window.removeEventListener('touchmove', handleTouchMove);
				window.removeEventListener('touchend', handleMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	const handleTouchMove = (e) => {
		if (e.touches.length > 0) {
			handleMouseMove({ clientX: e.touches[0].clientX });
		}
	};

	const formatTime = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		const ms = Math.floor((seconds % 1) * 10);
		return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
	};

	const handleApply = () => {
		onTrimComplete({ startTime, endTime, duration: endTime - startTime });
	};

	const startPercent = (startTime / duration) * 100;
	const endPercent = (endTime / duration) * 100;
	const currentPercent = (currentTime / duration) * 100;

	return (
		<div className="h-screen w-full relative bg-black flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 z-10">
				<button onClick={onCancel} className="text-white p-2">
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
				<h2 className="text-white font-semibold text-lg">Trim Video</h2>
				<button onClick={handleApply} className="text-blue-400 font-semibold">
					Done
				</button>
			</div>

			{/* Video preview */}
			<div className="flex-1 flex items-center justify-center overflow-hidden">
				<video
					ref={videoRef}
					src={videoUrl}
					className="max-h-full max-w-full object-contain"
					loop
					muted
					playsInline
					autoPlay
				/>
			</div>

			{/* Time display */}
			<div className="flex justify-between px-4 py-2 text-white text-sm">
				<span>{formatTime(startTime)}</span>
				<span className="text-white/60">Duration: {formatTime(endTime - startTime)}</span>
				<span>{formatTime(endTime)}</span>
			</div>

			{/* Timeline */}
			<div className="px-4 pb-8">
				<div
					ref={timelineRef}
					className="relative h-16 bg-gray-800 rounded-lg overflow-hidden"
				>
					{/* Thumbnails */}
					<div className="absolute inset-0 flex">
						{thumbnails.map((thumb, i) => (
							<div
								key={i}
								className="flex-1 h-full bg-cover bg-center"
								style={{ backgroundImage: `url(${thumb})` }}
							/>
						))}
					</div>

					{/* Trim overlay - left */}
					<div
						className="absolute top-0 bottom-0 left-0 bg-black/70"
						style={{ width: `${startPercent}%` }}
					/>

					{/* Trim overlay - right */}
					<div
						className="absolute top-0 bottom-0 right-0 bg-black/70"
						style={{ width: `${100 - endPercent}%` }}
					/>

					{/* Start handle */}
					<div
						className="absolute top-0 bottom-0 w-4 bg-yellow-400 cursor-ew-resize flex items-center justify-center"
						style={{ left: `calc(${startPercent}% - 8px)` }}
						onMouseDown={handleMouseDown('start')}
						onTouchStart={handleMouseDown('start')}
					>
						<div className="w-1 h-8 bg-yellow-600 rounded-full" />
					</div>

					{/* End handle */}
					<div
						className="absolute top-0 bottom-0 w-4 bg-yellow-400 cursor-ew-resize flex items-center justify-center"
						style={{ left: `calc(${endPercent}% - 8px)` }}
						onMouseDown={handleMouseDown('end')}
						onTouchStart={handleMouseDown('end')}
					>
						<div className="w-1 h-8 bg-yellow-600 rounded-full" />
					</div>

					{/* Playhead */}
					<div
						className="absolute top-0 bottom-0 w-0.5 bg-white"
						style={{ left: `${currentPercent}%` }}
					>
						<div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
					</div>

					{/* Active region border */}
					<div
						className="absolute top-0 bottom-0 border-2 border-yellow-400 pointer-events-none"
						style={{
							left: `${startPercent}%`,
							width: `${endPercent - startPercent}%`,
						}}
					/>
				</div>
			</div>
		</div>
	);
}
