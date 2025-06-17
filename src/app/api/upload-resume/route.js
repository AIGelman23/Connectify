// src/app/api/upload-resume/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth"; // For user authentication
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Import your authOptions
import { PrismaClient } from "@prisma/client"; // Prisma Client for database operations

const prisma = new PrismaClient(); // Initialize Prisma Client

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
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id; // Assuming user ID is available in session

    // Parse the FormData
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded." },
        { status: 400 }
      );
    }

    // Validate file type (optional but recommended)
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { message: "Only PDF files are allowed." },
        { status: 400 }
      );
    }

    // --- File Storage Logic (PLACEHOLDER) ---
    // In a real application, you would upload this 'file' to a cloud storage
    // service like AWS S3, Google Cloud Storage, or a similar service.
    // For demonstration, let's pretend we're saving it to a public folder
    // or getting a URL from an external service.

    // Example: Saving to a public folder (for local testing, NOT PRODUCTION-READY)
    // You would need to ensure your server environment has write access and proper paths.
    // import fs from 'node:fs/promises';
    // import path from 'node:path';
    // const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    // await fs.mkdir(uploadsDir, { recursive: true });
    // const filename = `${userId}-${Date.now()}-${file.name}`;
    // const filePath = path.join(uploadsDir, filename);
    // const buffer = Buffer.from(await file.arrayBuffer());
    // await fs.writeFile(filePath, buffer);
    // const publicUrl = `/uploads/${filename}`; // URL accessible from browser

    // For a real app, 'uploadedUrl' would come from your file storage service.
    const mockUploadSuccess = true; // Simulate success for now
    let uploadedUrl = "";

    if (mockUploadSuccess) {
      // Replace this with the actual URL from your file storage service
      // For now, generate a placeholder URL
      const uniqueId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      uploadedUrl = `https://example.com/resumes/${userId}-${uniqueId}.pdf`;
      console.log(`Simulated resume upload to: ${uploadedUrl}`);
    } else {
      // Handle simulated upload failure
      return NextResponse.json(
        { message: "Simulated file upload failed." },
        { status: 500 }
      );
    }
    // --- End File Storage Logic ---

    // Update the user's profile with the new resume URL using Prisma
    await prisma.profile.upsert({
      where: { userId: userId },
      update: { resumeUrl: uploadedUrl },
      create: {
        userId: userId,
        resumeUrl: uploadedUrl,
        // Ensure all non-nullable fields are provided here when creating a new profile
        // Removed 'name' as it belongs to the User model, not Profile.
        bio: "", // Default value for bio if not nullable and not provided elsewhere
        headline: "", // Default value for headline if not nullable and not provided elsewhere
        // Add other mandatory fields from Profile model here if not nullable
      },
    });

    // Return a JSON response with the uploaded URL
    return NextResponse.json(
      {
        message: "Resume uploaded and profile updated successfully!",
        url: uploadedUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error during resume upload:", error);
    // Return a proper JSON error response
    return NextResponse.json(
      {
        message: "Internal server error during resume upload.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
