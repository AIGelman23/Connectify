// src/app/api/friends/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Find all accepted connections for the current user
    const connections = await prisma.connectionRequest.findMany({
      where: {
        OR: [
          { senderId: userId, status: "ACCEPTED" },
          { receiverId: userId, status: "ACCEPTED" },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            profile: {
              select: {
                headline: true,
                profilePictureUrl: true,
              },
            },
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // Format the connections into a friends list
    const friends = connections.map((conn) => {
      // Determine if the friend is the sender or receiver
      const friend = conn.senderId === userId ? conn.receiver : conn.sender;

      return {
        id: friend.id,
        name: friend.name,
        email: friend.email,
        imageUrl: friend.profile?.profilePictureUrl || friend.image,
        headline: friend.profile?.headline || "",
        profile: {
          profilePictureUrl: friend.profile?.profilePictureUrl || null,
        },
      };
    });

    return NextResponse.json({ friends }, { status: 200 });
  } catch (error) {
    console.error("API Error fetching friends:", error);
    return NextResponse.json(
      { message: "Failed to load friends data.", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request) {
  try {
    // ...existing code commented out...
    return NextResponse.json(
      { message: "Friends POST handler (testing prisma import)." },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}
