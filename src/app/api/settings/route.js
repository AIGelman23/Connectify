import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET - Fetch user settings
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { settings: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Safely handle null/undefined settings from database
    const settings =
      user.settings && typeof user.settings === "object" ? user.settings : {};

    return NextResponse.json({
      success: true,
      settings: settings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings", details: error.message },
      { status: 500 },
    );
  }
}

// PUT - Update user settings
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "Invalid settings data" },
        { status: 400 },
      );
    }

    // Validate settings keys (optional - add allowed keys here)
    const allowedKeys = [
      "fontSize",
      "compactMode",
      "autoPlayVideos",
      "reduceAnimations",
      "profileVisibility",
      "defaultPostVisibility",
      "showActivityStatus",
      "searchIndexing",
      "allowTagging",
      "whoCanMessage",
      "notificationsEnabled",
      "emailNotifications",
      "pushNotifications",
      "notificationSound",
      "notifyLikes",
      "notifyComments",
      "notifyConnectionRequests",
      "notifyMessages",
      "notifyMentions",
      "autoCaptions",
      "highContrast",
      "keyboardShortcuts",
      "reduceFlashing",
      "screenReaderOptimized",
      "language",
      "region",
      "timezone",
      "dateFormat",
      "dataSaver",
      "autoDownloadImages",
      "autoDownloadVideos",
    ];

    // Filter to only allowed keys
    const filteredSettings = Object.keys(settings)
      .filter((key) => allowedKeys.includes(key))
      .reduce((obj, key) => {
        obj[key] = settings[key];
        return obj;
      }, {});

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { settings: filteredSettings },
      select: { settings: true },
    });

    return NextResponse.json({
      success: true,
      settings: updatedUser.settings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}

// PATCH - Partially update user settings (merge with existing)
export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 },
      );
    }

    // Get current settings
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { settings: true },
    });

    // Safely handle null/undefined settings from database
    const currentSettings =
      user?.settings && typeof user.settings === "object" ? user.settings : {};
    const updatedSettings = { ...currentSettings, [key]: value };

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { settings: updatedSettings },
      select: { settings: true },
    });

    return NextResponse.json({
      success: true,
      settings: updatedUser.settings,
    });
  } catch (error) {
    console.error("Error updating setting:", error);
    return NextResponse.json(
      { error: "Failed to update setting", details: error.message },
      { status: 500 },
    );
  }
}
