// src/app/api/notifications/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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
          // Include sender details if available
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit the number of notifications to fetch
    });

    // You might want to format the notifications further here
    // For example, if 'targetId' points to a specific post or job,
    // you could fetch more details about that entity.
    const formattedNotifications = notifications.map((notif) => {
      // For connection_accepted, we might populate user details from 'sender'
      let userDetails = null;
      if (notif.sender) {
        userDetails = {
          name: notif.sender.name,
          imageUrl:
            notif.sender.image ||
            `https://placehold.co/40x40/ADD8E6/000000?text=${
              notif.sender.name ? notif.sender.name[0].toUpperCase() : "U"
            }`,
        };
      }

      // Add more specific details for other notification types if needed
      // e.g., if type is JOB_APPLICATION_VIEWED, you'd fetch job details based on targetId
      let jobDetails = null;
      if (notif.type === "JOB_APPLICATION_VIEWED" && notif.targetId) {
        // Placeholder: In a real app, you would fetch job details from your DB
        // const job = await prisma.job.findUnique({ where: { id: notif.targetId } });
        jobDetails = {
          title: "Job Title (simulated)",
          company: "Company (simulated)",
          logo: "https://placehold.co/40x40/4A90E2/FFFFFF?text=JP",
        };
      }

      let eventDetails = null;
      if (notif.type === "EVENT_INVITE" && notif.targetId) {
        // Placeholder: In a real app, you would fetch event details from your DB
        // const event = await prisma.event.findUnique({ where: { id: notif.targetId } });
        eventDetails = {
          name: "Event Name (simulated)",
        };
      }

      return {
        id: notif.id,
        type: notif.type,
        message: notif.message,
        read: notif.read,
        createdAt: notif.createdAt,
        user: userDetails, // User associated with the notification (e.g., who accepted the connection)
        job: jobDetails, // Job details if applicable
        event: eventDetails, // Event details if applicable
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
