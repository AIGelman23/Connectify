// src/app/api/connections/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(req) {
  return new Response(JSON.stringify({ message: "Not implemented." }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req) {
  return new Response(JSON.stringify({ message: "Not implemented." }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
}

export async function PUT(req) {
  return new Response(JSON.stringify({ message: "Not implemented." }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
}
