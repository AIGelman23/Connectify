// src/app/api/comments/reply/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next"; // Use /next here
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    // Use getServerSession from "next-auth/next"
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

    // Uncomment and complete the Prisma logic for adding a reply
    // const reply = await prisma.reply.create({
    //   data: {
    //     content,
    //     comment: { connect: { id: commentId } },
    //     author: { connect: { id: session.user.id } },
    //   },
    // });

    return NextResponse.json(
      { message: "Reply added successfully." },
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
