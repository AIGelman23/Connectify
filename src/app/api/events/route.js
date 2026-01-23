import { NextResponse } from "next/server";

// Simple in-memory cache to avoid rate limits
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const type = searchParams.get("type") || "all"; // "all", "sports", or "events"
  const radius = searchParams.get("radius") || "30";
  const size = searchParams.get("size") || "4";

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Missing lat/lon parameters" },
      { status: 400 }
    );
  }

  const API_KEY =
    process.env.TICKETMASTER_API_KEY ||
    process.env.NEXT_PUBLIC_TICKETMASTER_API;

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Ticketmaster API key not configured" },
      { status: 500 }
    );
  }

  // Build cache key
  const cacheKey = `${lat}-${lon}-${type}-${radius}-${size}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    let url = `https://app.ticketmaster.com/discovery/v2/events.json?latlong=${lat},${lon}&radius=${radius}&unit=km&sort=date,asc&size=${size}&apikey=${API_KEY}`;

    // Add sports filter if requested
    if (type === "sports") {
      url += "&classificationName=Sports";
    }

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        // Return cached data if available, even if expired
        if (cached) {
          return NextResponse.json(cached.data);
        }
        return NextResponse.json(
          { error: "Rate limited", events: [] },
          { status: 429 }
        );
      }
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }

    const data = await response.json();
    const events = data._embedded?.events || [];

    const result = { events };

    // Cache the result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching events:", error);

    // Return cached data if available
    if (cached) {
      return NextResponse.json(cached.data);
    }

    return NextResponse.json(
      { error: "Failed to fetch events", events: [] },
      { status: 500 }
    );
  }
}
