import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Add this debug log to check what authOptions is
console.log("authOptions type:", typeof authOptions);

export async function POST(request) {
  try {
    // If authOptions is a function, call it here:
    // const session = await getServerSession(authOptions());
    // Otherwise, keep as is:
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { postId, commentId, content } = await request.json();
    if (!postId || !commentId || !content || content.trim() === "") {
      return NextResponse.json(
        { message: "Post ID, Comment ID, and non-empty content are required." },
        { status: 400 }
      );
    }

    // Create a reply comment by setting parentCommentId to the original comment's ID.
    const reply = await prisma.comment.create({
      data: {
        content,
        authorId: session.user.id,
        postId,
        parentCommentId: commentId,
      },
    });

    // Increment the commentsCount of the associated post.
    await prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    return NextResponse.json(
      { message: "Reply added successfully.", reply },
      { status: 201 }
    );
  } catch (error) {
    console.error("API Error adding reply:", error);
    return NextResponse.json(
      { message: "Internal server error adding reply.", error: error.message },
      { status: 500 }
    );
  }
}
