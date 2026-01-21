import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  const questions = await prisma.securityQuestion.findMany({
    select: { id: true, question: true },
    orderBy: { question: "asc" },
  });
  return NextResponse.json({ questions });
}
