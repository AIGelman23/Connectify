import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id, conversationId, senderId, content, createdAt } =
      await request.json();

    const newMsg = await prisma.message.create({
      data: {
        id,
        conversationId,
        senderId,
        content,
        createdAt: new Date(createdAt),
      },
    });

    return NextResponse.json(
      { message: "Message saved", messageData: newMsg },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving message:", error);
    return NextResponse.json(
      { message: "Error saving message", error: error.message },
      { status: 500 }
    );
  }
}
