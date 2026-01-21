// src/app/reels/page.jsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from '../../components/NavBar';
import ReelsFeed from '../../components/reels/ReelsFeed';
import ConnectifyLogo from "@/components/ConnectifyLogo";

export default function ReelsPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (status === "loading") return;
		if (status === "unauthenticated") {
			router.push("/auth/login");
			return;
		}
		setIsLoading(false);
	}, [status, router]);

	if (status === "loading" || isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-black">
				<ConnectifyLogo width={200} height={200} className="animate-pulse" />
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-black">
			{/* Hide navbar on mobile for immersive experience */}
			<div className="hidden md:block">
				<Navbar session={session} router={router} />
			</div>
			<main className="flex-1 relative">
				<ReelsFeed sessionUserId={session?.user?.id} />

				{/* Create Reel Button */}
				<button
					onClick={() => router.push('/reels/create')}
					className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 w-14 h-14 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
					aria-label="Create Reel"
				>
					<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
				</button>

				{/* Mobile back button */}
				<button
					onClick={() => router.push('/dashboard')}
					className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
					aria-label="Go back"
				>
					<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
				</button>
			</main>
		</div>
	);
}
