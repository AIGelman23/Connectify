import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    if (!groupId) {
      return NextResponse.json(
        { message: "Group ID is required." },
        { status: 400 }
      );
    }

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

    // Check if user is already a member
    const existingMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { message: "Already a member of this group." },
        { status: 400 }
      );
    }

    // For private groups, create a join request instead
    if (group.privacy === "Private") {
      // Check for existing pending request
      const existingRequest = await prisma.groupJoinRequest.findUnique({
        where: {
          groupId_userId: { groupId, userId: session.user.id },
        },
      });

      if (existingRequest) {
        if (existingRequest.status === "PENDING") {
          return NextResponse.json(
            { message: "You already have a pending request to join this group.", requestPending: true },
            { status: 200 }
          );
        }
        // Update declined request to pending
        await prisma.groupJoinRequest.update({
          where: { id: existingRequest.id },
          data: { status: "PENDING" },
        });
      } else {
        await prisma.groupJoinRequest.create({
          data: {
            groupId,
            userId: session.user.id,
          },
        });
      }

      return NextResponse.json(
        { message: "Join request submitted. Waiting for admin approval.", requestPending: true },
        { status: 200 }
      );
    }

    // Add user to group (public groups)
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: session.user.id,
        role: "MEMBER",
      },
    });

    return NextResponse.json(
      { message: "Successfully joined the group.", joined: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error joining group:", error);
    return NextResponse.json(
      { message: "Failed to join group.", error: error.message },
      { status: 500 }
    );
  }
}

// Leave group
export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { groupId } = await context.params;

    if (!groupId) {
      return NextResponse.json(
        { message: "Group ID is required." },
        { status: 400 }
      );
    }

    // Check if user is a member
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { message: "Not a member of this group." },
        { status: 400 }
      );
    }

    // Check if user is the only admin
    if (membership.role === "ADMIN") {
      const adminCount = await prisma.groupMember.count({
        where: {
          groupId,
          role: "ADMIN",
        },
      });

      if (adminCount === 1) {
        return NextResponse.json(
          { message: "Cannot leave group. You are the only admin. Transfer ownership or delete the group." },
          { status: 400 }
        );
      }
    }

    // Remove user from group
    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json(
      { message: "Successfully left the group." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error leaving group:", error);
    return NextResponse.json(
      { message: "Failed to leave group.", error: error.message },
      { status: 500 }
    );
  }
}
