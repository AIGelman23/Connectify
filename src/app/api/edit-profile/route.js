// src/app/api/edit-profile/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// Helper function to format the profile response consistently
const formatProfileResponse = (profile) => {
  if (!profile) return null;

  return {
    id: profile.id,
    userId: profile.userId,
    headline: profile.headline || "", // Ensure headline is always a string
    location: profile.location || "", // Ensure location is always a string
    resumeUrl: profile.resumeUrl || "", // Ensure resumeUrl is always a string
    isProfileComplete: profile.isProfileComplete,
    profilePictureUrl: profile.profilePictureUrl || "", // Ensure profilePictureUrl is always a string
    coverPhotoUrl: profile.coverPhotoUrl || "", // Ensure coverPhotoUrl is always a string
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    bio: profile.bio || "", // Map 'bio' from Prisma to 'summary', default to empty string
    name: profile.user?.name || "", // Get name from associated user, default to empty string
    email: profile.user?.email || "", // Get email from associated user, default to empty string
    experiences: profile.experiences || [], // Map 'experiences' relation to 'experience', default to empty array
    education: profile.education || [], // Map 'education' relation to 'education', default to empty array
    skills: profile.skills || [], // Map 'skills' relation to 'skills', default to empty array
  };
};

// GET: Fetches the user's complete profile
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
    console.log("GET /api/edit-profile - fetching for userId:", userId);

    // Fetch the complete profile with all related data
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        experiences: {
          orderBy: { startDate: "desc" },
        },
        education: {
          orderBy: { startDate: "desc" },
        },
        skills: true,
      },
    });

    if (!profile) {
      console.log("Profile not found for userId:", userId);
      return NextResponse.json(
        { message: "Profile not found for this user.", profile: null },
        { status: 404 }
      );
    }

    console.log("Profile found with data:", {
      id: profile.id,
      coverPhotoUrl: profile.coverPhotoUrl,
      profilePictureUrl: profile.profilePictureUrl,
    });

    const formattedProfile = formatProfileResponse(profile);
    return NextResponse.json({ profile: formattedProfile }, { status: 200 });
  } catch (error) {
    console.error("API Error fetching user profile:", error);
    return NextResponse.json(
      {
        message: "Internal server error fetching profile.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT: Updates the user's complete profile
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log("PUT /api/edit-profile - saving for userId:", userId);

    const formData = await request.formData();

    // Log what we received in the formData
    console.log("Received form data fields:", [...formData.keys()]);
    console.log("profilePictureUrl:", formData.get("profilePictureUrl"));
    console.log("coverPhotoUrl:", formData.get("coverPhotoUrl"));

    // Extract form data fields
    const name = formData.get("name");
    const headline = formData.get("headline");
    const bio = formData.get("bio");
    const location = formData.get("location");
    const isProfileComplete = formData.get("isProfileComplete") === "true";
    const profilePictureUrl = formData.get("profilePictureUrl") || "";
    const coverPhotoUrl = formData.get("coverPhotoUrl") || "";
    const resumeUrl = formData.get("resumeUrl") || "";

    // Parse skills
    let skills = [];
    const skillsString = formData.get("skills");
    if (skillsString) {
      try {
        skills = JSON.parse(skillsString);
      } catch (e) {
        console.error("Failed to parse skills JSON:", e);
        return NextResponse.json(
          { message: "Invalid skills format." },
          { status: 400 }
        );
      }
    }

    // Parse experiences
    let experiences = [];
    const experiencesString = formData.get("experiences");
    if (experiencesString) {
      try {
        experiences = JSON.parse(experiencesString);
      } catch (e) {
        console.error("Failed to parse experiences JSON:", e);
        return NextResponse.json(
          { message: "Invalid experiences format." },
          { status: 400 }
        );
      }
    }

    // Parse education
    let educations = [];
    const educationString = formData.get("education");
    if (educationString) {
      try {
        educations = JSON.parse(educationString);
      } catch (e) {
        console.error("Failed to parse education JSON:", e);
        return NextResponse.json(
          { message: "Invalid education format." },
          { status: 400 }
        );
      }
    }

    // Update or create profile with a transaction
    const updatedProfile = await prisma.$transaction(async (tx) => {
      // Update or create the profile
      const profile = await tx.profile.upsert({
        where: { userId: userId },
        update: {
          bio: bio,
          headline: headline,
          location: location,
          profilePictureUrl: profilePictureUrl,
          coverPhotoUrl: coverPhotoUrl,
          resumeUrl: resumeUrl,
          isProfileComplete: isProfileComplete,
          updatedAt: new Date(),
        },
        create: {
          userId: userId,
          bio: bio,
          headline: headline,
          location: location,
          profilePictureUrl: profilePictureUrl,
          coverPhotoUrl: coverPhotoUrl,
          resumeUrl: resumeUrl,
          isProfileComplete: isProfileComplete,
        },
      });

      // Update the user record with name
      await tx.user.update({
        where: { id: userId },
        data: {
          name: name,
          // Only update user's image if profile picture URL is provided
          ...(profilePictureUrl ? { image: profilePictureUrl } : {}),
        },
      });

      // Handle skills - delete existing ones and create new ones
      await tx.skill.deleteMany({
        where: { profileId: profile.id },
      });

      if (skills.length > 0) {
        await tx.skill.createMany({
          data: skills.map((skill) => ({
            name: typeof skill === "string" ? skill : skill.name || "",
            profileId: profile.id,
          })),
          skipDuplicates: true,
        });
      }

      // Handle experiences - delete existing ones and create new ones
      await tx.experience.deleteMany({
        where: { profileId: profile.id },
      });

      if (experiences.length > 0) {
        await tx.experience.createMany({
          data: experiences.map((exp) => ({
            profileId: profile.id,
            title: exp.title || "",
            company: exp.company || "",
            location: exp.location || "",
            startDate: new Date(exp.startDate || new Date()),
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            description: exp.description || "",
            isCurrent: exp.isCurrent || false,
          })),
        });
      }

      // Handle education - delete existing ones and create new ones
      await tx.education.deleteMany({
        where: { profileId: profile.id },
      });

      if (educations.length > 0) {
        await tx.education.createMany({
          data: educations.map((edu) => ({
            profileId: profile.id,
            degree: edu.degree || "",
            institution: edu.institution || "",
            fieldOfStudy: edu.fieldOfStudy || edu.field || "",
            startDate: new Date(edu.startDate || new Date()),
            endDate: edu.endDate ? new Date(edu.endDate) : null,
            description: edu.description || "",
          })),
        });
      }

      // Fetch updated profile with related data
      return await tx.profile.findUnique({
        where: { id: profile.id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
          experiences: {
            orderBy: { startDate: "desc" },
          },
          education: {
            orderBy: { startDate: "desc" },
          },
          skills: true,
        },
      });
    });

    // Log the updated profile URLs for debugging
    console.log("Updated profile image URLs:", {
      profilePictureUrl: updatedProfile.profilePictureUrl,
      coverPhotoUrl: updatedProfile.coverPhotoUrl,
    });

    return NextResponse.json(
      {
        message: "Profile saved successfully.",
        profile: formatProfileResponse(updatedProfile),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error saving user profile:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      {
        message: "Internal server error saving profile.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
