import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { conversationId } = params;

    // Verify the conversation exists and that the current user is a participant.
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { id: session.user.id } },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { message: "Conversation not found or access denied." },
        { status: 404 }
      );
    }

    // Delete the conversation.
    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return NextResponse.json(
      { message: "Conversation deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error deleting conversation:", error);
    return NextResponse.json(
      {
        message: "Internal server error deleting conversation.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
