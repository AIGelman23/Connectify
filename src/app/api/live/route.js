// src/app/api/live/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createLiveStream, generateStreamKey } from "@/lib/live/mux-client";

export async function GET(request) {
	try {
		const session = await getServerSession(authOptions);

		if (!session || !session.user?.id) {
			return NextResponse.json(
				{ message: "Unauthorized. Please log in." },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status") || "active";

		// Fetch live streams
		const streams = await prisma.liveStream.findMany({
			where: status === "active" ? { status: "active" } : {},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						image: true,
						profile: {
							select: {
								headline: true,
								profilePictureUrl: true,
							},
						},
					},
				},
				_count: {
					select: {
						comments: true,
					},
				},
			},
			orderBy: [
				{ viewerCount: "desc" },
				{ startedAt: "desc" },
			],
			take: 20,
		});

		const formattedStreams = streams.map((stream) => ({
			id: stream.id,
			title: stream.title,
			status: stream.status,
			playbackId: stream.playbackId,
			viewerCount: stream.viewerCount,
			startedAt: stream.startedAt,
			commentsCount: stream._count.comments,
			user: {
				id: stream.user.id,
				name: stream.user.name,
				imageUrl:
					stream.user.profile?.profilePictureUrl ||
					stream.user.image ||
					`https://placehold.co/40x40/A78BFA/ffffff?text=${
						stream.user.name ? stream.user.name[0].toUpperCase() : "U"
					}`,
				headline: stream.user.profile?.headline || "",
			},
		}));

		return NextResponse.json({ streams: formattedStreams }, { status: 200 });
	} catch (error) {
		console.error("Error fetching live streams:", error);
		return NextResponse.json(
			{ message: "Failed to fetch live streams.", error: error.message },
			{ status: 500 }
		);
	}
}

export async function POST(request) {
	try {
		const session = await getServerSession(authOptions);

		if (!session || !session.user?.id) {
			return NextResponse.json(
				{ message: "Unauthorized. Please log in." },
				{ status: 401 }
			);
		}

		const currentUser = await prisma.user.findUnique({
			where: { id: session.user.id },
			select: { isBanned: true },
		});

		if (currentUser?.isBanned) {
			return NextResponse.json(
				{ message: "You are banned from performing this action." },
				{ status: 403 }
			);
		}

		// Check if user already has an active stream
		const existingStream = await prisma.liveStream.findFirst({
			where: {
				userId: session.user.id,
				status: { in: ["idle", "active"] },
			},
		});

		if (existingStream) {
			return NextResponse.json(
				{
					message: "You already have an active stream.",
					stream: existingStream,
				},
				{ status: 400 }
			);
		}

		const body = await request.json();
		const { title } = body;

		if (!title || title.trim().length === 0) {
			return NextResponse.json(
				{ message: "Stream title is required." },
				{ status: 400 }
			);
		}

		// Create stream with Mux (or mock in development)
		const muxStream = await createLiveStream();

		// Create stream in database
		const stream = await prisma.liveStream.create({
			data: {
				userId: session.user.id,
				title: title.trim(),
				streamKey: muxStream.streamKey,
				playbackId: muxStream.playbackId,
				status: "idle",
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						image: true,
						profile: {
							select: {
								headline: true,
								profilePictureUrl: true,
							},
						},
					},
				},
			},
		});

		return NextResponse.json(
			{
				stream: {
					id: stream.id,
					title: stream.title,
					streamKey: stream.streamKey,
					playbackId: stream.playbackId,
					rtmpUrl: muxStream.rtmpUrl,
					status: stream.status,
				},
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Error creating live stream:", error);
		return NextResponse.json(
			{ message: "Failed to create live stream.", error: error.message },
			{ status: 500 }
		);
	}
}

export async function PATCH(request) {
	try {
		const session = await getServerSession(authOptions);

		if (!session || !session.user?.id) {
			return NextResponse.json(
				{ message: "Unauthorized. Please log in." },
				{ status: 401 }
			);
		}

		const body = await request.json();
		const { streamId, action, viewerDelta } = body;

		if (!streamId) {
			return NextResponse.json(
				{ message: "Stream ID is required." },
				{ status: 400 }
			);
		}

		const stream = await prisma.liveStream.findUnique({
			where: { id: streamId },
		});

		if (!stream) {
			return NextResponse.json(
				{ message: "Stream not found." },
				{ status: 404 }
			);
		}

		if (action === "start") {
			// Only owner can start
			if (stream.userId !== session.user.id) {
				return NextResponse.json(
					{ message: "Not authorized." },
					{ status: 403 }
				);
			}

			await prisma.liveStream.update({
				where: { id: streamId },
				data: {
					status: "active",
					startedAt: new Date(),
				},
			});
		} else if (action === "end") {
			// Only owner can end
			if (stream.userId !== session.user.id) {
				return NextResponse.json(
					{ message: "Not authorized." },
					{ status: 403 }
				);
			}

			await prisma.liveStream.update({
				where: { id: streamId },
				data: {
					status: "ended",
					endedAt: new Date(),
				},
			});
		} else if (action === "updateViewers") {
			// Update viewer count
			await prisma.liveStream.update({
				where: { id: streamId },
				data: {
					viewerCount: {
						increment: viewerDelta || 0,
					},
				},
			});
		}

		const updatedStream = await prisma.liveStream.findUnique({
			where: { id: streamId },
		});

		return NextResponse.json(
			{ stream: updatedStream },
			{ status: 200 }
		);
	} catch (error) {
		console.error("Error updating live stream:", error);
		return NextResponse.json(
			{ message: "Failed to update live stream.", error: error.message },
			{ status: 500 }
		);
	}
}
