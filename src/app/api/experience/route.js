// src/app/api/experience/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

    // Find the user's profile
    const userProfile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true }, // We only need the profileId to query experiences
    });

    if (!userProfile) {
      return NextResponse.json({ experiences: [] }, { status: 200 }); // No profile, no experiences
    }

    // Fetch experiences associated with this profile
    const experiences = await prisma.experience.findMany({
      where: { profileId: userProfile.id },
      orderBy: { startDate: "desc" }, // Order by most recent job first
    });

    return NextResponse.json({ experiences }, { status: 200 });
  } catch (error) {
    console.error("API Error fetching experiences:", error);
    return NextResponse.json(
      {
        message: "Internal server error fetching experiences.",
        error: error.message,
      },
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

    const {
      title,
      company,
      location,
      startDate,
      endDate,
      description,
      isCurrent,
    } = await request.json();
    const userId = session.user.id;

    if (!title || !company || !startDate) {
      return NextResponse.json(
        { message: "Title, company, and start date are required." },
        { status: 400 }
      );
    }

    // Ensure a profile exists for the user. If not, create one.
    const profile = await prisma.profile.upsert({
      where: { userId: userId },
      update: {}, // No specific update needed if it exists
      create: { userId: userId },
      select: { id: true },
    });

    const newExperience = await prisma.experience.create({
      data: {
        profileId: profile.id,
        title,
        company,
        location,
        startDate: new Date(startDate),
        endDate: isCurrent ? null : endDate ? new Date(endDate) : null, // Handle null if current or empty
        description,
        isCurrent: isCurrent || false,
      },
    });

    return NextResponse.json(
      { message: "Experience added successfully.", experience: newExperience },
      { status: 201 }
    );
  } catch (error) {
    console.error("API Error adding experience:", error);
    return NextResponse.json(
      {
        message: "Internal server error adding experience.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const experienceId = searchParams.get("id");

    if (!experienceId) {
      return NextResponse.json(
        { message: "Experience ID is required for updating." },
        { status: 400 }
      );
    }

    const {
      title,
      company,
      location,
      startDate,
      endDate,
      description,
      isCurrent,
    } = await request.json();
    const userId = session.user.id;

    // Verify ownership of the experience
    const existingExperience = await prisma.experience.findUnique({
      where: { id: experienceId },
      include: {
        profile: {
          select: { userId: true },
        },
      },
    });

    if (!existingExperience) {
      return NextResponse.json(
        { message: "Experience not found." },
        { status: 404 }
      );
    }

    if (existingExperience.profile.userId !== userId) {
      return NextResponse.json(
        { message: "You are not authorized to update this experience." },
        { status: 403 }
      );
    }

    const updatedExperience = await prisma.experience.update({
      where: { id: experienceId },
      data: {
        title: title || existingExperience.title,
        company: company || existingExperience.company,
        location: location, // Can be null
        startDate: startDate
          ? new Date(startDate)
          : existingExperience.startDate,
        endDate: isCurrent ? null : endDate ? new Date(endDate) : null,
        description: description, // Can be null
        isCurrent: isCurrent || false,
      },
    });

    return NextResponse.json(
      {
        message: "Experience updated successfully.",
        experience: updatedExperience,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error updating experience:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Experience not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        message: "Internal server error updating experience.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const experienceId = searchParams.get("id");

    if (!experienceId) {
      return NextResponse.json(
        { message: "Experience ID is required for deleting." },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Verify ownership of the experience
    const existingExperience = await prisma.experience.findUnique({
      where: { id: experienceId },
      include: {
        profile: {
          select: { userId: true },
        },
      },
    });

    if (!existingExperience) {
      return NextResponse.json(
        { message: "Experience not found." },
        { status: 404 }
      );
    }

    if (existingExperience.profile.userId !== userId) {
      return NextResponse.json(
        { message: "You are not authorized to delete this experience." },
        { status: 403 }
      );
    }

    await prisma.experience.delete({
      where: { id: experienceId },
    });

    return NextResponse.json(
      { message: "Experience deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error deleting experience:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Experience not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        message: "Internal server error deleting experience.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
