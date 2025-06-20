import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    // Test authentication
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session?.user?.id;

    // Test database connection with a simple query
    let dbConnectionSuccess = false;
    let userCount = 0;
    let profileCount = 0;
    let dbError = null;

    try {
      // Test if we can count users (basic query)
      userCount = await prisma.user.count();
      // Test if we can count profiles
      profileCount = await prisma.profile.count();
      dbConnectionSuccess = true;
    } catch (error) {
      dbError = {
        message: error.message,
        code: error.code,
        meta: error.meta,
      };
      console.error("Database connection error:", error);
    }

    // Test environment variables (sanitized for security)
    const dbUrlStatus = process.env.DATABASE_URL
      ? "Set (starts with: " +
        process.env.DATABASE_URL.substring(0, 15) +
        "...)"
      : "Missing";

    // Get database URL components for diagnostics (without exposing credentials)
    let dbComponents = {};
    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        dbComponents = {
          protocol: url.protocol,
          host: url.host,
          pathname: url.pathname,
          // Do not include username or password for security
        };
      } catch (e) {
        dbComponents = { error: "Invalid database URL format" };
      }
    }

    return NextResponse.json(
      {
        diagnostics: {
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
          authentication: {
            isAuthenticated,
            sessionUserExists: !!session?.user,
            userId: isAuthenticated ? session.user.id : null,
          },
          database: {
            connectionSuccess: dbConnectionSuccess,
            userCount,
            profileCount,
            error: dbError,
            databaseUrl: dbUrlStatus,
            dbComponents,
          },
          prismaClient: {
            exists: !!prisma,
            hasUserModel: typeof prisma?.user?.findMany === "function",
            hasProfileModel: typeof prisma?.profile?.findMany === "function",
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API diagnostic error:", error);
    return NextResponse.json(
      {
        message: "Diagnostic error",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
