import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const { id: userId } = await params;

    const following = await prisma.follows.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: {
              select: {
                headline: true,
                profilePictureUrl: true,
              },
            },
          },
        },
      },
    });

    const formattedFollowing = following.map((f) => ({
      id: f.following.id,
      name: f.following.name,
      imageUrl: f.following.profile?.profilePictureUrl || f.following.image,
      headline: f.following.profile?.headline,
    }));

    return NextResponse.json(
      { following: formattedFollowing },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching following:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
