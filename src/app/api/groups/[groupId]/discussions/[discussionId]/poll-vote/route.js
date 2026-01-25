import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { discussionId } = params;
  const { optionId } = await req.json();
  const userId = session.user.id;

  if (!optionId) {
    return NextResponse.json({ error: "Option ID is required" }, { status: 400 });
  }

  try {
    // Check if poll has expired
    const discussion = await prisma.groupDiscussion.findUnique({
      where: { id: discussionId },
      select: { expiresAt: true },
    });

    if (discussion?.expiresAt && new Date() > new Date(discussion.expiresAt)) {
      return NextResponse.json({ error: "Poll has expired" }, { status: 400 });
    }

    // Check for existing vote
    const existingVote = await prisma.groupDiscussionPollVote.findUnique({
      where: {
        discussionId_userId: { discussionId, userId },
      },
    });

    if (existingVote) {
      // Update existing vote
      if (existingVote.optionId !== optionId) {
        await prisma.groupDiscussionPollVote.update({
          where: { id: existingVote.id },
          data: { optionId },
        });
      }
    } else {
      // Create new vote
      await prisma.groupDiscussionPollVote.create({
        data: {
          discussionId,
          userId,
          optionId,
        },
      });
    }

    // Fetch updated poll options with counts
    const pollOptions = await prisma.groupDiscussionPollOption.findMany({
      where: { discussionId },
      include: {
        _count: {
          select: { votes: true },
        },
      },
    });

    return NextResponse.json({
      message: "Vote recorded",
      pollOptions: pollOptions.map((opt) => ({
        id: opt.id,
        text: opt.text,
        count: opt._count?.votes || 0,
      })),
      userPollVote: optionId,
    });
  } catch (error) {
    console.error("Error voting on poll:", error);
    return NextResponse.json(
      { error: "Failed to record vote" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { discussionId } = params;
  const userId = session.user.id;

  try {
    const existingVote = await prisma.groupDiscussionPollVote.findUnique({
      where: {
        discussionId_userId: { discussionId, userId },
      },
    });

    if (existingVote) {
      await prisma.groupDiscussionPollVote.delete({
        where: { id: existingVote.id },
      });
    }

    // Fetch updated poll options with counts
    const pollOptions = await prisma.groupDiscussionPollOption.findMany({
      where: { discussionId },
      include: {
        _count: {
          select: { votes: true },
        },
      },
    });

    return NextResponse.json({
      message: "Vote retracted",
      pollOptions: pollOptions.map((opt) => ({
        id: opt.id,
        text: opt.text,
        count: opt._count?.votes || 0,
      })),
      userPollVote: null,
    });
  } catch (error) {
    console.error("Error retracting vote:", error);
    return NextResponse.json(
      { error: "Failed to retract vote" },
      { status: 500 }
    );
  }
}
