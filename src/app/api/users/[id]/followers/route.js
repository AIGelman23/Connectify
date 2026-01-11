import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const { id: userId } = await params;

    const followers = await prisma.follows.findMany({
      where: { followingId: userId },
      include: {
        follower: {
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

    const formattedFollowers = followers.map((f) => ({
      id: f.follower.id,
      name: f.follower.name,
      imageUrl: f.follower.profile?.profilePictureUrl || f.follower.image,
      headline: f.follower.profile?.headline,
    }));

    return NextResponse.json(
      { followers: formattedFollowers },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching followers:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
