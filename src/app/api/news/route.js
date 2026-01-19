import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  // Check for the API key in environment variables
  const API_KEY = process.env.NEWS_API_KEY || process.env.NEWS_KEY;
  const BASE_URL = "https://newsapi.org/v2/top-headlines?country=us";

  if (!API_KEY) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  try {
    const url = category
      ? `${BASE_URL}&category=${category}&apiKey=${API_KEY}`
      : `${BASE_URL}&apiKey=${API_KEY}`;

    const response = await fetch(url, { next: { revalidate: 900 } }); // Cache for 15 minutes
    const data = await response.json();

    if (data.status === "error") {
      return NextResponse.json({ error: data.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("News API Proxy Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}
