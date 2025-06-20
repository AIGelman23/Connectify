import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch profile data
    const profile = await prisma.profile.findUnique({
      where: { userId },
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

    // Check all related models
    const userCount = await prisma.user.count();
    const profileCount = await prisma.profile.count();
    const experienceCount = (await prisma.experience)
      ? await prisma.experience.count()
      : "Model not found";
    const educationCount = (await prisma.education)
      ? await prisma.education.count()
      : "Model not found";
    const skillCount = (await prisma.skill)
      ? await prisma.skill.count()
      : "Model not found";

    // Get schema info
    const profileSchema = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profiles'
    `;

    return NextResponse.json({
      session: {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        },
      },
      profile,
      counts: {
        users: userCount,
        profiles: profileCount,
        experiences: experienceCount,
        education: educationCount,
        skills: skillCount,
      },
      schema: {
        profile: profileSchema,
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        message: "Internal server error.",
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
