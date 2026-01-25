// src/app/reels/create/page.jsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from '../../../components/NavBar';
import VideoRecorder from '../../../components/recording/VideoRecorder';
import RecordingPreview from '../../../components/recording/RecordingPreview';
import VideoTrimmer from '../../../components/effects/VideoTrimmer';
import SoundPicker from '../../../components/reels/SoundPicker';
import ConnectifyLogo from "@/components/ConnectifyLogo";
import { trimVideo } from '../../../lib/video/trim-video';
import { generateAndUploadThumbnail } from '../../../lib/thumbnail';

export default function CreateReelPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isLoading, setIsLoading] = useState(true);
	const [recordedBlob, setRecordedBlob] = useState(null);
	const [trimmedBlob, setTrimmedBlob] = useState(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isTrimming, setIsTrimming] = useState(false);
	const [uploadError, setUploadError] = useState(null);
	const [step, setStep] = useState('record'); // 'record' | 'preview' | 'trim' | 'details'
	const [caption, setCaption] = useState('');
	const [selectedSound, setSelectedSound] = useState(null);
	const [showSoundPicker, setShowSoundPicker] = useState(false);
	const [uploadProgress, setUploadProgress] = useState('');
	const [saveAsOriginalSound, setSaveAsOriginalSound] = useState(true); // Default to saving as original sound
	
	// Reel limit state
	const [reelLimit, setReelLimit] = useState(null);
	const [limitLoading, setLimitLoading] = useState(true);

	// Check for pre-selected sound from URL
	useEffect(() => {
		const soundId = searchParams.get('soundId');
		if (soundId) {
			// Fetch sound details
			fetch(`/api/sounds/${soundId}`)
				.then(res => res.json())
				.then(data => {
					if (data.sound) {
						setSelectedSound(data.sound);
					}
				})
				.catch(console.error);
		}
	}, [searchParams]);

	// Fetch reel limit on mount
	useEffect(() => {
		const fetchReelLimit = async () => {
			try {
				const res = await fetch('/api/reels/limit');
				if (res.ok) {
					const data = await res.json();
					setReelLimit(data);
				}
			} catch (error) {
				console.error('Failed to fetch reel limit:', error);
			} finally {
				setLimitLoading(false);
			}
		};

		if (status === 'authenticated') {
			fetchReelLimit();
		}
	}, [status]);

	useEffect(() => {
		if (status === "loading") return;
		if (status === "unauthenticated") {
			router.push("/auth/login");
			return;
		}
		setIsLoading(false);
	}, [status, router]);

	const handleRecordingComplete = useCallback((blob) => {
		setRecordedBlob(blob);
		setStep('preview');
	}, []);

	const handleRetake = useCallback(() => {
		setRecordedBlob(null);
		setTrimmedBlob(null);
		setStep('record');
		setCaption('');
	}, []);

	const handleProceedToTrim = useCallback(() => {
		setStep('trim');
	}, []);

	const handleSkipTrim = useCallback(() => {
		setTrimmedBlob(recordedBlob);
		setStep('details');
	}, [recordedBlob]);

	const handleTrimComplete = useCallback(async ({ startTime, endTime, duration }) => {
		// If no trimming needed (full video selected), skip processing
		if (startTime === 0 && recordedBlob) {
			// Get video duration to check if end matches
			const video = document.createElement('video');
			video.src = URL.createObjectURL(recordedBlob);
			await new Promise(resolve => {
				video.onloadedmetadata = resolve;
			});
			const originalDuration = video.duration;
			URL.revokeObjectURL(video.src);

			if (Math.abs(endTime - originalDuration) < 0.5) {
				// No trimming needed
				setTrimmedBlob(recordedBlob);
				setStep('details');
				return;
			}
		}

		setIsTrimming(true);
		try {
			const trimmed = await trimVideo(recordedBlob, startTime, endTime);
			setTrimmedBlob(trimmed);
			setStep('details');
		} catch (error) {
			console.error('Trimming failed:', error);
			setUploadError('Failed to trim video. Using original.');
			setTrimmedBlob(recordedBlob);
			setStep('details');
		} finally {
			setIsTrimming(false);
		}
	}, [recordedBlob]);

	const handleTrimCancel = useCallback(() => {
		setStep('preview');
	}, []);

	const handlePublish = async () => {
		const videoToUpload = trimmedBlob || recordedBlob;
		if (!videoToUpload) return;

		// Check if user can create more reels
		if (reelLimit && !reelLimit.limits.canCreate) {
			setUploadError(`You've reached your daily limit of ${reelLimit.limits.daily} reels. Upgrade to create more!`);
			return;
		}

		setIsUploading(true);
		setUploadError(null);
		setUploadProgress('Generating thumbnail...');

		try {
			// Generate and upload thumbnail first
			let thumbnailUrl = null;
			try {
				thumbnailUrl = await generateAndUploadThumbnail(videoToUpload, 0.5);
			} catch (thumbErr) {
				console.warn('Thumbnail generation failed, continuing without:', thumbErr);
			}

			// Upload the video file
			setUploadProgress('Uploading video...');
			const formData = new FormData();
			formData.append('file', videoToUpload, 'reel.webm');

			const uploadRes = await fetch('/api/upload', {
				method: 'POST',
				body: formData,
			});

			if (!uploadRes.ok) {
				throw new Error('Failed to upload video');
			}

			const uploadData = await uploadRes.json();
			const videoUrl = uploadData.url;

			// Create the reel post
			setUploadProgress('Publishing reel...');
			const reelRes = await fetch('/api/reels', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: caption,
					videoUrl,
					thumbnailUrl,
					soundId: selectedSound?.id || null,
					isReel: true,
					createOriginalSound: !selectedSound && saveAsOriginalSound, // Create original sound if no sound selected
				}),
			});

			const reelData = await reelRes.json();

			if (!reelRes.ok) {
				// Handle daily limit error
				if (reelData.code === 'DAILY_LIMIT_REACHED') {
					setUploadError(reelData.message);
					// Refetch limit to update UI
					const limitRes = await fetch('/api/reels/limit');
					if (limitRes.ok) {
						setReelLimit(await limitRes.json());
					}
					return;
				}
				throw new Error(reelData.message || 'Failed to create reel');
			}

			// Update local limit state with response data
			if (reelData.limits) {
				setReelLimit(prev => prev ? {
					...prev,
					limits: {
						...prev.limits,
						remaining: reelData.limits.remaining,
						used: prev.limits.used + 1,
						canCreate: reelData.limits.unlimited || reelData.limits.remaining > 0,
					}
				} : prev);
			}

			router.push('/reels');
		} catch (err) {
			setUploadError(err.message || 'Failed to publish reel');
		} finally {
			setIsUploading(false);
			setUploadProgress('');
		}
	};

	if (status === "loading" || isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-black">
				<ConnectifyLogo width={200} height={200} className="animate-pulse" />
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-black">
			<div className="hidden md:block">
				<Navbar session={session} router={router} />
			</div>

			<main className="flex-1 relative">
				{/* Back button */}
				<button
					onClick={() => {
						if (step === 'record') {
							router.push('/reels');
						} else if (step === 'preview') {
							handleRetake();
						} else if (step === 'trim') {
							setStep('preview');
						} else if (step === 'details') {
							setStep('trim');
						}
					}}
					className="fixed top-4 left-4 z-50 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
					aria-label="Go back"
				>
					<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
				</button>

				{/* Reel Limit Banner */}
				{!limitLoading && reelLimit && !reelLimit.limits.unlimited && (
					<div className="fixed top-4 right-4 z-50">
						<div className={`px-3 py-2 rounded-full backdrop-blur-sm text-sm font-medium flex items-center gap-2 ${
							reelLimit.limits.remaining === 0
								? 'bg-red-500/80 text-white'
								: reelLimit.limits.remaining <= 2
								? 'bg-yellow-500/80 text-black'
								: 'bg-black/50 text-white'
						}`}>
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
							</svg>
							{reelLimit.limits.remaining}/{reelLimit.limits.daily} reels left today
						</div>
					</div>
				)}

				{/* Limit Reached Overlay */}
				{!limitLoading && reelLimit && !reelLimit.limits.canCreate && step === 'record' && (
					<div className="fixed inset-0 z-40 bg-black/90 flex flex-col items-center justify-center px-6">
						<div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
							<svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
						<h2 className="text-2xl font-bold text-white mb-2 text-center">Daily Limit Reached</h2>
						<p className="text-gray-400 text-center mb-6">
							You've used all {reelLimit.limits.daily} reels for today.
							{reelLimit.nextTier && (
								<> Upgrade to {reelLimit.nextTier.name} for {reelLimit.nextTier.unlimited ? 'unlimited' : `${reelLimit.nextTier.reelsPerDay}`} reels/day.</>
							)}
						</p>
						<div className="flex gap-4">
							<button
								onClick={() => router.push('/reels')}
								className="px-6 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
							>
								Browse Reels
							</button>
							<Link
								href="/settings/subscription"
								className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
							>
								Upgrade Plan
							</Link>
						</div>
					</div>
				)}

				{step === 'record' && (
					<VideoRecorder onRecordingComplete={handleRecordingComplete} />
				)}

				{step === 'preview' && recordedBlob && (
					<RecordingPreview
						videoBlob={recordedBlob}
						onRetake={handleRetake}
						onProceed={handleProceedToTrim}
					/>
				)}

				{step === 'trim' && recordedBlob && (
					<>
						{isTrimming ? (
							<div className="min-h-screen flex flex-col items-center justify-center bg-black">
								<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
								<p className="text-white">Processing video...</p>
							</div>
						) : (
							<VideoTrimmer
								videoBlob={recordedBlob}
								onTrimComplete={handleTrimComplete}
								onCancel={handleTrimCancel}
							/>
						)}
						{/* Skip trim button */}
						{!isTrimming && (
							<button
								onClick={handleSkipTrim}
								className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 px-6 py-2 bg-gray-800/80 backdrop-blur-sm text-white rounded-full text-sm font-medium hover:bg-gray-700 transition-colors"
							>
								Skip Trim
							</button>
						)}
					</>
				)}

				{step === 'details' && (trimmedBlob || recordedBlob) && (
					<div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
						<div className="w-full max-w-md">
							<h2 className="text-2xl font-bold text-white mb-6 text-center">Add Details</h2>

							{/* Video preview thumbnail */}
							<div className="relative w-full aspect-[9/16] max-h-64 mx-auto mb-6 rounded-xl overflow-hidden bg-gray-900">
								<video
									src={URL.createObjectURL(trimmedBlob || recordedBlob)}
									className="w-full h-full object-cover"
									muted
								/>
								<div className="absolute inset-0 bg-black/30 flex items-center justify-center">
									<svg className="w-12 h-12 text-white/80" fill="currentColor" viewBox="0 0 24 24">
										<path d="M8 5v14l11-7z"/>
									</svg>
								</div>
							</div>

							{/* Caption input */}
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-300 mb-2">
									Caption
								</label>
								<textarea
									value={caption}
									onChange={(e) => setCaption(e.target.value)}
									placeholder="Write a caption... #hashtags work too!"
									className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
									rows={3}
									maxLength={500}
								/>
								<p className="text-right text-xs text-gray-500 mt-1">{caption.length}/500</p>
							</div>

							{/* Sound Selection */}
							<div className="mb-6">
								<label className="block text-sm font-medium text-gray-300 mb-2">
									Sound
								</label>
								<button
									onClick={() => setShowSoundPicker(true)}
									className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-left hover:bg-gray-750 transition-colors flex items-center justify-between"
								>
									{selectedSound ? (
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
												<svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
													<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
												</svg>
											</div>
											<div className="min-w-0">
												<p className="text-white text-sm font-medium truncate">{selectedSound.name}</p>
												<p className="text-gray-500 text-xs">{selectedSound.artist || 'Original sound'}</p>
											</div>
										</div>
									) : (
										<div className="flex items-center gap-3 text-gray-400">
											<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
											</svg>
											<span className="text-sm">Add a sound</span>
										</div>
									)}
									<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
									</svg>
								</button>
								{selectedSound && (
									<button
										onClick={() => setSelectedSound(null)}
										className="mt-2 text-xs text-red-400 hover:text-red-300"
									>
										Remove sound
									</button>
								)}
								
								{/* Original Sound Toggle - only show when no sound selected */}
								{!selectedSound && (
									<div className="mt-3 flex items-center gap-3">
										<button
											onClick={() => setSaveAsOriginalSound(!saveAsOriginalSound)}
											className={`relative w-10 h-6 rounded-full transition-colors ${
												saveAsOriginalSound ? 'bg-pink-500' : 'bg-gray-600'
											}`}
										>
											<span
												className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
													saveAsOriginalSound ? 'translate-x-5' : 'translate-x-1'
												}`}
											/>
										</button>
										<span className="text-sm text-gray-300">Save as Original Sound</span>
									</div>
								)}
							</div>

							{/* Reel Limit Info on Details Step */}
							{!limitLoading && reelLimit && !reelLimit.limits.unlimited && (
								<div className={`mb-4 p-3 rounded-xl ${
									reelLimit.limits.remaining === 0
										? 'bg-red-500/20 border border-red-500/30'
										: reelLimit.limits.remaining <= 2
										? 'bg-yellow-500/20 border border-yellow-500/30'
										: 'bg-gray-800 border border-gray-700'
								}`}>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<svg className={`w-4 h-4 ${
												reelLimit.limits.remaining === 0 ? 'text-red-400' :
												reelLimit.limits.remaining <= 2 ? 'text-yellow-400' : 'text-gray-400'
											}`} fill="currentColor" viewBox="0 0 24 24">
												<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
											</svg>
											<span className={`text-sm font-medium ${
												reelLimit.limits.remaining === 0 ? 'text-red-400' :
												reelLimit.limits.remaining <= 2 ? 'text-yellow-400' : 'text-gray-300'
											}`}>
												{reelLimit.limits.remaining === 0
													? 'No reels remaining today'
													: `${reelLimit.limits.remaining} reel${reelLimit.limits.remaining === 1 ? '' : 's'} remaining today`
												}
											</span>
										</div>
										{reelLimit.nextTier && (
											<Link
												href="/settings/subscription"
												className="text-xs text-pink-400 hover:text-pink-300 font-medium"
											>
												Upgrade
											</Link>
										)}
									</div>
									{reelLimit.limits.remaining <= 2 && reelLimit.nextTier && (
										<p className="text-xs text-gray-400 mt-2">
											Upgrade to {reelLimit.nextTier.name} for {reelLimit.nextTier.unlimited ? 'unlimited' : `${reelLimit.nextTier.reelsPerDay}`} reels/day
										</p>
									)}
								</div>
							)}

							{uploadError && (
								<p className="text-red-500 text-sm mb-4 text-center">{uploadError}</p>
							)}

							{/* Upload progress */}
							{isUploading && uploadProgress && (
								<p className="text-gray-400 text-sm mb-4 text-center">{uploadProgress}</p>
							)}

							{/* Action buttons */}
							<div className="flex gap-4">
								<button
									onClick={handleRetake}
									disabled={isUploading}
									className="flex-1 py-3 px-6 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
								>
									Retake
								</button>
								{reelLimit && !reelLimit.limits.canCreate ? (
									<Link
										href="/settings/subscription"
										className="flex-1 py-3 px-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-center"
									>
										Upgrade to Publish
									</Link>
								) : (
									<button
										onClick={handlePublish}
										disabled={isUploading || (reelLimit && !reelLimit.limits.canCreate)}
										className="flex-1 py-3 px-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
									>
										{isUploading ? (
											<>
												<svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
												Publishing...
											</>
										) : (
											'Publish'
										)}
									</button>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Sound Picker Modal */}
				<SoundPicker
					isOpen={showSoundPicker}
					onClose={() => setShowSoundPicker(false)}
					onSelect={setSelectedSound}
					selectedSound={selectedSound}
				/>
			</main>
		</div>
	);
}
