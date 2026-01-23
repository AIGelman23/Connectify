// src/app/api/upload/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Disable caching for this route
export const dynamic = "force-dynamic";

// Create S3 client lazily to ensure environment variables are loaded
function getS3Client() {
  const region = process.env.AWS_S3_REGION || "us-east-2";

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS credentials not configured");
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
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

    const region = process.env.AWS_S3_REGION || "us-east-2";
    const bucket = process.env.AWS_S3_BUCKET_NAME;

    if (!bucket) {
      throw new Error("AWS_S3_BUCKET_NAME not configured");
    }

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    const s3Client = getS3Client();
    await s3Client.send(command);

    // Generate the public URL with regional endpoint and cache-busting parameter
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}?t=${Date.now()}`;

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
