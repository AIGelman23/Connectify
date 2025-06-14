// src/app/api/upload/route.js

import { uploadFileToS3 } from "@/lib/s3";
import formidable from "formidable";
import fs from "fs";
import { NextResponse } from "next/server";
import { Readable } from "stream";

// Disable Next.js body parsing
export const config = {
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
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB limit
      keepExtensions: true, // preserve file extension
    });

    const nodeReq = await webRequestToNodeRequest(request);

    const parseForm = (req) =>
      new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      });

    const [fields, files] = await parseForm(nodeReq);
    const getFile = (fileField) =>
      Array.isArray(fileField) ? fileField[0] : fileField;
    const file =
      getFile(files.profilePicture) ||
      getFile(files.coverPhoto) ||
      getFile(files.resume) ||
      getFile(files.file);

    console.log("DEBUG: Uploaded file details:", file); // <-- diagnostic log

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(file.filepath);
      // Added logging for debugging file details and buffer length
      console.log(
        "DEBUG: File details - originalFilename:",
        file.originalFilename,
        "mimetype:",
        file.mimetype,
        "size:",
        file.size,
        "filepath:",
        file.filepath
      );
      console.log("DEBUG: File buffer length:", fileBuffer.length);
    } catch (err) {
      console.error("Error reading uploaded file:", err);
      return NextResponse.json(
        { error: "Failed to read uploaded file" },
        { status: 500 }
      );
    }

    let result;
    try {
      result = await uploadFileToS3(
        fileBuffer,
        file.originalFilename || "unnamed-file",
        file.mimetype || "application/octet-stream"
      );
    } catch (err) {
      console.error("Error uploading to S3:", err);
      return NextResponse.json(
        { error: "Failed to upload to S3" },
        { status: 500 }
      );
    }

    try {
      fs.unlinkSync(file.filepath);
    } catch (err) {
      console.warn("Failed to clean up temp file:", err);
    }

    if (result.success) {
      return NextResponse.json(
        {
          message: "File uploaded successfully",
          url: result.url,
          key: result.key,
          fileName: file.originalFilename,
          size: file.size,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed: " + error.message },
      { status: 500 }
    );
  }
}
