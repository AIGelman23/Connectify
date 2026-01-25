import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// Get pending join requests (admin only)
export async function GET(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { groupId } = await context.params;
    const userId = session.user.id;

    // Check if user is admin
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership || !["ADMIN", "MODERATOR"].includes(membership.role)) {
      return NextResponse.json(
        { message: "Only admins and moderators can view join requests." },
        { status: 403 }
      );
    }

    const requests = await prisma.groupJoinRequest.findMany({
      where: {
        groupId,
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        userId: r.user.id,
        userName: r.user.name,
        userImage: r.user.image,
        userEmail: r.user.email,
        message: r.message,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching join requests:", error);
    return NextResponse.json(
      { message: "Failed to fetch join requests.", error: error.message },
      { status: 500 }
    );
  }
}

// Create a join request (for private groups)
export async function POST(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { groupId } = await context.params;
    const userId = session.user.id;

    const body = await request.json().catch(() => ({}));
    const { message } = body;

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { message: "Already a member of this group." },
        { status: 400 }
      );
    }

    // Check for existing pending request
    const existingRequest = await prisma.groupJoinRequest.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "PENDING") {
        return NextResponse.json(
          { message: "You already have a pending request to join this group." },
          { status: 400 }
        );
      }
      // Update declined request to pending
      await prisma.groupJoinRequest.update({
        where: { id: existingRequest.id },
        data: { status: "PENDING", message: message || null },
      });
      return NextResponse.json({
        message: "Join request submitted.",
        requestPending: true,
      });
    }

    // Create new request
    await prisma.groupJoinRequest.create({
      data: {
        groupId,
        userId,
        message: message || null,
      },
    });

    return NextResponse.json({
      message: "Join request submitted.",
      requestPending: true,
    });
  } catch (error) {
    console.error("Error creating join request:", error);
    return NextResponse.json(
      { message: "Failed to submit join request.", error: error.message },
      { status: 500 }
    );
  }
}
