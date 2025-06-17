import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/friends?userId=...
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || session?.user?.id;

    if (!userId) {
      return NextResponse.json({ friends: [] }, { status: 200 });
    }

    // Find all accepted connections for the user
    const acceptedRequests = await prisma.connectionRequest.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: { select: { profilePictureUrl: true } },
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: { select: { profilePictureUrl: true } },
          },
        },
      },
    });

    // Extract unique friends (exclude self)
    const friendsMap = new Map();
    acceptedRequests.forEach((req) => {
      if (req.senderId !== userId) {
        friendsMap.set(req.sender.id, {
          id: req.sender.id,
          name: req.sender.name,
          imageUrl:
            req.sender.profile?.profilePictureUrl || req.sender.image || null,
        });
      }
      if (req.receiverId !== userId) {
        friendsMap.set(req.receiver.id, {
          id: req.receiver.id,
          name: req.receiver.name,
          imageUrl:
            req.receiver.profile?.profilePictureUrl ||
            req.receiver.image ||
            null,
        });
      }
    });

    const friends = Array.from(friendsMap.values());

    return NextResponse.json({ friends }, { status: 200 });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json(
      { friends: [], error: error.message },
      { status: 500 }
    );
  }
}
