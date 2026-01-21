// src/components/live/LiveStreamView.jsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { getPlaybackUrl } from '../../lib/live/mux-client';

export default function LiveStreamView({ stream, onClose }) {
	const videoRef = useRef(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !stream?.playbackId) return;

		const playbackUrl = getPlaybackUrl(stream.playbackId);

		// Try native HLS first (Safari)
		if (video.canPlayType('application/vnd.apple.mpegurl')) {
			video.src = playbackUrl;
			video.play().then(() => {
				setIsPlaying(true);
				setIsLoading(false);
			}).catch((err) => {
				console.error('Playback failed:', err);
				setError('Failed to play stream');
				setIsLoading(false);
			});
		} else {
			// Use HLS.js for other browsers
			import('hls.js').then(({ default: Hls }) => {
				if (Hls.isSupported()) {
					const hls = new Hls({
						lowLatencyMode: true,
						liveSyncDuration: 3,
						liveMaxLatencyDuration: 10,
					});

					hls.loadSource(playbackUrl);
					hls.attachMedia(video);

					hls.on(Hls.Events.MANIFEST_PARSED, () => {
						video.play().then(() => {
							setIsPlaying(true);
							setIsLoading(false);
						}).catch((err) => {
							console.error('Playback failed:', err);
							setIsLoading(false);
						});
					});

					hls.on(Hls.Events.ERROR, (event, data) => {
						if (data.fatal) {
							console.error('HLS fatal error:', data);
							setError('Stream connection lost');
							setIsLoading(false);
						}
					});

					return () => {
						hls.destroy();
					};
				} else {
					setError('HLS is not supported in this browser');
					setIsLoading(false);
				}
			}).catch(() => {
				// HLS.js not available, show placeholder
				setIsLoading(false);
			});
		}
	}, [stream?.playbackId]);

	return (
		<div className="relative w-full h-full bg-black">
			{/* Video player */}
			<video
				ref={videoRef}
				className="w-full h-full object-contain"
				playsInline
				muted={false}
			/>

			{/* Loading state */}
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
				</div>
			)}

			{/* Error state */}
			{error && (
				<div className="absolute inset-0 flex flex-col items-center justify-center text-white">
					<svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p className="text-lg">{error}</p>
				</div>
			)}

			{/* Stream info overlay */}
			<div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
				<div className="flex items-center justify-between">
					<button
						onClick={onClose}
						className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center"
					>
						<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
					</button>

					<div className="flex items-center space-x-3">
						{stream.status === 'active' && (
							<div className="flex items-center space-x-2 px-3 py-1.5 bg-red-500 rounded-full">
								<div className="w-2 h-2 bg-white rounded-full animate-pulse" />
								<span className="text-white text-sm font-medium">LIVE</span>
							</div>
						)}

						<div className="flex items-center space-x-1 px-3 py-1.5 bg-black/40 rounded-full">
							<svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
							</svg>
							<span className="text-white text-sm">{stream.viewerCount}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Streamer info */}
			<div className="absolute bottom-4 left-4 right-4">
				<div className="flex items-center space-x-3">
					<img
						src={stream.user.imageUrl}
						alt={stream.user.name}
						className="w-12 h-12 rounded-full border-2 border-white object-cover"
					/>
					<div>
						<p className="text-white font-semibold">{stream.user.name}</p>
						<p className="text-white/80 text-sm">{stream.title}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
