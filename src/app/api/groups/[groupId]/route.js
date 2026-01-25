import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    if (!groupId) {
      return NextResponse.json(
        { message: "Group ID is required." },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Fetch the group with related data
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: {
          select: { members: true, posts: true },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 }
      );
    }

    // Check if user is a member (for private groups)
    const membership = group.members.find((m) => m.userId === userId);
    const isMember = !!membership;

    // If private group and user is not a member, return limited info
    if (group.privacy === "Private" && !isMember) {
      // Check if user has a pending request
      const userRequest = await prisma.groupJoinRequest.findUnique({
        where: {
          groupId_userId: { groupId, userId },
        },
      });

      return NextResponse.json({
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          coverImage: group.coverImage,
          privacy: group.privacy,
          memberCount: group._count.members,
          creator: group.creator,
          createdAt: group.createdAt,
          isMember: false,
          isPrivate: true,
          hasRequestPending: userRequest?.status === "PENDING",
        },
      });
    }

    // Get pending request count for admins/moderators
    let pendingRequestCount = 0;
    if (membership && ["ADMIN", "MODERATOR"].includes(membership.role)) {
      pendingRequestCount = await prisma.groupJoinRequest.count({
        where: {
          groupId,
          status: "PENDING",
        },
      });
    }

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        coverImage: group.coverImage,
        privacy: group.privacy,
        memberCount: group._count.members,
        postCount: group._count.posts,
        creator: group.creator,
        createdAt: group.createdAt,
        members: group.members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          name: m.user.name,
          image: m.user.image,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        isMember,
        userRole: membership?.role || null,
        isAdmin: membership?.role === "ADMIN",
        isModerator: membership?.role === "MODERATOR",
        pendingRequestCount,
      },
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json(
      { message: "Failed to fetch group.", error: error.message },
      { status: 500 }
    );
  }
}

// Update group details (admin only)
export async function PATCH(request, context) {
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

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Only admins can update group settings." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, privacy, coverImage } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (privacy !== undefined) updateData.privacy = privacy;
    if (coverImage !== undefined) updateData.coverImage = coverImage || null;

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: {
        _count: { select: { members: true } },
      },
    });

    return NextResponse.json({
      group: {
        id: updatedGroup.id,
        name: updatedGroup.name,
        description: updatedGroup.description,
        coverImage: updatedGroup.coverImage,
        privacy: updatedGroup.privacy,
        memberCount: updatedGroup._count.members,
      },
    });
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json(
      { message: "Failed to update group.", error: error.message },
      { status: 500 }
    );
  }
}

// Delete group (admin only)
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
    const userId = session.user.id;

    // Check if user is admin
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Only admins can delete the group." },
        { status: 403 }
      );
    }

    // Delete the group (cascade will handle members)
    await prisma.group.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ message: "Group deleted successfully." });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json(
      { message: "Failed to delete group.", error: error.message },
      { status: 500 }
    );
  }
}
