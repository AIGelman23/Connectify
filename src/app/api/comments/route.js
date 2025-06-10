// src/app/api/comments/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { postId, content } = await request.json();
    if (!postId || !content || content.trim() === "") {
      return NextResponse.json(
        { message: "Post ID and non-empty comment content are required." },
        { status: 400 }
      );
    }

    // Create a comment on the given post
    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: session.user.id,
        postId,
      },
    });

    // Increment the commentsCount of the associated post.
    await prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    return NextResponse.json(
      { message: "Comment added successfully.", comment },
      { status: 201 }
    );
  } catch (error) {
    console.error("API Error adding comment:", error);
    return NextResponse.json(
      {
        message: "Internal server error adding comment.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
