// src/components/effects/AudioTrimmer.jsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function AudioTrimmer({
	audioUrl,
	duration,
	initialStartTime = 0,
	onComplete,
	onCancel,
}) {
	const audioRef = useRef(null);
	const timelineRef = useRef(null);
	const audioContextRef = useRef(null);
	const [startTime, setStartTime] = useState(initialStartTime);
	const [endTime, setEndTime] = useState(Math.min(initialStartTime + 15, duration));
	const [currentTime, setCurrentTime] = useState(initialStartTime);
	const [isDragging, setIsDragging] = useState(null); // 'start' | 'end' | 'playhead'
	const [waveform, setWaveform] = useState([]);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoadingWaveform, setIsLoadingWaveform] = useState(true);

	// Generate real waveform from audio file
	const generateWaveform = useCallback(async () => {
		if (!audioUrl) return;

		setIsLoadingWaveform(true);
		try {
			const response = await fetch(audioUrl);
			const arrayBuffer = await response.arrayBuffer();
			const audioContext = new (window.AudioContext || window.webkitAudioContext)();
			audioContextRef.current = audioContext;
			const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

			const channelData = audioBuffer.getChannelData(0);
			const samples = 50; // Number of bars
			const blockSize = Math.floor(channelData.length / samples);
			const waveformData = [];

			for (let i = 0; i < samples; i++) {
				let sum = 0;
				for (let j = 0; j < blockSize; j++) {
					sum += Math.abs(channelData[i * blockSize + j]);
				}
				const avg = sum / blockSize;
				// Normalize to 0-1 range
				waveformData.push(Math.min(1, avg * 3));
			}

			setWaveform(waveformData);
		} catch (error) {
			console.error('Failed to generate waveform:', error);
			// Fallback to random waveform if audio decoding fails
			setWaveform(Array.from({ length: 50 }, () => Math.random() * 0.6 + 0.2));
		} finally {
			setIsLoadingWaveform(false);
		}
	}, [audioUrl]);

	useEffect(() => {
		generateWaveform();

		return () => {
			if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
				audioContextRef.current.close();
			}
		};
	}, [generateWaveform]);

	// Handle audio time update
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const handleTimeUpdate = () => {
			setCurrentTime(audio.currentTime);
			// Loop within trim range during preview
			if (audio.currentTime >= endTime) {
				audio.pause();
				audio.currentTime = startTime;
				setIsPlaying(false);
			}
		};

		const handleEnded = () => {
			setIsPlaying(false);
			audio.currentTime = startTime;
		};

		audio.addEventListener('timeupdate', handleTimeUpdate);
		audio.addEventListener('ended', handleEnded);

		return () => {
			audio.removeEventListener('timeupdate', handleTimeUpdate);
			audio.removeEventListener('ended', handleEnded);
		};
	}, [startTime, endTime]);

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

		const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
		if (clientX === undefined) return;

		const time = getTimeFromPosition(clientX);

		if (isDragging === 'start') {
			setStartTime(Math.min(time, endTime - 1));
		} else if (isDragging === 'end') {
			setEndTime(Math.max(time, startTime + 1));
		} else if (isDragging === 'playhead') {
			const clampedTime = Math.max(startTime, Math.min(endTime, time));
			setCurrentTime(clampedTime);
			if (audioRef.current) {
				audioRef.current.currentTime = clampedTime;
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
			window.addEventListener('touchmove', handleMouseMove);
			window.addEventListener('touchend', handleMouseUp);
			return () => {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('mouseup', handleMouseUp);
				window.removeEventListener('touchmove', handleMouseMove);
				window.removeEventListener('touchend', handleMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	const togglePlayback = () => {
		const audio = audioRef.current;
		if (!audio) return;

		if (isPlaying) {
			audio.pause();
			setIsPlaying(false);
		} else {
			audio.currentTime = startTime;
			audio.play().catch(console.error);
			setIsPlaying(true);
		}
	};

	const handleApply = () => {
		onComplete({ startTime, endTime, duration: endTime - startTime });
	};

	const formatTime = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		const ms = Math.floor((seconds % 1) * 10);
		return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
	};

	const startPercent = (startTime / duration) * 100;
	const endPercent = (endTime / duration) * 100;
	const currentPercent = (currentTime / duration) * 100;

	return (
		<div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gray-800">
				<button onClick={onCancel} className="text-white p-2">
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
				<h2 className="text-white font-semibold text-lg">Trim Audio</h2>
				<button onClick={handleApply} className="text-blue-400 font-semibold">
					Done
				</button>
			</div>

			{/* Audio element */}
			<audio ref={audioRef} src={audioUrl} preload="metadata" />

			{/* Main content */}
			<div className="flex-1 flex flex-col justify-center px-6">
				{/* Time display */}
				<div className="text-center mb-8">
					<div className="text-white text-4xl font-mono mb-2">
						{formatTime(currentTime)}
					</div>
					<div className="text-gray-400 text-sm">
						Selected: {formatTime(endTime - startTime)}
					</div>
				</div>

				{/* Play/Pause button */}
				<div className="flex justify-center mb-8">
					<button
						onClick={togglePlayback}
						className="w-16 h-16 bg-white rounded-full flex items-center justify-center transition-transform active:scale-95"
					>
						{isPlaying ? (
							<svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
								<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
							</svg>
						) : (
							<svg className="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
						)}
					</button>
				</div>

				{/* Waveform Timeline */}
				<div className="mb-4">
					<div
						ref={timelineRef}
						className="relative h-20 bg-gray-800 rounded-lg overflow-hidden"
					>
						{/* Waveform visualization */}
						{isLoadingWaveform ? (
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white" />
							</div>
						) : (
							<div className="absolute inset-0 flex items-end justify-around px-1">
								{waveform.map((height, i) => {
									const barPosition = (i / waveform.length) * 100;
									const isInRange = barPosition >= startPercent && barPosition <= endPercent;
									return (
										<div
											key={i}
											className={`w-1 rounded-full transition-colors ${isInRange ? 'bg-red-500' : 'bg-gray-600'
												}`}
											style={{ height: `${height * 80}%` }}
										/>
									);
								})}
							</div>
						)}

						{/* Trim overlay - left */}
						<div
							className="absolute top-0 bottom-0 left-0 bg-black/60"
							style={{ width: `${startPercent}%` }}
						/>

						{/* Trim overlay - right */}
						<div
							className="absolute top-0 bottom-0 right-0 bg-black/60"
							style={{ width: `${100 - endPercent}%` }}
						/>

						{/* Start handle */}
						<div
							className="absolute top-0 bottom-0 w-4 bg-red-500 cursor-ew-resize flex items-center justify-center touch-none"
							style={{ left: `calc(${startPercent}% - 8px)` }}
							onMouseDown={handleMouseDown('start')}
							onTouchStart={handleMouseDown('start')}
						>
							<div className="w-1 h-10 bg-white rounded-full" />
						</div>

						{/* End handle */}
						<div
							className="absolute top-0 bottom-0 w-4 bg-red-500 cursor-ew-resize flex items-center justify-center touch-none"
							style={{ left: `calc(${endPercent}% - 8px)` }}
							onMouseDown={handleMouseDown('end')}
							onTouchStart={handleMouseDown('end')}
						>
							<div className="w-1 h-10 bg-white rounded-full" />
						</div>

						{/* Playhead */}
						<div
							className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none"
							style={{ left: `${currentPercent}%` }}
						>
							<div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
						</div>

						{/* Active region border */}
						<div
							className="absolute top-0 bottom-0 border-2 border-red-500 pointer-events-none rounded"
							style={{
								left: `${startPercent}%`,
								width: `${endPercent - startPercent}%`,
							}}
						/>
					</div>
				</div>

				{/* Time labels */}
				<div className="flex justify-between text-white text-sm px-1">
					<span>{formatTime(startTime)}</span>
					<span className="text-gray-400">Duration: {formatTime(endTime - startTime)}</span>
					<span>{formatTime(endTime)}</span>
				</div>
			</div>
		</div>
	);
}
