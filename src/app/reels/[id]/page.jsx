// src/app/reels/[id]/page.jsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from '../../../components/NavBar';
import SingleReelViewer from '../../../components/reels/SingleReelViewer';
import ConnectifyLogo from "@/components/ConnectifyLogo";

export default function SingleReelPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const params = useParams();
	const reelId = params.id;
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
			<div className="hidden md:block">
				<Navbar session={session} router={router} />
			</div>
			<main className="flex-1 relative">
				<SingleReelViewer reelId={reelId} sessionUserId={session?.user?.id} />
			</main>
		</div>
	);
}
