import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// Update member role
export async function PATCH(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { groupId, memberId } = await context.params;
    const userId = session.user.id;

    // Check if current user is admin
    const currentUserMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!currentUserMembership || currentUserMembership.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Only admins can change member roles." },
        { status: 403 }
      );
    }

    // Get the target member
    const targetMember = await prisma.groupMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.groupId !== groupId) {
      return NextResponse.json(
        { message: "Member not found in this group." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!["ADMIN", "MODERATOR", "MEMBER"].includes(role)) {
      return NextResponse.json(
        { message: "Invalid role." },
        { status: 400 }
      );
    }

    // If demoting an admin, ensure there's at least one other admin
    if (targetMember.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await prisma.groupMember.count({
        where: { groupId, role: "ADMIN" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { message: "Cannot demote the only admin. Promote another member first." },
          { status: 400 }
        );
      }
    }

    const updatedMember = await prisma.groupMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({
      member: {
        id: updatedMember.id,
        userId: updatedMember.user.id,
        name: updatedMember.user.name,
        image: updatedMember.user.image,
        role: updatedMember.role,
        joinedAt: updatedMember.joinedAt,
      },
    });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { message: "Failed to update member role.", error: error.message },
      { status: 500 }
    );
  }
}

// Remove member from group
export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { groupId, memberId } = await context.params;
    const userId = session.user.id;

    // Check if current user is admin
    const currentUserMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!currentUserMembership || currentUserMembership.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Only admins can remove members." },
        { status: 403 }
      );
    }

    // Get the target member
    const targetMember = await prisma.groupMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.groupId !== groupId) {
      return NextResponse.json(
        { message: "Member not found in this group." },
        { status: 404 }
      );
    }

    // Can't remove yourself using this endpoint
    if (targetMember.userId === userId) {
      return NextResponse.json(
        { message: "Use the leave endpoint to remove yourself." },
        { status: 400 }
      );
    }

    // If removing an admin, ensure there's at least one other admin
    if (targetMember.role === "ADMIN") {
      const adminCount = await prisma.groupMember.count({
        where: { groupId, role: "ADMIN" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { message: "Cannot remove the only admin." },
          { status: 400 }
        );
      }
    }

    await prisma.groupMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ message: "Member removed successfully." });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { message: "Failed to remove member.", error: error.message },
      { status: 500 }
    );
  }
}
