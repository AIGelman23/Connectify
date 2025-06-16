// src/app/api/upload-file/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth"; // For user authentication
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Import your authOptions
import prisma from "@/lib/prisma"; // Assuming your Prisma client
import { v4 as uuidv4 } from "uuid"; // For generating unique filenames

// IMPORTANT: For file uploads, disable Next.js body parser for this route
// This allows you to handle the FormData manually.
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id; // Get the authenticated user's ID

    // Parse the FormData to get the file and type
    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type"); // e.g., 'profilePicture', 'coverPhoto', 'resume'

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded." },
        { status: 400 }
      );
    }
    if (!type) {
      return NextResponse.json(
        { message: "File type is required." },
        { status: 400 }
      );
    }

    // --- File Type Validation ---
    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    const allowedResumeType = "application/pdf";

    let validationError = null;
    if (type === "profilePicture" || type === "coverPhoto") {
      if (!allowedImageTypes.includes(file.type)) {
        validationError =
          "Only image files (JPEG, PNG, GIF, WEBP) are allowed for photos.";
      }
    } else if (type === "resume") {
      if (file.type !== allowedResumeType) {
        validationError = "Only PDF files are allowed for resumes.";
      }
    } else {
      validationError = "Invalid file type specified.";
    }

    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    // --- File Storage Logic (PLACEHOLDER FOR CLOUD STORAGE) ---
    // In a real production application, you would integrate with a cloud storage
    // service here (e.g., AWS S3, Google Cloud Storage, Cloudinary, Vercel Blob).
    // The following is a placeholder for local testing or demonstration purposes.
    // It generates a mock URL.

    // Generate a unique filename
    const fileExtension = file.name.split(".").pop();
    const uniqueFilename = `${userId}-${uuidv4()}.${fileExtension}`;
    let uploadedUrl = "";

    // Simulate successful upload and generate a mock URL
    uploadedUrl = `https://cdn.example.com/${type}s/${uniqueFilename}`;
    console.log(`Simulated upload of ${type} to: ${uploadedUrl}`);

    // --- Update User Profile in Database ---
    let updateData = {};
    switch (type) {
      case "profilePicture":
        updateData = { profilePictureUrl: uploadedUrl };
        break;
      case "coverPhoto":
        updateData = { coverPhotoUrl: uploadedUrl };
        break;
      case "resume":
        updateData = { resumeUrl: uploadedUrl };
        break;
      default:
        // This case should ideally be caught by validationError above, but as a fallback:
        return NextResponse.json(
          { message: "Unhandled file type for profile update." },
          { status: 400 }
        );
    }

    // Use upsert to update the existing profile or create one if it doesn't exist
    // This is crucial for new users who upload a picture before saving other profile details.
    await prisma.profile.upsert({
      where: { userId: userId },
      update: updateData,
      create: {
        userId: userId,
        // Provide default values for other non-nullable fields when creating a new profile
        // These might vary based on your schema's `Profile` model defaults/requirements.
        // Ensure that `isProfileComplete` is initialized correctly (likely `false`).
        bio: "",
        headline: "Complete your profile!",
        skills: [],
        education: "",
        isProfileComplete: false,
        profilePictureUrl: type === "profilePicture" ? uploadedUrl : null,
        coverPhotoUrl: type === "coverPhoto" ? uploadedUrl : null,
        resumeUrl: type === "resume" ? uploadedUrl : null,
      },
    });

    // Return a JSON response with the uploaded URL
    return NextResponse.json(
      {
        message: `${type} uploaded and profile updated successfully!`,
        url: uploadedUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `API Error during ${request.url} upload for type ${
        request.formData?.get("type") || "unknown"
      }:`,
      error
    );
    // Return a proper JSON error response
    return NextResponse.json(
      {
        message: "Internal server error during file upload.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
