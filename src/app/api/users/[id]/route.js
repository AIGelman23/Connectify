import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request, context) {
  // Correct async usage for Next.js 15+ dynamic API routes
  const params = await context.params;
  const { id } = params;

  console.log(id);

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: {
        include: {
          experiences: true,
          education: true,
          skills: true,
        },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ user });
}
