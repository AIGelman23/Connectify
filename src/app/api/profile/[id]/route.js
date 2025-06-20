import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { message: "Profile ID is required" },
        { status: 400 }
      );
    }

    // Authenticate the current user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Fetch the requested profile
    const profile = await prisma.profile.findUnique({
      where: { userId: id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        experiences: true,
        education: true,
        skills: true,
      },
    });

    // Check if profile exists
    if (!profile) {
      return NextResponse.json(
        { message: "Profile not found" },
        { status: 404 }
      );
    }

    // Check if the users are connected
    const isConnected = await prisma.connectionRequest.findFirst({
      where: {
        AND: [
          { status: "ACCEPTED" },
          {
            OR: [
              { senderId: session.user.id, receiverId: id },
              { senderId: id, receiverId: session.user.id },
            ],
          },
        ],
      },
    });

    // Only return full profile data if users are connected or it's the user's own profile
    const isOwn = session.user.id === id;
    if (!isOwn && !isConnected) {
      // Return limited profile data for non-connections
      return NextResponse.json({
        profile: {
          user: {
            name: profile.user.name,
            image: profile.user.image,
          },
          headline: profile.headline,
          location: profile.location,
          profilePictureUrl: profile.profilePictureUrl,
          coverPhotoUrl: profile.coverPhotoUrl,
          isProfileComplete: profile.isProfileComplete,
          // Don't include other sensitive data
        },
      });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
