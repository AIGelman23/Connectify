import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = params;

  try {
    const events = await prisma.groupEvent.findMany({
      where: { groupId },
      orderBy: { startTime: "asc" },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: { attendees: true },
        },
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching group events:", error);
    return NextResponse.json(
      { error: "Failed to fetch group events" },
      { status: 500 },
    );
  }
}

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = params;

  try {
    const body = await request.json();
    const { name, description, startTime, endTime, location } = body;

    const event = await prisma.groupEvent.create({
      data: {
        name,
        description,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        location,
        groupId,
        creatorId: session.user.id,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("Error creating group event:", error);
    return NextResponse.json(
      { error: "Failed to create group event" },
      { status: 500 },
    );
  }
}
