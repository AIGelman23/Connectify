// src/app/api/notifications/route.js

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

    // Fetch notifications for the current user, ordered by most recent first
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: userId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: {
              select: {
                profilePictureUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    console.log(
      "Fetched notifications for user:",
      userId,
      notifications.length
    );

    // Ensure notifications are returned in the expected format
    const formattedNotifications = notifications.map((notif) => {
      let userDetails = null;
      if (notif.sender) {
        userDetails = {
          id: notif.sender.id,
          name: notif.sender.name,
          imageUrl:
            notif.sender.profile?.profilePictureUrl ||
            notif.sender.image ||
            `https://placehold.co/40x40/ADD8E6/000000?text=${
              notif.sender.name ? notif.sender.name[0].toUpperCase() : "U"
            }`,
        };
      }

      return {
        id: notif.id,
        type: notif.type,
        message: notif.message,
        read: notif.read,
        createdAt: notif.createdAt,
        user: userDetails,
        targetId: notif.targetId, // important for connection requests
        senderId: notif.senderId,
      };
    });

    return NextResponse.json(
      { notifications: formattedNotifications },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error fetching notifications:", error);
    return NextResponse.json(
      {
        message: "Internal server error fetching notifications.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const notifId = searchParams.get("id");
    if (!notifId) {
      return NextResponse.json(
        { message: "Notification id is required." },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check if notification exists and belongs to the user
    const notification = await prisma.notification.findUnique({
      where: { id: notifId },
    });

    if (!notification) {
      return NextResponse.json(
        { message: "Notification not found." },
        { status: 404 }
      );
    }

    if (notification.recipientId !== userId) {
      return NextResponse.json(
        { message: "Not authorized to delete this notification." },
        { status: 403 }
      );
    }

    await prisma.notification.delete({
      where: { id: notifId },
    });

    return NextResponse.json(
      { message: "Notification cleared." },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error deleting notification:", error);
    return NextResponse.json(
      {
        message: "Internal server error deleting notification.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Update all unread notifications for this user
    await prisma.notification.updateMany({
      where: { recipientId: userId, read: false },
      data: { read: true },
    });

    return NextResponse.json(
      { message: "All notifications marked as read" },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error marking all notifications as read:", error);
    return NextResponse.json(
      {
        message: "Internal server error marking notifications as read.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
