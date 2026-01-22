import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // If Pusher is not configured, just return success silently
    if (!pusherServer) {
      return NextResponse.json({ success: true });
    }

    const userId = session.user.id;
    const { conversationId } = await params;
    const { isTyping } = await request.json();

    // Verify participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) {
      return NextResponse.json({ message: "Not a participant" }, { status: 403 });
    }

    // Get other participants
    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId }, leftAt: null },
      select: { userId: true },
    });

    // Trigger typing event to other participants (non-blocking)
    if (others.length > 0) {
      Promise.all(
        others.map((p) =>
          pusherServer.trigger(`private-user-${p.userId}`, "user-typing", {
            conversationId,
            user: { id: userId, name: session.user.name },
            isTyping,
          })
        )
      ).catch((err) => console.error("[Typing] Pusher error:", err));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Typing API error:", error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
