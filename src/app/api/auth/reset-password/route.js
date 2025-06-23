import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { message: "Token and password are required" },
        { status: 400 }
      );
    }

    // Find the reset token in the database
    const passwordReset = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    // Debug: log what was found
    if (!passwordReset) {
      console.error("Invalid or expired reset token", { token });
      return NextResponse.json(
        { message: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Check if the token is expired (tokens are valid for 1 hour)
    const now = new Date();
    if (passwordReset.expiresAt < now) {
      console.error("Reset token has expired", { token });
      return NextResponse.json(
        { message: "Reset token has expired" },
        { status: 400 }
      );
    }

    // Defensive: check if user exists
    if (!passwordReset.user) {
      console.error("No user found for this reset token", { token });
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
  }
}
