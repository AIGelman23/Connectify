// src/app/api/conversations/route.js

import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import authOptions from "@/lib/auth";
// import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    // const session = await getServerSession(authOptions); // KEEP THIS COMMENTED FOR NOW

    // if (!session || !session.user?.id) {
    //   return NextResponse.json(
    //     { message: "Unauthorized. Please log in." },
    //     { status: 401 }
    //   );
    // }

    // Comment out ALL other logic, including Prisma calls and transformations
    // ...

    return NextResponse.json(
      { message: "Conversations GET handler (testing prisma import)." },
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
    // const session = await getServerSession(authOptions); // KEEP THIS COMMENTED FOR NOW

    // if (!session || !session.user?.id) {
    //   console.error("Unauthorized POST request to conversations API.");
    //   return NextResponse.json(
    //     { message: "Unauthorized. Please log in." },
    //     { status: 401 }
    //   );
    // }

    // Comment out ALL other logic, including request.json() and Prisma calls
    // ...

    return NextResponse.json(
      { message: "Conversations POST handler (testing prisma import)." },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}
