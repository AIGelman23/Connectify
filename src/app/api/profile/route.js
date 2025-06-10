// src/app/api/profile/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Fetches the user's complete profile, including related experiences.
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

    // Find the user's profile, including their associated experiences
    // This assumes `experiences` is a relation in your Prisma Profile model
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      include: {
        experiences: {
          // Include all related experience records
          orderBy: { startDate: "desc" }, // Order chronologically, most recent first
        },
      },
    });

    if (!profile) {
      // If no profile exists, return a 404 with a clear message.
      // The frontend should then understand to initialize a new profile.
      return NextResponse.json(
        { message: "Profile not found for this user." },
        { status: 404 }
      );
    }

    // Return the fetched profile, including experiences.
    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error("API Error fetching profile:", error);
    return NextResponse.json(
      {
        message: "Internal server error fetching profile.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST: Creates or updates the user's core profile information.
// This endpoint expects URLs for images/resumes, not raw file data.
// Experience management (add/edit/delete individual experience items)
// should be handled by the /api/experience endpoint.
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    // Destructure expected fields from the request body.
    // Ensure that 'skills' is handled as an array, and other URLs are strings.
    const {
      bio,
      headline,
      skills, // This should be an array of strings from frontend (e.g., from split(', '))
      education,
      profilePictureUrl, // URL from file upload API
      coverPhotoUrl, // URL from file upload API
      resumeUrl, // URL from file upload API
      // Note: `experiences` array is NOT handled here directly, as it has its own API route.
    } = await request.json();

    // Validate incoming data (basic checks)
    if (typeof bio !== "string" && bio !== null && bio !== undefined) {
      return NextResponse.json(
        { message: "Bio must be a string or null." },
        { status: 400 }
      );
    }
    if (
      typeof headline !== "string" &&
      headline !== null &&
      headline !== undefined
    ) {
      return NextResponse.json(
        { message: "Headline must be a string or null." },
        { status: 400 }
      );
    }
    if (skills !== null && skills !== undefined && !Array.isArray(skills)) {
      return NextResponse.json(
        { message: "Skills must be an array of strings or null." },
        { status: 400 }
      );
    }
    if (
      typeof education !== "string" &&
      education !== null &&
      education !== undefined
    ) {
      return NextResponse.json(
        { message: "Education must be a string or null." },
        { status: 400 }
      );
    }
    // URLs are optional, so no strict validation needed beyond type check if present.

    // Upsert (update or insert) the user's profile
    // Prisma will automatically create if `where` clause finds nothing.
    const updatedProfile = await prisma.profile.upsert({
      where: { userId: userId },
      update: {
        bio,
        headline,
        skills: skills ? JSON.stringify(skills) : null, // Store skills as JSON string in DB
        education,
        profilePictureUrl,
        coverPhotoUrl,
        resumeUrl,
        isProfileComplete: true, // Mark as complete upon successful submission
        updatedAt: new Date(), // Update timestamp
      },
      create: {
        userId: userId,
        bio,
        headline,
        skills: skills ? JSON.stringify(skills) : null, // Store skills as JSON string in DB
        education,
        profilePictureUrl,
        coverPhotoUrl,
        resumeUrl,
        isProfileComplete: true, // Mark as complete on initial creation
      },
      // Select fields to return in the response
      select: {
        id: true,
        userId: true,
        bio: true,
        headline: true,
        skills: true,
        education: true,
        profilePictureUrl: true,
        coverPhotoUrl: true,
        resumeUrl: true,
        isProfileComplete: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Return success message and the updated profile data
    return NextResponse.json(
      { message: "Profile saved successfully!", profile: updatedProfile },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error saving profile:", error);
    // Generic error handling
    return NextResponse.json(
      {
        message: "Internal server error saving profile.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
