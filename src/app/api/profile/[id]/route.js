import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// Disable caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request, { params }) {
  try {
    const { id } = await params;
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

    // Get follow counts and status
    const [followersCount, followingCount, isFollowing] = await Promise.all([
      prisma.follows.count({ where: { followingId: id } }),
      prisma.follows.count({ where: { followerId: id } }),
      prisma.follows.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: id,
          },
        },
      }),
    ]);

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
        isFollowing: !!isFollowing,
        followersCount,
        followingCount,
      });
    }

    return NextResponse.json({
      profile,
      isFollowing: !!isFollowing,
      followersCount,
      followingCount,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
