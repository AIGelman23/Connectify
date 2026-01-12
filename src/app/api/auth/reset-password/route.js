import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { message: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Hash the token to match stored format
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find the reset token in the database - must be verified
    const passwordReset = await prisma.passwordReset.findFirst({
      where: {
        token: hashedToken,
        verified: true, // Only allow verified codes
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    // Debug: log what was found
    if (!passwordReset) {
      console.error("Invalid, expired, or unverified reset token");
      return NextResponse.json(
        { message: "Invalid or expired reset token. Please start over." },
        { status: 400 }
      );
    }

    // Defensive: check if user exists
    if (!passwordReset.user) {
      console.error("No user found for this reset token");
      return NextResponse.json(
        { message: "No user found for this reset token" },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password and delete the reset token in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: passwordReset.userId },
        data: { hashedPassword },
      }),
      prisma.passwordReset.delete({
        where: { id: passwordReset.id },
      }),
    ]);

    return NextResponse.json(
      { message: "Password has been reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    // Log the error for debugging
    console.error("Password reset API error:", error);
    return NextResponse.json(
      { message: "Failed to reset password", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
