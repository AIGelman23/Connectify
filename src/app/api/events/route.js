import { NextResponse } from "next/server";
import { z } from "zod";
import { neon, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Required for Neon to work in local Node.js environments
if (typeof window === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const sql = neon(process.env.DATABASE_URL);

const RequestSchema = z.object({
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  type: z.enum(["all", "sports", "events", "music"]).default("all"),
  radius: z.coerce.number().default(30),
  size: z.coerce.number().default(10),
  timeframe: z.enum(["upcoming", "past", "all"]).default("upcoming"),
});

async function checkRateLimit(ip) {
  try {
    const windowSeconds = 60;
    const maxRequests = 20;
    const key = `rl_${ip}`;

    const result = await sql`
      INSERT INTO rate_limits (key, count, window_start)
      VALUES (${key}, 1, NOW())
      ON CONFLICT (key) DO UPDATE
      SET count = CASE 
          WHEN rate_limits.window_start + INTERVAL '1 second' * ${windowSeconds} <= NOW() THEN 1 
          ELSE rate_limits.count + 1 
        END,
        window_start = CASE 
          WHEN rate_limits.window_start + INTERVAL '1 second' * ${windowSeconds} <= NOW() THEN NOW() 
          ELSE rate_limits.window_start 
        END
      RETURNING count;
    `;
    return result[0].count <= maxRequests;
  } catch (e) {
    console.error("Rate limit DB error (skipping check):", e);
    return true; // Fallback: allow request if DB is down
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = RequestSchema.safeParse(Object.fromEntries(searchParams));

    if (!query.success) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 },
      );
    }

    const { lat, lon, type, radius, size, timeframe } = query.data;

    // Rate Limit Check
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const isAllowed = await checkRateLimit(ip);
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const API_KEY = process.env.TICKETMASTER_API_KEY;
    const now = new Date().toISOString().split(".")[0] + "Z";

    const params = new URLSearchParams({
      latlong: `${lat},${lon}`,
      radius: radius.toString(),
      unit: "miles",
      size: size.toString(),
      apikey: API_KEY,
    });

    // Timeframe Logic
    if (timeframe === "upcoming") {
      params.append("startDateTime", now);
      params.append("sort", "date,asc");
    } else if (timeframe === "past") {
      params.append("endDateTime", now);
      params.append("sort", "date,desc");
    }

    if (type !== "all") {
      params.append("classificationName", type);
    }

    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`,
      { next: { revalidate: 300 } },
    );

    const data = await response.json();
    return NextResponse.json({
      events: data._embedded?.events || [],
      timeframe,
    });
  } catch (error) {
    console.error("Critical API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", events: [] },
      { status: 500 },
    );
  }
}
