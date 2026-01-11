import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
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

    const { replyId } = await request.json();
    if (!replyId) {
      return NextResponse.json(
        { message: "Reply ID is required." },
        { status: 400 }
      );
    }

    // Check if user already liked this reply
    const existingLike = await prisma.replyLike.findUnique({
      where: {
        replyId_userId: {
          replyId,
          userId: session.user.id,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json({ message: "Already liked." }, { status: 200 });
    }

    // Create the like
    await prisma.replyLike.create({
      data: {
        replyId,
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      { message: "Reply liked successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("API Error liking reply:", error);
    return NextResponse.json(
      { message: "Internal server error liking reply.", error: error.message },
      { status: 500 }
    );
  }
}
