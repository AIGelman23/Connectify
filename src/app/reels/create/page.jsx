// src/app/reels/create/page.jsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from '../../../components/NavBar';
import VideoRecorder from '../../../components/recording/VideoRecorder';
import RecordingPreview from '../../../components/recording/RecordingPreview';
import VideoTrimmer from '../../../components/effects/VideoTrimmer';
import ConnectifyLogo from "@/components/ConnectifyLogo";
import { trimVideo } from '../../../lib/video/trim-video';

export default function CreateReelPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);
	const [recordedBlob, setRecordedBlob] = useState(null);
	const [trimmedBlob, setTrimmedBlob] = useState(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isTrimming, setIsTrimming] = useState(false);
	const [uploadError, setUploadError] = useState(null);
	const [step, setStep] = useState('record'); // 'record' | 'preview' | 'trim' | 'details'
	const [caption, setCaption] = useState('');

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

		setIsUploading(true);
		setUploadError(null);

		try {
			// First upload the video file
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
			const reelRes = await fetch('/api/reels', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: caption,
					videoUrl,
					isReel: true,
				}),
			});

			if (!reelRes.ok) {
				throw new Error('Failed to create reel');
			}

			router.push('/reels');
		} catch (err) {
			setUploadError(err.message || 'Failed to publish reel');
		} finally {
			setIsUploading(false);
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
							<div className="mb-6">
								<label className="block text-sm font-medium text-gray-300 mb-2">
									Caption
								</label>
								<textarea
									value={caption}
									onChange={(e) => setCaption(e.target.value)}
									placeholder="Write a caption..."
									className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
									rows={3}
									maxLength={500}
								/>
								<p className="text-right text-xs text-gray-500 mt-1">{caption.length}/500</p>
							</div>

							{uploadError && (
								<p className="text-red-500 text-sm mb-4 text-center">{uploadError}</p>
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
								<button
									onClick={handlePublish}
									disabled={isUploading}
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
							</div>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
