// src/app/api/upload/route.js

import { uploadFileToS3 } from "@/lib/s3";
import formidable from "formidable";
import fs from "fs";
import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// IMPORTANT: For file uploads, disable Next.js body parser for this route
// This allows you to handle the FormData manually.
export const routeSegmentConfig = {
  api: {
    bodyParser: false,
  },
};

// Helper to convert Web API Request to Node.js-like IncomingMessage for formidable
async function webRequestToNodeRequest(request) {
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  const arrayBuffer = await request.arrayBuffer();
  const stream = Readable.from(Buffer.from(arrayBuffer));
  // Mock IncomingMessage: must have headers and .on/.pipe methods
  return Object.assign(stream, { headers });
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

    const userId = session.user.id;

    // Get the form data
    const formData = await request.formData();

    // Check what fields we have in the form data for debugging
    console.log("Upload API received form data fields:", [...formData.keys()]);

    // Determine file type from form data fields
    let file, fileType;
    if (formData.has("profilePicture")) {
      file = formData.get("profilePicture");
      fileType = "profilePicture";
    } else if (formData.has("coverPhoto")) {
      file = formData.get("coverPhoto");
      fileType = "coverPhoto";
    } else if (formData.has("resume")) {
      file = formData.get("resume");
      fileType = "resume";
    } else {
      file = formData.get("file");
      fileType = "file";
    }

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded." },
        { status: 400 }
      );
    }

    // Generate unique name for the file
    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const key = `${userId}/${fileType}/${uniqueFileName}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3 - REMOVED the ACL parameter
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      // REMOVED: ACL: "public-read", // This was causing the error
    });

    await s3Client.send(command);

    // Generate the public URL
    const url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;

    console.log(`Successfully uploaded file to S3: ${url}`);

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { message: "File upload failed", error: error.message },
      { status: 500 }
    );
  }
}
