import { NextResponse } from "next/server";

// Simple cache for link previews
const previewCache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Check cache
    const cached = previewCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkPreviewBot/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch URL" },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Extract metadata
    const metadata = extractMetadata(html, parsedUrl);

    // Cache the result
    previewCache.set(url, {
      data: metadata,
      timestamp: Date.now(),
    });

    // Clean up old cache entries periodically
    if (previewCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of previewCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          previewCache.delete(key);
        }
      }
    }

    return NextResponse.json(metadata);
  } catch (error) {
    console.error("Link preview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch preview" },
      { status: 500 }
    );
  }
}

function extractMetadata(html, baseUrl) {
  const metadata = {
    title: null,
    description: null,
    image: null,
    siteName: null,
  };

  // Extract Open Graph tags
  const ogTags = {
    "og:title": "title",
    "og:description": "description",
    "og:image": "image",
    "og:site_name": "siteName",
  };

  for (const [property, key] of Object.entries(ogTags)) {
    const match = html.match(
      new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i")
    ) || html.match(
      new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, "i")
    );
    if (match) {
      metadata[key] = match[1];
    }
  }

  // Fallback to Twitter cards
  const twitterTags = {
    "twitter:title": "title",
    "twitter:description": "description",
    "twitter:image": "image",
  };

  for (const [name, key] of Object.entries(twitterTags)) {
    if (!metadata[key]) {
      const match = html.match(
        new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, "i")
      ) || html.match(
        new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, "i")
      );
      if (match) {
        metadata[key] = match[1];
      }
    }
  }

  // Fallback to regular meta tags and title
  if (!metadata.title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }
  }

  if (!metadata.description) {
    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
    ) || html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i
    );
    if (descMatch) {
      metadata.description = descMatch[1];
    }
  }

  // Resolve relative image URLs
  if (metadata.image && !metadata.image.startsWith("http")) {
    try {
      metadata.image = new URL(metadata.image, baseUrl.origin).href;
    } catch {
      metadata.image = null;
    }
  }

  // Decode HTML entities
  for (const key of Object.keys(metadata)) {
    if (typeof metadata[key] === "string") {
      metadata[key] = decodeHtmlEntities(metadata[key]);
    }
  }

  return metadata;
}

function decodeHtmlEntities(text) {
  const entities = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };

  return text.replace(/&[^;]+;/g, (match) => entities[match] || match);
}
