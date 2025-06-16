// src/app/api/register/route.js

// This is a client-side API route for user registration.
// It receives email and password, hashes the password, and creates a new user in the database.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Assuming your Prisma client is exported as default from here
import bcrypt from "bcrypt";

export async function POST(request) {
  try {
    const { email, password, name } = await request.json(); // Destructure name as well

    // Input validation (basic)
    if (!email || !password || !name) {
      return NextResponse.json(
        { message: "Email, password, and name are required." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists." },
        { status: 409 }
      );
    }

    // Hash the password
    // The salt rounds determine the computational cost of hashing. 10-12 is generally good.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user in the database
    const newUser = await prisma.user.create({
      data: {
        email: email,
        // FIX: Changed 'password' to 'hashedPassword' to match Prisma schema
        hashedPassword: hashedPassword,
        name: name, // Ensure 'name' is captured and stored
        // Your schema has a default role, so explicitly setting it might not be strictly needed
        // but it doesn't hurt. Ensure 'USER' matches your enum `Role` casing.
        // role: 'USER', // Ensure this matches your enum definition if used.
        profile: {
          create: {
            // Create an empty profile for the new user upon registration
            // Set isProfileComplete to false by default, as it's not filled out yet.
            bio: "",
            headline: "",
            resumeUrl: "",
            isProfileComplete: false, // Explicitly set to false on initial creation
            profilePictureUrl: "",
            coverPhotoUrl: "",
            // Experiences are handled separately and will be empty on initial profile creation
          },
        },
      },
      include: {
        profile: true, // Include the newly created profile in the response
      },
    });

    // Respond with success
    // Do not send the hashedPassword back in the response for security reasons.
    return NextResponse.json(
      {
        message: "User registered successfully!",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          profile: newUser.profile,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    // More specific error handling could be added here (e.g., Prisma error codes)
    return NextResponse.json(
      { message: "Something went wrong during registration." },
      { status: 500 }
    );
  }
}

// You don't need a GET method for a registration API endpoint, but it's good practice
// to explicitly define what methods are allowed.
// export async function GET() {
//   return NextResponse.json({ message: 'GET method not allowed for registration.' }, { status: 405 });
// }
