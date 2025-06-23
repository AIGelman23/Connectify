import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";

// Create a rate limiter for password resets
const resetLimiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // Max requests per unique identifier per interval
});

export async function POST(req) {
  try {
    console.log("Forgot password API route called");

    // Get client IP for rate limiting
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    // Get request body
    const body = await req.json().catch((e) => {
      console.error("Error parsing JSON body:", e);
      return {};
    });
    const { email } = body;

    console.log("Email received:", email);

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Apply rate limiting based on IP and email
    const identifier = `${ip}_${email.toLowerCase()}`;
    const rateCheckResult = await resetLimiter.check(identifier);

    if (!rateCheckResult.success) {
      return NextResponse.json(
        {
          message:
            "Too many password reset attempts. Please wait and try again later.",
          retryAfter: Math.ceil((rateCheckResult.resetAt - Date.now()) / 1000), // seconds until reset
        },
        { status: 429 } // Too Many Requests
      );
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Hash the token for security
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // If user exists, update with token
      if (user) {
        console.log(`Updating user ${user.id} with reset token`);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: resetTokenExpiry,
          },
        });
      }

      // Don't reveal if user exists or not
      // When building the reset URL, make sure the URL is properly formatted
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      // Ensure there's no double slash between baseUrl and the path
      const resetUrl = `${baseUrl.replace(
        /\/+$/,
        ""
      )}/auth/reset-password?token=${resetToken}`;

      console.log("Reset URL (dev only):", resetUrl);

      return NextResponse.json(
        {
          message:
            "If your email exists in our system, you will receive a password reset link shortly.",
          resetLink:
            process.env.NODE_ENV === "development" ? resetUrl : undefined,
        },
        { status: 200 }
      );
    } catch (dbError) {
      console.error("Database operation failed:", dbError);
      return NextResponse.json(
        { message: "Database operation failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  } finally {
    // Disconnect Prisma client to avoid hanging connections
    await prisma.$disconnect();
  }
}
