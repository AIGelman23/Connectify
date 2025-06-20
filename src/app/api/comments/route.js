// src/app/api/comments/route.js

import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth"; // <--- Keep this commented
// import authOptions from "@/lib/auth";       // <--- Keep this commented
// import prisma from "@/lib/prisma";           // <--- COMMENT OUT THIS IMPORT LINE!

export async function GET(request) {
  try {
    // Keep all internal logic commented out
    return NextResponse.json(
      { message: "Comments GET handler (testing prisma import)." },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error fetching comments:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}
// ... (POST and other handlers are still fully commented out inside) ...
