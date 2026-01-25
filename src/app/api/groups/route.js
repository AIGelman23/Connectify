import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch all public groups + private groups user is a member of
    const groups = await prisma.group.findMany({
      where: {
        OR: [
          { privacy: "Public" },
          { members: { some: { userId } } },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch groups user is a member of
    const myGroups = await prisma.group.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format groups for frontend
    const formatGroup = (group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      coverImage: group.coverImage,
      privacy: group.privacy,
      memberCount: group._count.members,
      creator: group.creator,
      createdAt: group.createdAt,
    });

    return NextResponse.json({
      groups: groups.map(formatGroup),
      myGroups: myGroups.map(formatGroup),
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { message: "Failed to fetch groups.", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, privacy } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { message: "Group name is required." },
        { status: 400 }
      );
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        privacy: privacy || "Public",
        creatorId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "ADMIN",
          },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
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
        createdAt: group.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      { message: "Failed to create group.", error: error.message },
      { status: 500 }
    );
  }
}
