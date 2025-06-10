// src/app/api/upload/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Removed: require("dotenv").config({ path: ".env.local" });
// Next.js handles loading .env.local automatically.

// For debugging: Log the region being used at initialization
console.log(
  "S3 Client Initializing with AWS_S3_REGION:",
  process.env.AWS_S3_REGION
);

// Initialize S3 client
// Ensure your AWS_S3_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY
// are set in your .env.local file.
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || "us-east-1", // Default to us-east-1 if not set
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed file types for images
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
// Allowed file types for documents (e.g., resumes)
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

// Helper function to generate a unique file name for S3
function generateFileName(originalName, userId, type) {
  const timestamp = Date.now();
  const extension = originalName.split(".").pop();
  // Example path: profile-pictures/user_id/timestamp.ext
  return `${type}/${userId}/${timestamp}.${extension}`;
}

// Helper function to validate file type and size
function validateFile(file, allowedTypes) {
  if (!allowedTypes.includes(file.type)) {
    return `File type ${
      file.type
    } not allowed. Allowed types: ${allowedTypes.join(", ")}`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `File size too large. Maximum size: ${
      MAX_FILE_SIZE / 1024 / 1024
    }MB`;
  }

  return null; // Return null if validation passes
}

// POST: Handles file uploads to S3
export async function POST(request) {
  try {
    // Authenticate the user session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Check if S3 bucket name is configured
    if (!BUCKET_NAME) {
      return NextResponse.json(
        {
          message: "S3 bucket name is not configured in environment variables.",
        },
        { status: 500 }
      );
    }

    const userId = session.user.id;
    const formData = await request.formData(); // Parse incoming request as FormData

    // Get the files from the FormData.
    // The names here ('profilePicture', 'coverPhoto', 'resume') must match
    // what your frontend sends in the FormData.
    const profilePicture = formData.get("profilePicture");
    const coverPhoto = formData.get("coverPhoto");
    const resume = formData.get("resume");

    const uploadResults = {}; // To store URLs of successfully uploaded files
    const uploadPromises = []; // To run uploads concurrently

    // Handle profile picture upload if present
    if (profilePicture && profilePicture.size > 0) {
      const validationError = validateFile(profilePicture, ALLOWED_IMAGE_TYPES);
      if (validationError) {
        return NextResponse.json(
          { message: `Profile picture: ${validationError}` },
          { status: 400 }
        );
      }

      const fileName = generateFileName(
        profilePicture.name,
        userId,
        "profile-pictures" // S3 folder prefix
      );
      const arrayBuffer = await profilePicture.arrayBuffer(); // Get file content as ArrayBuffer

      // Add upload promise to the array
      uploadPromises.push(
        s3Client
          .send(
            new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: fileName,
              Body: new Uint8Array(arrayBuffer), // Convert ArrayBuffer to Uint8Array
              ContentType: profilePicture.type,
              ContentDisposition: "inline", // Display image directly in browser
            })
          )
          .then(() => {
            // Store the public URL of the uploaded profile picture
            uploadResults.profilePictureUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${fileName}`;
          })
      );
    }

    // Handle cover photo upload if present
    if (coverPhoto && coverPhoto.size > 0) {
      const validationError = validateFile(coverPhoto, ALLOWED_IMAGE_TYPES);
      if (validationError) {
        return NextResponse.json(
          { message: `Cover photo: ${validationError}` },
          { status: 400 }
        );
      }

      const fileName = generateFileName(
        coverPhoto.name,
        userId,
        "cover-photos" // S3 folder prefix
      );
      const arrayBuffer = await coverPhoto.arrayBuffer();

      uploadPromises.push(
        s3Client
          .send(
            new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: fileName,
              Body: new Uint8Array(arrayBuffer),
              ContentType: coverPhoto.type,
              ContentDisposition: "inline",
            })
          )
          .then(() => {
            // Store the public URL of the uploaded cover photo
            uploadResults.coverPhotoUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${fileName}`;
          })
      );
    }

    // Handle resume upload if present
    if (resume && resume.size > 0) {
      const validationError = validateFile(resume, ALLOWED_DOCUMENT_TYPES);
      if (validationError) {
        return NextResponse.json(
          { message: `Resume: ${validationError}` },
          { status: 400 }
        );
      }

      const fileName = generateFileName(resume.name, userId, "resumes"); // S3 folder prefix
      const arrayBuffer = await resume.arrayBuffer();

      uploadPromises.push(
        s3Client
          .send(
            new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: fileName,
              Body: new Uint8Array(arrayBuffer),
              ContentType: resume.type,
              // Changed ContentDisposition to "inline" to allow PDF to be viewed in iframe
              ContentDisposition: "inline",
            })
          )
          .then(() => {
            // Store the public URL of the uploaded resume
            uploadResults.resumeUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${fileName}`;
          })
      );
    }

    // Wait for all upload promises to resolve
    await Promise.all(uploadPromises);

    // Return the URLs of all successfully uploaded files
    return NextResponse.json(
      {
        message: "Files uploaded successfully",
        urls: uploadResults, // Contains profilePictureUrl, coverPhotoUrl, resumeUrl
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("S3 Upload Error:", error);
    // Return a JSON error response in case of any exception
    return NextResponse.json(
      {
        message: "Failed to upload files",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// GET: Generate presigned URLs for direct upload (alternative approach, not used in current frontend)
// This function can be used if you want to allow direct browser uploads to S3 without proxying
// through your Next.js server, which can be more efficient for very large files.
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get("fileType"); // e.g., 'image/jpeg'
    const fileName = searchParams.get("fileName"); // original file name
    const uploadType = searchParams.get("uploadType"); // 'profile-pictures', 'cover-photos', 'resumes'

    if (!fileType || !fileName || !uploadType) {
      return NextResponse.json(
        {
          message:
            "Missing required parameters: fileType, fileName, uploadType",
        },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    // Generate a unique S3 key for the file
    const key = generateFileName(fileName, userId, uploadType);

    // Create a PutObjectCommand for the S3 upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    // Generate a presigned URL that allows a client to upload directly to S3
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL valid for 1 hour
    });
    // Construct the public URL of the file after it's uploaded
    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;

    return NextResponse.json(
      {
        signedUrl, // The URL for the client to PUT the file to S3
        fileUrl, // The public URL of the file once uploaded
        key, // The S3 key (path) of the file
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Presigned URL Error:", error);
    return NextResponse.json(
      {
        message: "Failed to generate upload URL",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
