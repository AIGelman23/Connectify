import { createId } from "@paralleldrive/cuid2";

// Cache configuration: 15 minutes
const CACHE_TTL = 15 * 60 * 1000;
const cache = {};

export const fetchNewsApi = async (category) => {
  const cacheKey = category || "general";
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL) {
    return cache[cacheKey].data;
  }

  try {
    // Fetch from internal API route to avoid exposing API key on client
    const url = category ? `/api/news?category=${category}` : `/api/news`;
    const response = await fetch(url);

    if (response.status === 404) {
      console.warn(
        `News API route not found (404) at ${url}. Please ensure src/app/api/news/route.js exists and restart your server.`
      );
      return [];
    }

    if (!response.ok) {
      console.warn(`News API Error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.warn("News API Error:", data.error);
      // Return cached data if available on error, otherwise empty
      return cache[cacheKey]?.data || [];
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const newsItems = (data.articles || [])
      // Filter out articles older than 7 days
      .filter((article) => {
        if (!article.publishedAt) return false;
        const pubTime = new Date(article.publishedAt).getTime();
        return pubTime >= sevenDaysAgo;
      })
      // Sort by publication date (newest first)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .map((article) => ({
        id: createId(),
        type: "news",
        title: article.title,
        link: article.url,
        pubDate: article.publishedAt,
        source: article.source.name,
        imageUrl: article.urlToImage || undefined,
        contentSnippet: article.description,
      }));

    cache[cacheKey] = {
      timestamp: now,
      data: newsItems,
    };

    return newsItems;
  } catch (error) {
    console.error("Error fetching from NewsAPI:", error);
    return [];
  }
};
