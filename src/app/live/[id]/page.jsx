// src/app/live/[id]/page.jsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LiveStreamView from '../../../components/live/LiveStreamView';
import LiveComments from '../../../components/live/LiveComments';
import ConnectifyLogo from "@/components/ConnectifyLogo";

export default function WatchStreamPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const params = useParams();
	const streamId = params.id;
	const queryClient = useQueryClient();
	const [showComments, setShowComments] = useState(true);

	const { data: streamData, isLoading, isError } = useQuery({
		queryKey: ['liveStream', streamId],
		queryFn: async () => {
			const res = await fetch('/api/live?status=all');
			if (!res.ok) throw new Error('Failed to fetch stream');
			const data = await res.json();
			const stream = data.streams.find(s => s.id === streamId);
			if (!stream) throw new Error('Stream not found');
			return stream;
		},
		refetchInterval: 5000,
		enabled: !!streamId,
	});

	// Track viewer join/leave
	useEffect(() => {
		if (!streamId || !session?.user?.id) return;

		// Increment viewer count on join
		fetch('/api/live', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				streamId,
				action: 'updateViewers',
				viewerDelta: 1,
			}),
		});

		// Decrement on leave
		return () => {
			fetch('/api/live', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					streamId,
					action: 'updateViewers',
					viewerDelta: -1,
				}),
			});
		};
	}, [streamId, session?.user?.id]);

	useEffect(() => {
		if (status === "loading") return;
		if (status === "unauthenticated") {
			router.push("/auth/login");
		}
	}, [status, router]);

	if (status === "loading" || isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-black">
				<ConnectifyLogo width={200} height={200} className="animate-pulse" />
			</div>
		);
	}

	if (isError || !streamData) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
				<p className="text-xl mb-4">Stream not found or has ended</p>
				<button
					onClick={() => router.push('/live')}
					className="px-6 py-3 bg-white text-black rounded-full font-medium"
				>
					Back to Live
				</button>
			</div>
		);
	}

	return (
		<div className="h-screen w-full bg-black flex flex-col md:flex-row">
			{/* Video player */}
			<div className="flex-1 relative">
				<LiveStreamView
					stream={streamData}
					onClose={() => router.push('/live')}
				/>
			</div>

			{/* Comments sidebar (desktop) / bottom sheet (mobile) */}
			<div className={`
				md:w-80 md:h-full
				fixed md:relative bottom-0 left-0 right-0
				${showComments ? 'h-1/2' : 'h-12'}
				md:h-full
				transition-all duration-300
				z-20
			`}>
				<LiveComments
					streamId={streamId}
					isExpanded={showComments}
					onToggle={() => setShowComments(!showComments)}
					sessionUserId={session?.user?.id}
				/>
			</div>
		</div>
	);
}
