// src/app/api/edit-profile/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to format the profile response consistently
const formatProfileResponse = (profile) => {
  if (!profile) return null;

  // Explicitly construct the formatted object, ensuring all fields have expected types
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

    // Mapped fields with robust fallbacks
    summary: profile.bio || "", // Map 'bio' from Prisma to 'summary', default to empty string
    experience: profile.experiences || [], // Map 'experiences' relation to 'experience', default to empty array
    education: profile.education || [], // Map 'education' relation to 'education', default to empty array
    skills: profile.skills || [], // Map 'skills' relation to 'skills', default to empty array

    // User details from the included 'user' relation
    name: profile.user?.name || "", // Get name from associated user, default to empty string
    email: profile.user?.email || "", // Get email from associated user, default to empty string
    // Use profilePictureUrl from Profile if set, otherwise fallback to user.image
    profilePicture: profile.profilePictureUrl || profile.user?.image || "",
  };
};

// PUT: Updates the user's complete profile.
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
    const formData = await request.formData();

    const name = formData.get("name");
    const headline = formData.get("headline");
    const summary = formData.get("summary");
    const location = formData.get("location");
    const isProfileComplete = formData.get("isProfileComplete") === "true";

    const profilePictureUrl = formData.get("profilePictureUrl");
    const coverPhotoUrl = formData.get("coverPhotoUrl");
    const resumeUrl = formData.get("resumeUrl");

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

    let experiences = [];
    const experienceString = formData.get("experience");
    if (experienceString) {
      try {
        experiences = JSON.parse(experienceString);
      } catch (e) {
        console.error("Failed to parse experience JSON:", e);
        return NextResponse.json(
          { message: "Invalid experience format." },
          { status: 400 }
        );
      }
    }

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

    console.log("PUT Request - Received FormData values:");
    console.log("  Name:", name);
    console.log("  Headline:", headline);
    console.log("  Summary (bio):", summary);
    console.log("  Location:", location);
    console.log("  isProfileComplete:", isProfileComplete);
    console.log("  ProfilePictureUrl:", profilePictureUrl);
    console.log("  CoverPhotoUrl:", coverPhotoUrl);
    console.log("  ResumeUrl:", resumeUrl);
    console.log("  Parsed Skills:", skills);
    console.log("  Parsed Experiences:", experiences);
    console.log("  Parsed Educations:", educations);

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { message: "Name is required and must be at least 2 characters." },
        { status: 400 }
      );
    }
    if (!headline || headline.trim().length === 0) {
      return NextResponse.json(
        { message: "Headline is required." },
        { status: 400 }
      );
    }

    const updatedProfileResult = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.upsert({
        where: { userId: userId },
        update: {
          bio: summary,
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
          bio: summary,
          headline: headline,
          location: location,
          profilePictureUrl: profilePictureUrl,
          coverPhotoUrl: coverPhotoUrl,
          resumeUrl: resumeUrl,
          isProfileComplete: isProfileComplete,
        },
        select: {
          id: true,
          userId: true,
          bio: true,
          headline: true,
          location: true,
          profilePictureUrl: true,
          coverPhotoUrl: true,
          resumeUrl: true,
          isProfileComplete: true,
          createdAt: true,
          updatedAt: true,
          experiences: true, // Select to return full updated profile data
          education: true,
          skills: true,
        },
      });

      console.log("Prisma upserted Profile:", profile);

      await tx.experience.deleteMany({
        where: { profileId: profile.id },
      });
      if (experiences.length > 0) {
        const experiencesToCreate = experiences.map((expItem) => ({
          // Use explicit mapping
          profileId: profile.id,
          title: expItem.title,
          company: expItem.company,
          location: expItem.location || null,
          startDate: new Date(expItem.startDate),
          endDate: expItem.endDate ? new Date(expItem.endDate) : null,
          description: expItem.description || null,
          isCurrent: expItem.isCurrent || false,
        }));
        console.log("Experiences to create:", experiencesToCreate);
        await tx.experience.createMany({
          data: experiencesToCreate,
        });
      }

      await tx.education.deleteMany({
        where: { profileId: profile.id },
      });
      if (educations.length > 0) {
        const educationsToCreate = educations.map((eduItem) => ({
          // Use explicit mapping
          profileId: profile.id,
          degree: eduItem.degree,
          institution: eduItem.institution || "", // Map 'institution' from frontend
          fieldOfStudy: eduItem.fieldOfStudy || null,
          startDate: new Date(eduItem.startDate),
          endDate: eduItem.endDate ? new Date(eduItem.endDate) : null,
          description: eduItem.description || null,
        }));
        console.log("Educations to create:", educationsToCreate);
        await tx.education.createMany({
          data: educationsToCreate,
        });
      }

      await tx.skill.deleteMany({
        where: { profileId: profile.id },
      });
      if (skills.length > 0) {
        const skillPromises = skills.map(async (skillName) => {
          const existingSkill = await tx.skill.findUnique({
            // <-- This is problematic
            where: { name: skillName },
          });
          if (existingSkill) {
            return tx.skill.update({
              // <-- Updates existing skill globally, not just for THIS profile
              where: { id: existingSkill.id },
              data: { profileId: profile.id },
            });
          } else {
            return tx.skill.create({
              data: {
                name: skillName,
                profileId: profile.id,
              },
            });
          }
        });
        await Promise.all(skillPromises);
      }

      const finalProfileForResponse = await tx.profile.findUnique({
        where: { userId: userId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
          experiences: { orderBy: { startDate: "asc" } },
          education: { orderBy: { startDate: "asc" } },
          skills: true,
        },
      });
      console.log(
        "Final Profile fetched within transaction for response:",
        finalProfileForResponse
      );
      return finalProfileForResponse;
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: name,
        email: session.user.email,
        image: profilePictureUrl,
      },
    });

    const formattedResponse = formatProfileResponse(updatedProfileResult);
    console.log(
      "Formatted response sent to frontend (PUT):",
      formattedResponse
    );

    return NextResponse.json(
      { message: "Profile saved successfully.", profile: formattedResponse },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error saving user profile:", error.message);
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

// GET: Fetches the user's complete profile.
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
        experiences: { orderBy: { startDate: "asc" } },
        education: { orderBy: { startDate: "asc" } },
        skills: true,
      },
    });

    if (!profile) {
      console.log("GET Request - Profile not found for userId:", userId);
      return NextResponse.json(
        { message: "Profile not found for this user.", profile: null },
        { status: 404 }
      );
    }

    const formattedProfile = formatProfileResponse(profile);
    console.log(
      "Formatted profile fetched for GET response:",
      formattedProfile
    );

    return NextResponse.json({ profile: formattedProfile }, { status: 200 });
  } catch (error) {
    console.error("API Error fetching user profile:", error.message);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      {
        message: "Internal server error fetching profile.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
