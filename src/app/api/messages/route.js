import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import authOptions from "@/lib/auth";
// import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    // ...existing code commented out...
    return NextResponse.json(
      { message: "Messages GET handler (testing prisma import)." },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // ...existing code commented out...
    return NextResponse.json(
      { message: "Messages POST handler (testing prisma import)." },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}
