// src/app/api/presence/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

// GET /api/presence - Get presence status for users
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
    const userIds = searchParams.get("userIds");

    if (!userIds) {
      return NextResponse.json(
        { message: "userIds query parameter is required" },
        { status: 400 }
      );
    }

    const ids = userIds.split(",").filter(Boolean);

    const presences = await prisma.userPresence.findMany({
      where: {
        userId: { in: ids },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Create a map of presence data
    const presenceMap = {};
    presences.forEach((p) => {
      presenceMap[p.userId] = {
        isOnline: p.isOnline,
        lastSeenAt: p.lastSeenAt,
        user: p.user,
      };
    });

    // For users without presence records, return offline status
    ids.forEach((id) => {
      if (!presenceMap[id]) {
        presenceMap[id] = {
          isOnline: false,
          lastSeenAt: null,
          user: null,
        };
      }
    });

    return NextResponse.json({ presence: presenceMap });
  } catch (error) {
    console.error("API Error fetching presence:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/presence - Update own presence status
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { isOnline, socketId } = body;

    // Upsert presence record
    const presence = await prisma.userPresence.upsert({
      where: { userId },
      update: {
        isOnline: isOnline ?? true,
        lastSeenAt: new Date(),
        socketId: socketId || null,
      },
      create: {
        userId,
        isOnline: isOnline ?? true,
        socketId: socketId || null,
      },
    });

    // Broadcast presence change to all users in shared conversations
    const conversations = await prisma.conversationParticipant.findMany({
      where: { userId, leftAt: null },
      select: { conversationId: true },
    });

    const convIds = conversations.map((c) => c.conversationId);

    // Broadcast presence change (non-blocking - don't fail if Pusher has issues)
    if (convIds.length > 0) {
      try {
        // Get all other participants in those conversations
        const otherParticipants = await prisma.conversationParticipant.findMany({
          where: {
            conversationId: { in: convIds },
            userId: { not: userId },
            leftAt: null,
          },
          select: { userId: true },
          distinct: ["userId"],
        });

        // Broadcast to each unique user (fire and forget)
        if (pusherServer && otherParticipants.length > 0) {
          Promise.all(
            otherParticipants.map((p) =>
              pusherServer.trigger(`private-user-${p.userId}`, "presence-update", {
                userId,
                isOnline: presence.isOnline,
                lastSeenAt: presence.lastSeenAt,
              })
            )
          ).catch((err) => console.error("[Presence] Pusher broadcast error:", err));
        }
      } catch (broadcastErr) {
        console.error("[Presence] Error fetching participants for broadcast:", broadcastErr);
      }
    }

    return NextResponse.json({
      presence: {
        userId: presence.userId,
        isOnline: presence.isOnline,
        lastSeenAt: presence.lastSeenAt,
      },
    });
  } catch (error) {
    console.error("API Error updating presence:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/presence - Heartbeat to keep online status
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Update last seen time
    await prisma.userPresence.upsert({
      where: { userId },
      update: {
        lastSeenAt: new Date(),
        isOnline: true,
      },
      create: {
        userId,
        isOnline: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Error heartbeat:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}
