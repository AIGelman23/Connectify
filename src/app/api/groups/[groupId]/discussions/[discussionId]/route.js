import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// Delete a discussion
export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { groupId, discussionId } = await context.params;
    const userId = session.user.id;

    // Get the discussion
    const discussion = await prisma.groupDiscussion.findUnique({
      where: { id: discussionId },
    });

    if (!discussion || discussion.groupId !== groupId) {
      return NextResponse.json(
        { message: "Discussion not found." },
        { status: 404 }
      );
    }

    // Check if user is author or admin
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    const isAuthor = discussion.authorId === userId;
    const isAdmin = membership?.role === "ADMIN";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { message: "You can only delete your own discussions." },
        { status: 403 }
      );
    }

    await prisma.groupDiscussion.delete({
      where: { id: discussionId },
    });

    return NextResponse.json({ message: "Discussion deleted." });
  } catch (error) {
    console.error("Error deleting discussion:", error);
    return NextResponse.json(
      { message: "Failed to delete discussion.", error: error.message },
      { status: 500 }
    );
  }
}
