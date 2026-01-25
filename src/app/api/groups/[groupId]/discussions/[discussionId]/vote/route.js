import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// Vote on a discussion
export async function POST(request, context) {
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

    // Check if user is a member
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership) {
      return NextResponse.json(
        { message: "You must be a member to vote." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { voteType } = body;

    if (!["up", "down"].includes(voteType)) {
      return NextResponse.json(
        { message: "Invalid vote type." },
        { status: 400 }
      );
    }

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

    // Check for existing vote
    const existingVote = await prisma.groupDiscussionVote.findUnique({
      where: { discussionId_userId: { discussionId, userId } },
    });

    let newUserVote = voteType;
    let upvoteDelta = 0;
    let downvoteDelta = 0;

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Remove vote (toggle off)
        await prisma.groupDiscussionVote.delete({
          where: { id: existingVote.id },
        });
        newUserVote = null;
        if (voteType === "up") upvoteDelta = -1;
        else downvoteDelta = -1;
      } else {
        // Change vote
        await prisma.groupDiscussionVote.update({
          where: { id: existingVote.id },
          data: { voteType },
        });
        if (voteType === "up") {
          upvoteDelta = 1;
          downvoteDelta = -1;
        } else {
          upvoteDelta = -1;
          downvoteDelta = 1;
        }
      }
    } else {
      // Create new vote
      await prisma.groupDiscussionVote.create({
        data: { discussionId, userId, voteType },
      });
      if (voteType === "up") upvoteDelta = 1;
      else downvoteDelta = 1;
    }

    // Update discussion counts
    const updatedDiscussion = await prisma.groupDiscussion.update({
      where: { id: discussionId },
      data: {
        upvotes: { increment: upvoteDelta },
        downvotes: { increment: downvoteDelta },
      },
    });

    return NextResponse.json({
      upvotes: updatedDiscussion.upvotes,
      downvotes: updatedDiscussion.downvotes,
      userVote: newUserVote,
    });
  } catch (error) {
    console.error("Error voting:", error);
    return NextResponse.json(
      { message: "Failed to vote.", error: error.message },
      { status: 500 }
    );
  }
}
