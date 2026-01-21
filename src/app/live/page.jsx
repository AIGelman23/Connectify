// src/app/live/page.jsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Navbar from '../../components/NavBar';
import ConnectifyLogo from "@/components/ConnectifyLogo";

export default function LivePage() {
	const { data: session, status } = useSession();
	const router = useRouter();

	const { data, isLoading, isError } = useQuery({
		queryKey: ['liveStreams'],
		queryFn: async () => {
			const res = await fetch('/api/live?status=active');
			if (!res.ok) throw new Error('Failed to fetch streams');
			return res.json();
		},
		refetchInterval: 10000, // Refresh every 10 seconds
	});

	const streams = data?.streams || [];

	useEffect(() => {
		if (status === "loading") return;
		if (status === "unauthenticated") {
			router.push("/auth/login");
		}
	}, [status, router]);

	if (status === "loading" || isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
				<ConnectifyLogo width={200} height={200} className="animate-pulse" />
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-gray-100 dark:bg-slate-900">
			<Navbar session={session} router={router} />

			<main className="flex-1 max-w-6xl mx-auto py-8 px-4 w-full">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						Live Now
					</h1>
					<button
						onClick={() => router.push('/live/broadcast')}
						className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
					>
						<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
							<circle cx="12" cy="12" r="10" />
						</svg>
						<span>Go Live</span>
					</button>
				</div>

				{isError && (
					<div className="text-center py-12">
						<p className="text-red-500">Failed to load live streams.</p>
					</div>
				)}

				{streams.length === 0 && !isError ? (
					<div className="text-center py-16">
						<svg className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
						</svg>
						<p className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">
							No one is live right now
						</p>
						<p className="text-gray-500 dark:text-gray-500 mb-6">
							Be the first to go live and connect with your network!
						</p>
						<button
							onClick={() => router.push('/live/broadcast')}
							className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
						>
							Start Streaming
						</button>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{streams.map((stream) => (
							<StreamCard
								key={stream.id}
								stream={stream}
								onClick={() => router.push(`/live/${stream.id}`)}
							/>
						))}
					</div>
				)}
			</main>
		</div>
	);
}

function StreamCard({ stream, onClick }) {
	return (
		<button
			onClick={onClick}
			className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left w-full"
		>
			{/* Thumbnail/Preview */}
			<div className="relative aspect-video bg-gray-900">
				<div className="absolute inset-0 flex items-center justify-center">
					<svg className="w-16 h-16 text-white/30" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
				</div>

				{/* Live badge */}
				<div className="absolute top-3 left-3 flex items-center space-x-2">
					<div className="flex items-center space-x-1 px-2 py-1 bg-red-500 rounded text-white text-xs font-medium">
						<div className="w-2 h-2 bg-white rounded-full animate-pulse" />
						<span>LIVE</span>
					</div>
				</div>

				{/* Viewer count */}
				<div className="absolute bottom-3 right-3 flex items-center space-x-1 px-2 py-1 bg-black/60 rounded text-white text-xs">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
					</svg>
					<span>{stream.viewerCount}</span>
				</div>
			</div>

			{/* Stream info */}
			<div className="p-4">
				<div className="flex items-start space-x-3">
					<img
						src={stream.user.imageUrl}
						alt={stream.user.name}
						className="w-10 h-10 rounded-full object-cover"
					/>
					<div className="flex-1 min-w-0">
						<h3 className="font-medium text-gray-900 dark:text-white truncate">
							{stream.title}
						</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400 truncate">
							{stream.user.name}
						</p>
					</div>
				</div>
			</div>
		</button>
	);
}
