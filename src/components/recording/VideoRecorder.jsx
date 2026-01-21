// src/components/recording/VideoRecorder.jsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import useMediaStream from '../../hooks/useMediaStream';
import useVideoRecorder from '../../hooks/useVideoRecorder';
import RecordingControls from './RecordingControls';
import AudioTrimmer from '../effects/AudioTrimmer';

const MOCK_SOUNDS = [
	{ id: '1', name: 'Trending Beat', duration: 15, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
	{ id: '2', name: 'Dance Mood', duration: 30, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
	{ id: '3', name: 'Chill Vibes', duration: 60, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

export default function VideoRecorder({ onRecordingComplete, onClose }) {
	const videoRef = useRef(null);
	const audioRef = useRef(null);
	const fileInputRef = useRef(null);
	const canvasRef = useRef(null);
	const audioContextRef = useRef(null);
	const [selectedSound, setSelectedSound] = useState(null);
	const [showSoundPicker, setShowSoundPicker] = useState(false);
	const [mixedStream, setMixedStream] = useState(null);
	const [flashOn, setFlashOn] = useState(false);
	const [countdownMode, setCountdownMode] = useState(0);
	const [isCountingDown, setIsCountingDown] = useState(false);
	const [count, setCount] = useState(0);
	const [isRetaking, setIsRetaking] = useState(false);
	const [audioStartTime, setAudioStartTime] = useState(0);
	const [audioEndTime, setAudioEndTime] = useState(15);
	const [showTrimmer, setShowTrimmer] = useState(false);
	const [previewingSound, setPreviewingSound] = useState(null);
	const [recordingSpeed, setRecordingSpeed] = useState(1);
	const [showSpeedPicker, setShowSpeedPicker] = useState(false);
	const [showZoomSlider, setShowZoomSlider] = useState(false);
	const previewAudioRef = useRef(null);
	const lastPinchDistance = useRef(null);
	const containerRef = useRef(null);

	const SPEED_OPTIONS = [
		{ value: 0.3, label: '0.3x' },
		{ value: 0.5, label: '0.5x' },
		{ value: 1, label: '1x' },
		{ value: 2, label: '2x' },
		{ value: 3, label: '3x' },
	];

	const {
		stream,
		error: streamError,
		isLoading: streamLoading,
		isFlipping,
		hasPermission,
		facingMode,
		zoomLevel,
		zoomCapabilities,
		startStream,
		stopStream,
		flipCamera,
		setZoom,
	} = useMediaStream();

	// Mix audio streams (microphone + music)
	useEffect(() => {
		if (!stream) return;

		if (!selectedSound) {
			setMixedStream(null);
			return;
		}

		const setupAudioMixing = () => {
			if (!audioRef.current) return;

			try {
				const audioContext = new (window.AudioContext || window.webkitAudioContext)();
				audioContextRef.current = audioContext;
				const dest = audioContext.createMediaStreamDestination();

				// Add music audio
				const musicSource = audioContext.createMediaElementSource(audioRef.current);
				musicSource.connect(dest);
				musicSource.connect(audioContext.destination); // Output to speakers so user can hear it

				const mixedTracks = [
					...stream.getVideoTracks(),
					...dest.stream.getAudioTracks()
				];
				setMixedStream(new MediaStream(mixedTracks));
			} catch (error) {
				console.error("Audio mixing failed:", error);
				setMixedStream(null);
			}
		};

		// Small timeout to ensure audio element ref is populated
		const timer = setTimeout(setupAudioMixing, 0);

		return () => {
			clearTimeout(timer);
			if (audioContextRef.current) {
				audioContextRef.current.close();
				audioContextRef.current = null;
			}
		};
	}, [stream, selectedSound]);

	const {
		isRecording,
		isPaused,
		togglePause,
		recordedBlob,
		recordingDuration,
		maxDuration,
		error: recordingError,
		startRecording,
		stopRecording,
		clearRecording,
	} = useVideoRecorder(mixedStream || stream);

	// Start stream on mount
	useEffect(() => {
		startStream();
		return () => stopStream();
	}, []);

	// Attach stream to video element
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		if (stream) {
			video.srcObject = stream;
			// Ensure video plays after stream is attached
			video.play().catch(err => {
				// Autoplay might be blocked, that's ok - user interaction will start it
				console.log('Video autoplay:', err.message);
			});
		} else {
			// Clear the video when stream is null (during camera flip)
			video.srcObject = null;
		}
	}, [stream]);

	// Handle recording complete
	useEffect(() => {
		if (isRetaking) {
			if (recordedBlob) {
				clearRecording();
				setIsRetaking(false);
				// Ensure video element is reconnected to stream after retake
				if (videoRef.current && stream) {
					videoRef.current.srcObject = stream;
					videoRef.current.play().catch(() => {});
				}
			}
			return;
		}
		if (recordedBlob && onRecordingComplete) {
			onRecordingComplete(recordedBlob, selectedSound);
		}
	}, [recordedBlob, onRecordingComplete, selectedSound, isRetaking, clearRecording, stream]);

	// Audio Visualizer
	useEffect(() => {
		if (!isRecording) return;

		const streamToUse = mixedStream || stream;
		if (!streamToUse || streamToUse.getAudioTracks().length === 0) return;

		let animationId;
		let audioContext;
		let analyser;
		let source;

		const setupVisualizer = () => {
			try {
				audioContext = new (window.AudioContext || window.webkitAudioContext)();
				analyser = audioContext.createAnalyser();
				analyser.fftSize = 64;
				const bufferLength = analyser.frequencyBinCount;
				const dataArray = new Uint8Array(bufferLength);

				source = audioContext.createMediaStreamSource(streamToUse);
				source.connect(analyser);

				const canvas = canvasRef.current;
				if (!canvas) return;

				const ctx = canvas.getContext('2d');
				const width = canvas.width;
				const height = canvas.height;

				const draw = () => {
					animationId = requestAnimationFrame(draw);
					analyser.getByteFrequencyData(dataArray);

					ctx.clearRect(0, 0, width, height);

					const barWidth = (width / bufferLength) * 2;
					let barHeight;
					let x = 0;

					for (let i = 0; i < bufferLength; i++) {
						barHeight = (dataArray[i] / 255) * height;

						const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
						gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)'); // red-500
						gradient.addColorStop(1, 'rgba(252, 165, 165, 0.8)'); // red-300

						ctx.fillStyle = gradient;
						ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

						x += barWidth;
					}
				};
				draw();
			} catch (err) {
				console.error("Visualizer setup failed:", err);
			}
		};

		setupVisualizer();

		return () => {
			if (animationId) cancelAnimationFrame(animationId);
			if (source) source.disconnect();
			if (analyser) analyser.disconnect();
			if (audioContext && audioContext.state !== 'closed') audioContext.close();
		};
	}, [isRecording, stream, mixedStream]);

	useEffect(() => {
		setAudioStartTime(0);
		setAudioEndTime(selectedSound ? Math.min(15, selectedSound.duration) : 15);
	}, [selectedSound]);

	// Handle audio playback
	useEffect(() => {
		if (selectedSound && audioRef.current) {
			if (isRecording) {
				// Resume AudioContext if it's suspended (browser autoplay policy)
				if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
					audioContextRef.current.resume();
				}

				audioRef.current.currentTime = audioStartTime;
				audioRef.current.play().catch(e => console.error("Audio play failed", e));
			} else {
				audioRef.current.pause();
				audioRef.current.currentTime = audioStartTime;
			}
		}
	}, [isRecording, selectedSound, audioStartTime]);

	const handleStartRecording = () => {
		setIsRetaking(false);
		if (countdownMode > 0) {
			setCount(countdownMode);
			setIsCountingDown(true);
		} else {
			startRecording();
		}
	};

	useEffect(() => {
		let timer;
		if (isCountingDown && count > 0) {
			timer = setTimeout(() => setCount((c) => c - 1), 1000);
		} else if (isCountingDown && count === 0) {
			setIsCountingDown(false);
			startRecording();
		}
		return () => clearTimeout(timer);
	}, [isCountingDown, count, startRecording]);

	const handleRetake = () => {
		setIsRetaking(true);
		// Stop the recording first
		stopRecording();
		// Also clear any audio context that might be holding the stream
		if (audioContextRef.current) {
			audioContextRef.current.close().catch(() => {});
			audioContextRef.current = null;
		}
		// Reset mixed stream so we use the raw camera stream
		setMixedStream(null);
	};

	const toggleFlash = async () => {
		if (!stream) return;
		const videoTrack = stream.getVideoTracks()[0];
		try {
			// Note: 'torch' constraint is primarily supported on mobile devices
			await videoTrack.applyConstraints({
				advanced: [{ torch: !flashOn }]
			});
			setFlashOn(!flashOn);
		} catch (error) {
			console.error("Flash toggle failed (device might not support torch):", error);
		}
	};

	const handleFileUpload = (event) => {
		const file = event.target.files[0];
		if (file) {
			if (onRecordingComplete) {
				onRecordingComplete(file, selectedSound);
			}
		}
	};

	const formatTime = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	// Sound preview functionality
	const handlePreviewSound = (sound) => {
		// Stop any currently playing preview
		if (previewAudioRef.current) {
			previewAudioRef.current.pause();
			previewAudioRef.current = null;
		}

		if (previewingSound?.id === sound.id) {
			// Toggle off if same sound
			setPreviewingSound(null);
			return;
		}

		// Start new preview
		const audio = new Audio(sound.audioUrl);
		audio.volume = 0.5;
		previewAudioRef.current = audio;
		setPreviewingSound(sound);

		// Auto-stop after 5 seconds
		const timeout = setTimeout(() => {
			if (previewAudioRef.current === audio) {
				audio.pause();
				setPreviewingSound(null);
			}
		}, 5000);

		audio.onended = () => {
			clearTimeout(timeout);
			setPreviewingSound(null);
		};

		audio.play().catch(console.error);
	};

	// Cleanup preview audio on unmount
	useEffect(() => {
		return () => {
			if (previewAudioRef.current) {
				previewAudioRef.current.pause();
				previewAudioRef.current = null;
			}
		};
	}, []);

	// Pinch-to-zoom gesture handling
	useEffect(() => {
		const container = containerRef.current;
		if (!container || zoomCapabilities.max <= 1) return;

		const handleTouchStart = (e) => {
			if (e.touches.length === 2) {
				const distance = Math.hypot(
					e.touches[0].clientX - e.touches[1].clientX,
					e.touches[0].clientY - e.touches[1].clientY
				);
				lastPinchDistance.current = distance;
			}
		};

		const handleTouchMove = (e) => {
			if (e.touches.length === 2 && lastPinchDistance.current !== null) {
				e.preventDefault();
				const distance = Math.hypot(
					e.touches[0].clientX - e.touches[1].clientX,
					e.touches[0].clientY - e.touches[1].clientY
				);

				const scale = distance / lastPinchDistance.current;
				const newZoom = Math.max(
					zoomCapabilities.min,
					Math.min(zoomCapabilities.max, zoomLevel * scale)
				);

				setZoom(newZoom);
				lastPinchDistance.current = distance;
			}
		};

		const handleTouchEnd = () => {
			lastPinchDistance.current = null;
		};

		container.addEventListener('touchstart', handleTouchStart, { passive: false });
		container.addEventListener('touchmove', handleTouchMove, { passive: false });
		container.addEventListener('touchend', handleTouchEnd);

		return () => {
			container.removeEventListener('touchstart', handleTouchStart);
			container.removeEventListener('touchmove', handleTouchMove);
			container.removeEventListener('touchend', handleTouchEnd);
		};
	}, [zoomLevel, zoomCapabilities, setZoom]);

	// Handle zoom slider change
	const handleZoomChange = (e) => {
		const newZoom = parseFloat(e.target.value);
		setZoom(newZoom);
	};

	const progress = (recordingDuration / maxDuration) * 100;

	if (streamLoading) {
		return (
			<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
				<p className="text-white">Accessing camera...</p>
				{onClose && (
					<button onClick={onClose} className="absolute top-6 left-4 text-white p-2 z-50">
						<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
					</button>
				)}
			</div>
		);
	}

	if (streamError || hasPermission === false) {
		return (
			<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-6">
				<svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
				</svg>
				<p className="text-white text-center text-lg mb-4">{streamError || 'Camera access required'}</p>
				<button
					onClick={startStream}
					className="px-6 py-3 bg-white text-black rounded-full font-medium"
				>
					Try Again
				</button>
				{onClose && (
					<button onClick={onClose} className="absolute top-6 left-4 text-white p-2 z-50">
						<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
					</button>
				)}
			</div>
		);
	}

	return (
		<div ref={containerRef} className="fixed inset-0 z-50 bg-black touch-none">
			{/* Camera preview */}
			<video
				ref={videoRef}
				autoPlay
				playsInline
				muted
				className={`absolute inset-0 w-full h-full object-cover bg-black ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
			/>

			{/* Zoom indicator */}
			{zoomLevel > 1 && (
				<div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
					<span className="text-white text-sm font-medium">{zoomLevel.toFixed(1)}x</span>
				</div>
			)}

			{/* Progress Bar (Top Edge) */}
			{isRecording && (
				<div className="absolute top-0 left-0 right-0 z-30 h-1.5 bg-gray-800/50">
					<div
						className="h-full bg-red-500 transition-all duration-100 ease-linear"
						style={{ width: `${progress}%` }}
					/>
				</div>
			)}

			{/* Audio Visualizer */}
			{isRecording && (
				<div className="absolute bottom-32 left-0 right-0 h-20 z-20 flex items-end justify-center pointer-events-none px-10 opacity-80">
					<canvas ref={canvasRef} width={300} height={100} className="w-full h-full" />
				</div>
			)}

			{/* Paused Overlay */}
			{isPaused && (
				<div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
					<div className="bg-black/50 backdrop-blur-md px-6 py-3 rounded-full animate-pulse">
						<p className="text-white font-bold tracking-widest text-xl">PAUSED</p>
					</div>
				</div>
			)}

			{/* Camera Flipping Overlay */}
			{isFlipping && (
				<div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none bg-black/30">
					<div className="bg-black/70 backdrop-blur-md px-6 py-4 rounded-2xl flex flex-col items-center">
						<svg className="w-10 h-10 text-white animate-spin mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						<p className="text-white font-medium">Switching camera...</p>
					</div>
				</div>
			)}

			{/* Countdown Overlay */}
			{isCountingDown && (
				<div
					className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer"
					onClick={() => setIsCountingDown(false)}
				>
					<div className="text-white text-9xl font-bold animate-bounce drop-shadow-lg">
						{count}
					</div>
				</div>
			)}

			{/* Top Controls Overlay */}
			<div className="absolute top-0 left-0 right-0 pt-6 px-4 z-20 grid grid-cols-[auto_1fr_auto] items-start gap-4 pointer-events-none">
				{/* Left: Close Button */}
				<div className="pointer-events-auto min-w-[48px]">
					{!isRecording && onClose && (
						<button
							onClick={onClose}
							className="text-white p-2 drop-shadow-lg"
						>
							<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					)}
				</div>

				{/* Center: Sound Picker / Timer */}
				<div className="flex justify-center pointer-events-auto min-w-0 items-center gap-2">
					{!isRecording && !showSoundPicker && (
						<>
							<button
								onClick={() => setShowSoundPicker(true)}
								className="flex items-center space-x-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white font-medium text-sm max-w-full"
							>
								<svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
								<span className="truncate">{selectedSound ? selectedSound.name : 'Add Sound'}</span>
								{selectedSound && (
									<div onClick={(e) => { e.stopPropagation(); setSelectedSound(null); }} className="ml-2 p-1 hover:bg-white/20 rounded-full flex-shrink-0">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
									</div>
								)}
							</button>
							{selectedSound && (
								<button
									onClick={() => setShowTrimmer(true)}
									className="w-9 h-9 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm8.486-8.486a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243z" /></svg>
								</button>
							)}
						</>
					)}
					{isRecording && (
						<div className="bg-black/30 backdrop-blur-md px-3 py-1 rounded-full">
							<span className="text-white text-sm font-medium font-mono">
								{formatTime(recordingDuration)} / {formatTime(maxDuration)}
							</span>
						</div>
					)}
				</div>

				{/* Right: Sidebar Controls */}
				<div className="pointer-events-auto min-w-[48px] flex flex-col items-center space-y-4">
					<button
						onClick={flipCamera}
						disabled={isRecording}
						className="flex flex-col items-center text-white disabled:opacity-50 group"
					>
						<div className="w-10 h-10 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-1 group-active:scale-90 transition-transform">
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						</div>
						<span className="text-xs font-medium drop-shadow-md">Flip</span>
					</button>

					{isRecording && (
						<button
							onClick={togglePause}
							className="flex flex-col items-center text-white group"
						>
							<div className={`w-10 h-10 ${isPaused ? 'bg-white text-black' : 'bg-red-500 text-white'} backdrop-blur-sm rounded-full flex items-center justify-center mb-1 group-active:scale-90 transition-transform`}>
								{isPaused ? (
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
								) : (
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
								)}
							</div>
							<span className="text-xs font-medium drop-shadow-md">{isPaused ? 'Resume' : 'Pause'}</span>
						</button>
					)}

					{isRecording && (
						<button
							onClick={handleRetake}
							className="flex flex-col items-center text-white group"
						>
							<div className="w-10 h-10 bg-gray-800/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-1 group-active:scale-90 transition-transform">
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
							</div>
							<span className="text-xs font-medium drop-shadow-md">Retake</span>
						</button>
					)}

					<button
						onClick={toggleFlash}
						disabled={isRecording}
						className="flex flex-col items-center text-white disabled:opacity-50 group"
					>
						<div className={`w-10 h-10 ${flashOn ? 'bg-yellow-500/80 text-black' : 'bg-black/20 text-white'} backdrop-blur-sm rounded-full flex items-center justify-center mb-1 group-active:scale-90 transition-transform`}>
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
						</div>
						<span className="text-xs font-medium drop-shadow-md">Flash</span>
					</button>

					<button
						onClick={() => {
							if (countdownMode === 0) setCountdownMode(3);
							else if (countdownMode === 3) setCountdownMode(10);
							else setCountdownMode(0);
						}}
						disabled={isRecording}
						className="flex flex-col items-center text-white disabled:opacity-50 group"
					>
						<div className={`w-10 h-10 ${countdownMode > 0 ? 'bg-white text-black' : 'bg-black/20 text-white'} backdrop-blur-sm rounded-full flex items-center justify-center mb-1 group-active:scale-90 transition-transform`}>
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<span className="text-xs font-medium drop-shadow-md">
							{countdownMode === 0 ? 'Timer' : `${countdownMode}s`}
						</span>
					</button>

					{/* Speed Selector */}
					<button
						onClick={() => setShowSpeedPicker(!showSpeedPicker)}
						disabled={isRecording}
						className="flex flex-col items-center text-white disabled:opacity-50 group"
					>
						<div className={`w-10 h-10 ${recordingSpeed !== 1 ? 'bg-pink-500 text-white' : 'bg-black/20 text-white'} backdrop-blur-sm rounded-full flex items-center justify-center mb-1 group-active:scale-90 transition-transform`}>
							<span className="text-xs font-bold">{recordingSpeed}x</span>
						</div>
						<span className="text-xs font-medium drop-shadow-md">Speed</span>
					</button>

					{/* Zoom Control */}
					{zoomCapabilities.max > 1 && (
						<button
							onClick={() => setShowZoomSlider(!showZoomSlider)}
							className="flex flex-col items-center text-white group"
						>
							<div className={`w-10 h-10 ${zoomLevel > 1 ? 'bg-blue-500 text-white' : 'bg-black/20 text-white'} backdrop-blur-sm rounded-full flex items-center justify-center mb-1 group-active:scale-90 transition-transform`}>
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
								</svg>
							</div>
							<span className="text-xs font-medium drop-shadow-md">Zoom</span>
						</button>
					)}

					<button
						onClick={() => fileInputRef.current?.click()}
						disabled={isRecording}
						className="flex flex-col items-center text-white disabled:opacity-50 group"
					>
						<div className="w-10 h-10 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-1 group-active:scale-90 transition-transform">
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
							</svg>
						</div>
						<span className="text-xs font-medium drop-shadow-md">Upload</span>
					</button>

					<input type="file" accept="video/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
				</div>
			</div>

			{/* Hidden Audio Element */}
			{selectedSound && (
				<audio
					ref={audioRef}
					key={`${selectedSound.id}-${stream?.id || 'ns'}`}
					crossOrigin="anonymous"
					src={selectedSound.audioUrl}
					onEnded={() => stopRecording()}
				/>
			)}

			{/* Sound Picker Overlay */}
			{showSoundPicker && (
				<div className="absolute inset-0 z-40 bg-black/90 flex flex-col">
					<div className="flex items-center justify-between p-4 border-b border-gray-800">
						<h3 className="text-white font-bold text-lg">Pick a Sound</h3>
						<button onClick={() => {
							setShowSoundPicker(false);
							// Stop any preview when closing
							if (previewAudioRef.current) {
								previewAudioRef.current.pause();
								previewAudioRef.current = null;
								setPreviewingSound(null);
							}
						}} className="text-white p-2">
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
						</button>
					</div>
					<div className="flex-1 overflow-y-auto p-4 space-y-2">
						{MOCK_SOUNDS.map(sound => (
							<div
								key={sound.id}
								className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 transition-colors group"
							>
								<div className="flex items-center space-x-3 flex-1 min-w-0">
									{/* Preview button */}
									<button
										onClick={(e) => {
											e.stopPropagation();
											handlePreviewSound(sound);
										}}
										className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${previewingSound?.id === sound.id
											? 'bg-red-500 text-white'
											: 'bg-gray-700 text-white hover:bg-gray-600'
											}`}
									>
										{previewingSound?.id === sound.id ? (
											<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
												<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
											</svg>
										) : (
											<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
												<path d="M8 5v14l11-7z" />
											</svg>
										)}
									</button>
									<button
										onClick={() => {
											// Stop preview when selecting
											if (previewAudioRef.current) {
												previewAudioRef.current.pause();
												previewAudioRef.current = null;
												setPreviewingSound(null);
											}
											setSelectedSound(sound);
											setShowSoundPicker(false);
										}}
										className="flex-1 text-left min-w-0"
									>
										<p className="text-white font-medium truncate">{sound.name}</p>
										<p className="text-gray-400 text-xs">{sound.duration}s</p>
									</button>
								</div>
								{selectedSound?.id === sound.id && (
									<div className="text-red-500 ml-2">
										<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* Audio Trimmer Component */}
			{showTrimmer && selectedSound && (
				<AudioTrimmer
					audioUrl={selectedSound.audioUrl}
					duration={selectedSound.duration}
					initialStartTime={audioStartTime}
					onComplete={({ startTime, endTime }) => {
						setAudioStartTime(startTime);
						setAudioEndTime(endTime);
						setShowTrimmer(false);
					}}
					onCancel={() => setShowTrimmer(false)}
				/>
			)}

			{/* Speed Picker Overlay */}
			{showSpeedPicker && (
				<div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center" onClick={() => setShowSpeedPicker(false)}>
					<div className="bg-gray-900 rounded-2xl p-6 mx-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
						<h3 className="text-white font-bold text-lg mb-4 text-center">Recording Speed</h3>
						<div className="flex justify-center gap-2">
							{SPEED_OPTIONS.map((option) => (
								<button
									key={option.value}
									onClick={() => {
										setRecordingSpeed(option.value);
										setShowSpeedPicker(false);
									}}
									className={`px-4 py-3 rounded-xl font-medium transition-all ${recordingSpeed === option.value
										? 'bg-pink-500 text-white scale-105'
										: 'bg-gray-800 text-gray-300 hover:bg-gray-700'
										}`}
								>
									{option.label}
								</button>
							))}
						</div>
						<p className="text-gray-400 text-xs text-center mt-4">
							{recordingSpeed < 1 ? 'Slow motion effect' : recordingSpeed > 1 ? 'Fast motion effect' : 'Normal speed'}
						</p>
					</div>
				</div>
			)}

			{/* Zoom Slider Overlay */}
			{showZoomSlider && zoomCapabilities.max > 1 && (
				<div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
					<div
						className="absolute inset-0 pointer-events-auto"
						onClick={() => setShowZoomSlider(false)}
					/>
					<div className="absolute right-16 top-1/2 transform -translate-y-1/2 pointer-events-auto">
						<div className="bg-black/70 backdrop-blur-md rounded-full p-3 flex flex-col items-center">
							<span className="text-white text-xs mb-2 font-medium">{zoomLevel.toFixed(1)}x</span>
							<input
								type="range"
								min={zoomCapabilities.min}
								max={zoomCapabilities.max}
								step={zoomCapabilities.step}
								value={zoomLevel}
								onChange={handleZoomChange}
								className="h-32 w-2 appearance-none bg-gray-600 rounded-full cursor-pointer accent-blue-500"
								style={{
									writingMode: 'vertical-lr',
									direction: 'rtl',
								}}
							/>
							<div className="flex flex-col items-center mt-2 text-white text-xs">
								<span>{zoomCapabilities.max.toFixed(1)}x</span>
								<svg className="w-4 h-4 my-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
								</svg>
								<span>{zoomCapabilities.min.toFixed(1)}x</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Recording controls */}
			<RecordingControls
				isRecording={isRecording}
				onStartRecording={handleStartRecording}
				onStopRecording={stopRecording}
				recordingDuration={recordingDuration}
				maxDuration={maxDuration}
			/>

			{/* Error display */}
			{recordingError && (
				<div className="absolute bottom-32 left-4 right-4 z-10 bg-red-500/80 px-4 py-2 rounded-lg">
					<p className="text-white text-center text-sm">{recordingError}</p>
				</div>
			)}
		</div>
	);
}
