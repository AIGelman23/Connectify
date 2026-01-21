import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";

// Stricter rate limiting for code verification (brute-force protection)
const verifyLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // Max 5 attempts per 15 minutes
});

const MAX_CODE_ATTEMPTS = 5;

export async function POST(req) {
  try {
    const { email, code } = await req.json();

    // Validate inputs
    if (!email || !code) {
      return NextResponse.json(
        { message: "Email and code are required" },
        { status: 400 }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { message: "Invalid code format. Please enter a 6-digit code." },
        { status: 400 }
      );
    }

    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const identifier = `verify_${ip}_${email.toLowerCase()}`;
    const rateCheckResult = await verifyLimiter.check(identifier);

    if (!rateCheckResult.success) {
      return NextResponse.json(
        { message: "Too many attempts. Please request a new code." },
        { status: 429 }
      );
    }

    // Hash the provided code
    const hashedCode = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");

    // Find the password reset entry
    const passwordReset = await prisma.passwordReset.findFirst({
      where: {
        email: email.toLowerCase(),
        token: hashedCode,
        expiresAt: { gt: new Date() },
        verified: false,
      },
      include: { user: true },
    });

    if (!passwordReset) {
      // Code is invalid - increment attempts on any existing entry
      const existingEntry = await prisma.passwordReset.findFirst({
        where: {
          email: email.toLowerCase(),
          verified: false,
        },
      });

      if (existingEntry) {
        const newAttempts = existingEntry.attempts + 1;

        if (newAttempts >= MAX_CODE_ATTEMPTS) {
          // Invalidate the code after too many attempts
          await prisma.passwordReset.delete({
            where: { id: existingEntry.id },
          });
          return NextResponse.json(
            { message: "Too many failed attempts. Please request a new code." },
            { status: 400 }
          );
        }

        // Increment attempts counter
        await prisma.passwordReset.update({
          where: { id: existingEntry.id },
          data: { attempts: newAttempts },
        });
      }

      return NextResponse.json(
        { message: "Invalid or expired code. Please try again." },
        { status: 400 }
      );
    }

    // Check if max attempts reached (shouldn't happen if code is correct, but safety check)
    if (passwordReset.attempts >= MAX_CODE_ATTEMPTS) {
      await prisma.passwordReset.delete({
        where: { id: passwordReset.id },
      });
      return NextResponse.json(
        { message: "Too many failed attempts. Please request a new code." },
        { status: 400 }
      );
    }

    // Generate a reset session token for the password change step
    const resetSessionToken = crypto.randomBytes(32).toString("hex");
    const hashedSessionToken = crypto
      .createHash("sha256")
      .update(resetSessionToken)
      .digest("hex");

    // Mark as verified and store session token
    await prisma.passwordReset.update({
      where: { id: passwordReset.id },
      data: {
        verified: true,
        token: hashedSessionToken, // Replace code with session token
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes to set password
      },
    });

    return NextResponse.json(
      {
        message: "Code verified successfully",
        resetToken: resetSessionToken,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Code verification error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
