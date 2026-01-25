import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// Approve or decline a join request
export async function PATCH(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { groupId, requestId } = await context.params;
    const userId = session.user.id;

    // Check if user is admin/moderator
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership || !["ADMIN", "MODERATOR"].includes(membership.role)) {
      return NextResponse.json(
        { message: "Only admins and moderators can handle join requests." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body; // "approve" or "decline"

    if (!["approve", "decline"].includes(action)) {
      return NextResponse.json(
        { message: "Invalid action. Use 'approve' or 'decline'." },
        { status: 400 }
      );
    }

    // Get the request
    const joinRequest = await prisma.groupJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!joinRequest || joinRequest.groupId !== groupId) {
      return NextResponse.json(
        { message: "Join request not found." },
        { status: 404 }
      );
    }

    if (joinRequest.status !== "PENDING") {
      return NextResponse.json(
        { message: "This request has already been processed." },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Add user to group and update request status
      await prisma.$transaction([
        prisma.groupMember.create({
          data: {
            groupId,
            userId: joinRequest.userId,
            role: "MEMBER",
          },
        }),
        prisma.groupJoinRequest.update({
          where: { id: requestId },
          data: { status: "APPROVED" },
        }),
      ]);

      return NextResponse.json({ message: "Request approved. User added to group." });
    } else {
      // Decline the request
      await prisma.groupJoinRequest.update({
        where: { id: requestId },
        data: { status: "DECLINED" },
      });

      return NextResponse.json({ message: "Request declined." });
    }
  } catch (error) {
    console.error("Error handling join request:", error);
    return NextResponse.json(
      { message: "Failed to process join request.", error: error.message },
      { status: 500 }
    );
  }
}
