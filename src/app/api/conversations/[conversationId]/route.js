// src/app/api/conversations/[conversationId]/route.js

import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import authOptions from "@/lib/auth";
// import prisma from "@/lib/prisma";

// For debugging, comment out all logic that uses prisma or authOptions
export async function GET(request, { params }) {
  try {
    return NextResponse.json(
      { message: "Conversations GET handler (testing prisma import)." },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error fetching conversation:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    // ...existing code commented out...
    return NextResponse.json(
      { message: "Conversation DELETE handler (testing prisma import)." },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}
