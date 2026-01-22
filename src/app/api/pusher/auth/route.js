import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

export async function POST(request) {
  try {
    if (!pusherServer) {
      console.error("[Pusher Auth] Pusher server not configured");
      return NextResponse.json(
        { message: "Pusher not configured" },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await request.formData();
    const socketId = data.get("socket_id");
    const channel = data.get("channel_name");

    // Authorize private and presence channels
    const authResponse = pusherServer.authorizeChannel(socketId, channel, {
      user_id: session.user.id,
      user_info: {
        name: session.user.name,
        image: session.user.image,
      },
    });

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json(
      { message: "Auth failed", error: error.message },
      { status: 500 }
    );
  }
}
