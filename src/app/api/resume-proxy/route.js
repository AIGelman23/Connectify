// src/app/api/resume-proxy/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next"; // ← use /next
import authOptions from "@/lib/auth"; // ← default export
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      console.error("DEBUG: Unauthorized access attempt to resume proxy.");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    // Explicitly decode the URL component to ensure it's clean
    const s3ResumeUrlEncoded = searchParams.get("url");
    const s3ResumeUrl = s3ResumeUrlEncoded
      ? decodeURIComponent(s3ResumeUrlEncoded)
      : null;

    if (!s3ResumeUrl) {
      console.error("DEBUG: Missing resume URL parameter for proxy.");
      return new NextResponse("Missing resume URL parameter.", { status: 400 });
    }

    // Get the configured S3 bucket name from environment variables
    const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

    // --- ENHANCED DEBUG LOG START ---
    console.log("DEBUG: Incoming s3ResumeUrl (after decode):", s3ResumeUrl);
    console.log(
      "DEBUG: Raw process.env.AWS_S3_BUCKET_NAME:",
      process.env.AWS_S3_BUCKET_NAME
    );
    console.log("DEBUG: Resolved BUCKET_NAME variable:", BUCKET_NAME);
    // --- ENHANCED DEBUG LOG END ---

    if (!BUCKET_NAME || BUCKET_NAME.trim() === "") {
      console.error(
        "DEBUG: AWS_S3_BUCKET_NAME is not configured or is empty in environment variables."
      );
      return new NextResponse(
        "Server configuration error: S3 bucket name is missing or empty.",
        { status: 500 }
      );
    }

    let isS3Domain = false;
    let isCorrectBucket = false;
    let parsedUrl;

    try {
      parsedUrl = new URL(s3ResumeUrl);

      const s3Hostname = parsedUrl.hostname;
      // *** MODIFIED LOGIC HERE: Use more inclusive 'includes' for S3 domain check ***
      // This checks if the hostname contains both the S3 service identifier and the AWS domain.
      isS3Domain =
        s3Hostname.includes(".s3.") && s3Hostname.includes(".amazonaws.com");

      // Check if the hostname includes the specific bucket name
      isCorrectBucket = s3Hostname.includes(BUCKET_NAME.trim());
    } catch (e) {
      console.error(
        "DEBUG: Failed to parse s3ResumeUrl as a valid URL:",
        s3ResumeUrl,
        e
      );
      return new NextResponse("Invalid resume URL format.", { status: 400 });
    }

    // --- ENHANCED DEBUG LOG FOR URL OBJECT ---
    console.log("DEBUG: parsedUrl.hostname:", parsedUrl.hostname);
    console.log("DEBUG: isS3Domain (using hostname.includes):", isS3Domain);
    console.log(
      "DEBUG: isCorrectBucket (using hostname.includes):",
      isCorrectBucket
    );
    // --- END ENHANCED DEBUG LOG ---

    if (!isS3Domain || !isCorrectBucket) {
      let errorMessage = "Invalid or unauthorized resume URL.";
      if (!isS3Domain) {
        errorMessage += " URL does not appear to be an S3 domain.";
      } else if (!isCorrectBucket) {
        errorMessage +=
          " The URL does not match the configured S3 bucket name.";
      }
      console.error(
        "DEBUG: URL validation failed. s3ResumeUrl:",
        s3ResumeUrl,
        "BUCKET_NAME:",
        BUCKET_NAME,
        "isS3Domain:",
        isS3Domain,
        "isCorrectBucket:",
        isCorrectBucket
      );
      return new NextResponse(errorMessage, { status: 403 });
    }

    // Fetch the PDF from S3
    const response = await fetch(s3ResumeUrl);

    if (!response.ok) {
      console.error(
        `DEBUG: Failed to fetch resume from S3: ${response.status} ${response.statusText}. URL: ${s3ResumeUrl}`
      );
      return new NextResponse(
        `Failed to fetch resume: ${response.statusText}`,
        { status: response.status }
      );
    }

    // Ensure the response is a PDF
    const contentType = response.headers.get("Content-Type");
    if (!contentType || !contentType.includes("application/pdf")) {
      console.error(
        "DEBUG: Fetched file is not a PDF:",
        contentType,
        "for URL:",
        s3ResumeUrl
      );
      return new NextResponse("Fetched document is not a PDF.", {
        status: 400,
      });
    }

    // Stream the PDF content back to the client
    const headers = new Headers(response.headers);
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", "inline"); // Crucial for displaying in iframe

    return new NextResponse(response.body, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error("DEBUG: Resume proxy API Error:", error);
    return new NextResponse(`Internal server error: ${error.message}`, {
      status: 500,
    });
  }
}
