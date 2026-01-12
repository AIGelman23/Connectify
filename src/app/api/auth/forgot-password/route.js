import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { sendPasswordResetCodeEmail } from "@/utils/email";

// Create a rate limiter for password resets
const resetLimiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // Max requests per unique identifier per interval
});

/**
 * Generate a cryptographically secure 6-digit code
 */
function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

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
          retryAfter: Math.ceil((rateCheckResult.resetAt - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    // Generate a 6-digit verification code
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash the code for security
    const hashedCode = crypto
      .createHash("sha256")
      .update(verificationCode)
      .digest("hex");

    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // If user exists, create password reset entry
      if (user) {
        console.log(`Creating password reset for user ${user.id}`);

        // Delete any existing password reset entries for this user
        await prisma.passwordReset.deleteMany({
          where: { userId: user.id },
        });

        // Create new password reset entry with the code
        await prisma.passwordReset.create({
          data: {
            token: hashedCode,
            userId: user.id,
            email: email.toLowerCase(),
            expiresAt: codeExpiry,
            attempts: 0,
            verified: false,
          },
        });

        // Send the verification code email
        try {
          await sendPasswordResetCodeEmail(
            email.toLowerCase(),
            verificationCode,
            user.name
          );
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
          // Don't fail the request if email fails - the code is still in the DB
        }
      }

      // Don't reveal if user exists or not
      return NextResponse.json(
        {
          message:
            "If your email exists in our system, you will receive a verification code shortly.",
          // In development, return the code for testing
          code:
            process.env.NODE_ENV === "development" ? verificationCode : undefined,
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
