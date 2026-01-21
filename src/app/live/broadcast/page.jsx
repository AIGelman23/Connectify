// src/app/live/broadcast/page.jsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import GoLiveModal from '../../../components/live/GoLiveModal';
import ConnectifyLogo from "@/components/ConnectifyLogo";

export default function BroadcastPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [stream, setStream] = useState(null);
	const [isLive, setIsLive] = useState(false);
	const [showSetup, setShowSetup] = useState(true);
	const [viewerCount, setViewerCount] = useState(0);
	const videoRef = useRef(null);
	const mediaStreamRef = useRef(null);

	const createStreamMutation = useMutation({
		mutationFn: async (title) => {
			const res = await fetch('/api/live', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title }),
			});
			if (!res.ok) throw new Error('Failed to create stream');
			return res.json();
		},
		onSuccess: (data) => {
			setStream(data.stream);
			setShowSetup(false);
			startCamera();
		},
	});

	const updateStreamMutation = useMutation({
		mutationFn: async ({ action }) => {
			const res = await fetch('/api/live', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					streamId: stream.id,
					action,
				}),
			});
			if (!res.ok) throw new Error('Failed to update stream');
			return res.json();
		},
		onSuccess: (data) => {
			if (data.stream) {
				setStream(data.stream);
			}
		},
	});

	const startCamera = async () => {
		try {
			const mediaStream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'user',
					width: { ideal: 1280 },
					height: { ideal: 720 },
				},
				audio: true,
			});

			mediaStreamRef.current = mediaStream;
			if (videoRef.current) {
				videoRef.current.srcObject = mediaStream;
			}
		} catch (err) {
			console.error('Failed to access camera:', err);
		}
	};

	const handleGoLive = () => {
		setIsLive(true);
		updateStreamMutation.mutate({ action: 'start' });
	};

	const handleEndStream = () => {
		setIsLive(false);
		updateStreamMutation.mutate({ action: 'end' });

		// Stop all tracks
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach(track => track.stop());
		}

		queryClient.invalidateQueries({ queryKey: ['liveStreams'] });
		router.push('/live');
	};

	useEffect(() => {
		if (status === "loading") return;
		if (status === "unauthenticated") {
			router.push("/auth/login");
		}
	}, [status, router]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (mediaStreamRef.current) {
				mediaStreamRef.current.getTracks().forEach(track => track.stop());
			}
		};
	}, []);

	// Fetch viewer count periodically
	useEffect(() => {
		if (!isLive || !stream?.id) return;

		const interval = setInterval(async () => {
			try {
				const res = await fetch('/api/live?status=all');
				if (res.ok) {
					const data = await res.json();
					const currentStream = data.streams.find(s => s.id === stream.id);
					if (currentStream) {
						setViewerCount(currentStream.viewerCount);
					}
				}
			} catch (err) {
				console.error('Failed to fetch viewer count:', err);
			}
		}, 5000);

		return () => clearInterval(interval);
	}, [isLive, stream?.id]);

	if (status === "loading") {
		return (
			<div className="min-h-screen flex items-center justify-center bg-black">
				<ConnectifyLogo width={200} height={200} className="animate-pulse" />
			</div>
		);
	}

	return (
		<div className="h-screen w-full bg-black relative">
			{/* Camera preview */}
			<video
				ref={videoRef}
				autoPlay
				playsInline
				muted
				className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
			/>

			{/* Gradient overlay */}
			<div className="absolute inset-0 pointer-events-none">
				<div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
				<div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
			</div>

			{/* Setup modal */}
			{showSetup && (
				<GoLiveModal
					onStart={(title) => createStreamMutation.mutate(title)}
					onCancel={() => router.push('/live')}
					isLoading={createStreamMutation.isPending}
				/>
			)}

			{/* Top bar */}
			{!showSetup && (
				<div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between">
					<button
						onClick={handleEndStream}
						className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center"
					>
						<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>

					<div className="flex items-center space-x-3">
						{isLive && (
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
							<span className="text-white text-sm">{viewerCount}</span>
						</div>
					</div>
				</div>
			)}

			{/* Stream title */}
			{!showSetup && stream && (
				<div className="absolute top-20 left-4 right-4 z-10">
					<p className="text-white font-medium text-lg">{stream.title}</p>
				</div>
			)}

			{/* Bottom controls */}
			{!showSetup && (
				<div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center">
					{!isLive ? (
						<button
							onClick={handleGoLive}
							className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-white font-bold text-lg hover:opacity-90 transition-opacity"
						>
							Go Live
						</button>
					) : (
						<button
							onClick={handleEndStream}
							className="px-8 py-4 bg-gray-800 rounded-full text-white font-bold text-lg hover:bg-gray-700 transition-colors"
						>
							End Stream
						</button>
					)}
				</div>
			)}

			{/* Stream key info (for debugging/OBS setup) */}
			{stream && !isLive && (
				<div className="absolute bottom-32 left-4 right-4 z-10 bg-black/60 rounded-lg p-4">
					<p className="text-white/60 text-xs mb-2">Stream Key (for OBS/external software):</p>
					<div className="flex items-center space-x-2">
						<code className="flex-1 text-white text-xs bg-black/40 px-3 py-2 rounded overflow-hidden overflow-ellipsis">
							{stream.streamKey}
						</code>
						<button
							onClick={() => navigator.clipboard.writeText(stream.streamKey)}
							className="px-3 py-2 bg-white/10 rounded text-white text-xs"
						>
							Copy
						</button>
					</div>
					<p className="text-white/40 text-xs mt-2">
						RTMP URL: rtmp://global-live.mux.com:5222/app
					</p>
				</div>
			)}
		</div>
	);
}
