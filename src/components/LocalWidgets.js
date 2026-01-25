"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useGeolocation } from "../hooks/useGeolocation";

export default function LocalWidgets() {
  const { location, city, error } = useGeolocation();
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [placesError, setPlacesError] = useState(null);
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState(null);
  const [newsCategory, setNewsCategory] = useState("general");
  const categories = [
    "general",
    "business",
    "technology",
    "entertainment",
    "health",
    "science",
    "sports",
  ];
  const [sports, setSports] = useState([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [sportsError, setSportsError] = useState(null);

  // Fetch weather when location is available
  useEffect(() => {
    if (location) {
      setLoadingWeather(true);
      setWeatherError(null);
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph`,
      )
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch weather");
          return res.json();
        })
        .then((data) => setWeather(data.current_weather))
        .catch((err) => {
          console.error("Failed to fetch weather:", err);
          setWeatherError("Weather unavailable");
        })
        .finally(() => setLoadingWeather(false));
    }
  }, [location]);

  // Fetch events when location is available
  useEffect(() => {
    if (location) {
      setLoadingEvents(true);
      setEventsError(null);

      fetch(
        `/api/events?lat=${location.latitude}&lon=${location.longitude}&type=all&radius=20&size=3`,
      )
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch events");
          return res.json();
        })
        .then((data) => {
          if (data.events) {
            setEvents(data.events);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch events:", err);
          setEventsError("Events unavailable");
        })
        .finally(() => setLoadingEvents(false));
    }
  }, [location]);

  // Fetch nearby places (Local Stuff) using Overpass API (OpenStreetMap)
  useEffect(() => {
    if (location) {
      setLoadingPlaces(true);
      setPlacesError(null);
      // Query for cafes, restaurants, bars, and pubs within 1000 meters (1km) - Reduced radius to prevent timeouts
      // Added [timeout:10] to fail fast if server is overloaded
      const query = `[out:json][timeout:10];node(around:1000,${location.latitude},${location.longitude})[amenity~"^(cafe|restaurant|bar|pub)$"];out 5;`;
      const url = `${
        process.env.NEXT_PUBLIC_OVERPASS_API_URL ||
        "https://overpass-api.de/api/interpreter"
      }?data=${encodeURIComponent(query)}`;

      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch places");
          return res.json();
        })
        .then((data) => {
          if (data.elements) {
            setNearbyPlaces(data.elements);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch nearby places:", err);
          setPlacesError("Places unavailable");
        })
        .finally(() => setLoadingPlaces(false));
    }
  }, [location]);

  // Fetch local sports events from Ticketmaster via proxy
  useEffect(() => {
    if (location) {
      setLoadingSports(true);
      setSportsError(null);

      fetch(
        `/api/events?lat=${location.latitude}&lon=${location.longitude}&type=sports&radius=50&size=4`,
      )
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch sports");
          return res.json();
        })
        .then((data) => {
          if (data.events) {
            setSports(data.events);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch sports events:", err);
          setSportsError("Sports unavailable");
        })
        .finally(() => setLoadingSports(false));
    }
  }, [location]);

  // Fetch Local/Trending News
  useEffect(() => {
    setLoadingNews(true);
    setNewsError(null);

    const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY;

    // If we have a News API key and city, fetch local news
    if (NEWS_API_KEY && city) {
      fetch(
        `https://newsapi.org/v2/everything?q="${city}"&sortBy=publishedAt&pageSize=4&apiKey=${NEWS_API_KEY}`,
      )
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch news");
          return res.json();
        })
        .then((data) => {
          if (data.articles && data.articles.length > 0) {
            setNews(data.articles.slice(0, 4));
          } else {
            // Fallback to category news if no local results
            return fetchCategoryNews();
          }
        })
        .catch((err) => {
          console.error("Failed to fetch local news:", err);
          // Fallback to category news on error
          fetchCategoryNews();
        })
        .finally(() => setLoadingNews(false));
    } else {
      // Fallback: use free category-based news
      fetchCategoryNews();
    }

    function fetchCategoryNews() {
      return fetch(
        `https://saurav.tech/NewsAPI/top-headlines/category/${newsCategory}/us.json`,
      )
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch news");
          return res.json();
        })
        .then((data) => {
          if (data.articles) {
            setNews(data.articles.slice(0, 4));
          }
        })
        .catch((err) => {
          console.error("Failed to fetch news:", err);
          setNewsError("News unavailable");
        })
        .finally(() => setLoadingNews(false));
    }
  }, [newsCategory, city]);

  if (error) {
    return (
      <div className="p-4 mb-4 text-sm text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mx-4 lg:mx-0">
        Unable to load local content: {error}
      </div>
    );
  }

  if (!location) {
    return (
      <div className="p-4 mb-4 text-sm text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg animate-pulse mx-4 lg:mx-0">
        Locating local content...
      </div>
    );
  }

  return (
    <div className="flex flex-row lg:flex-col gap-4 mb-6 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
      {/* Weather Widget */}
      <div className="min-w-[280px] w-[85vw] sm:w-[350px] lg:w-full flex-shrink-0 snap-center bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-500 dark:text-slate-400">
            Weather
          </h3>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {city || "Local"}
          </span>
        </div>
        {loadingWeather ? (
          <WeatherSkeleton />
        ) : weatherError ? (
          <div className="text-sm text-red-500 dark:text-red-400">
            {weatherError}
          </div>
        ) : weather ? (
          <div className="flex items-center">
            <div className="mr-4 text-4xl">🌤️</div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {Math.round(weather.temperature)}°F
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                Wind: {Math.round(weather.windspeed)} mph
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 dark:text-slate-500 text-sm">
            Loading forecast...
          </div>
        )}
      </div>

      {/* Local Sports Widget */}
      <div className="min-w-[280px] w-[85vw] sm:w-[350px] lg:w-full flex-shrink-0 snap-center bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-500 dark:text-slate-400">
            Local Sports
          </h3>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {city || "Nearby"}
          </span>
        </div>
        {loadingSports ? (
          <ListSkeleton />
        ) : sportsError ? (
          <div className="text-sm text-red-500 dark:text-red-400">
            {sportsError}
          </div>
        ) : sports.length > 0 ? (
          <ul className="space-y-1">
            {sports.map((event) => {
              const eventDate = event.dates?.start?.localDate
                ? new Date(event.dates.start.localDate)
                : new Date();
              const eventTime = event.dates?.start?.localTime || "";
              const sportType =
                event.classifications?.[0]?.subGenre?.name ||
                event.classifications?.[0]?.genre?.name ||
                "Sports";

              // Pick emoji based on sport type
              const getSportEmoji = (type) => {
                const t = type.toLowerCase();
                if (t.includes("basketball")) return "🏀";
                if (t.includes("football") || t.includes("nfl")) return "🏈";
                if (t.includes("soccer") || t.includes("mls")) return "⚽";
                if (t.includes("baseball") || t.includes("mlb")) return "⚾";
                if (t.includes("hockey") || t.includes("nhl")) return "🏒";
                if (t.includes("tennis")) return "🎾";
                if (t.includes("golf")) return "⛳";
                if (
                  t.includes("boxing") ||
                  t.includes("mma") ||
                  t.includes("ufc")
                )
                  return "🥊";
                if (t.includes("racing") || t.includes("nascar")) return "🏎️";
                return "🏆";
              };

              return (
                <li
                  key={event.id}
                  className="flex items-start p-2 -mx-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-md transition-colors"
                >
                  <span className="mr-3 text-xl">
                    {getSportEmoji(sportType)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block truncate"
                    >
                      {event.name}
                    </a>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {eventDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {eventTime && ` • ${eventTime.slice(0, 5)}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-gray-400 dark:text-slate-500 text-sm">
            No sports events found nearby.
          </div>
        )}
      </div>

      {/* Local Events Widget */}
      <div className="min-w-[280px] w-[85vw] sm:w-[350px] lg:w-full flex-shrink-0 snap-center bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-500 dark:text-slate-400">
            Events
          </h3>
          <Link
            href="/dashboard/events"
            className="text-xs text-blue-500 hover:underline"
          >
            See All
          </Link>
        </div>
        {loadingEvents ? (
          <ListSkeleton />
        ) : eventsError ? (
          <div className="text-sm text-red-500 dark:text-red-400">
            {eventsError}
          </div>
        ) : events.length > 0 ? (
          <ul className="space-y-1">
            {events.map((event) => {
              const eventDate = event.dates?.start?.localDate
                ? new Date(event.dates.start.localDate)
                : new Date();
              return (
                <li
                  key={event.id}
                  className="flex items-start p-2 -mx-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-md transition-colors"
                >
                  <div className="mr-3 flex-shrink-0 w-10 text-center bg-red-50 dark:bg-red-900/20 rounded-md overflow-hidden border border-red-100 dark:border-red-800">
                    <div className="bg-red-500 text-white text-[10px] font-bold uppercase py-0.5">
                      {eventDate.toLocaleString("default", { month: "short" })}
                    </div>
                    <div className="text-gray-900 dark:text-slate-100 font-bold text-sm py-1">
                      {eventDate.getDate()}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block truncate"
                    >
                      {event.name}
                    </a>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                      {event._embedded?.venues?.[0]?.name || "Local Venue"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-gray-400 dark:text-slate-500 text-sm">
            No events found.
          </div>
        )}
      </div>

      {/* Nearby Places Widget (New) */}
      <div className="min-w-[280px] w-[85vw] sm:w-[350px] lg:w-full flex-shrink-0 snap-center bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-500 dark:text-slate-400">
            Nearby Gems
          </h3>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            ~2km
          </span>
        </div>
        {loadingPlaces ? (
          <ListSkeleton />
        ) : placesError ? (
          <div className="text-sm text-red-500 dark:text-red-400">
            {placesError}
          </div>
        ) : nearbyPlaces.length > 0 ? (
          <ul className="space-y-2">
            {nearbyPlaces.map((place) => (
              <li
                key={place.id}
                className="flex items-start p-2 -mx-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-md transition-colors"
              >
                <span className="mr-3 text-xl">
                  {place.tags.amenity === "cafe"
                    ? "☕"
                    : place.tags.amenity === "bar" ||
                        place.tags.amenity === "pub"
                      ? "🍺"
                      : "🍽️"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                    {place.tags.name || "Unnamed Place"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 capitalize truncate">
                    {place.tags.cuisine || place.tags.amenity}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-400 dark:text-slate-500 text-sm">
            Finding local spots...
          </div>
        )}
      </div>

      {/* Local/Trending News Widget */}
      <div className="min-w-[280px] w-[85vw] sm:w-[350px] lg:w-full flex-shrink-0 snap-center bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-500 dark:text-slate-400">
            {process.env.NEXT_PUBLIC_NEWS_API_KEY && city
              ? `${city} News`
              : "Trending News"}
          </h3>
          <select
            value={newsCategory}
            onChange={(e) => setNewsCategory(e.target.value)}
            className="text-xs border-none bg-transparent text-blue-500 font-medium focus:ring-0 cursor-pointer outline-none dark:bg-slate-800"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {loadingNews ? (
          <ListSkeleton />
        ) : newsError ? (
          <div className="text-sm text-red-500 dark:text-red-400">
            {newsError}
          </div>
        ) : news.length > 0 ? (
          <ul className="space-y-3">
            {news.map((article, index) => (
              <li key={index} className="flex items-start">
                {article.urlToImage && (
                  <img
                    src={article.urlToImage}
                    alt={article.title}
                    className="w-16 h-16 object-cover rounded-md mr-3 bg-gray-100 dark:bg-slate-700 flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2"
                  >
                    {article.title}
                  </a>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 truncate">
                    {article.source.name}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-400 dark:text-slate-500 text-sm">
            Loading headlines...
          </div>
        )}
      </div>

      {/* Local Ads Widget */}
      <div className="min-w-[280px] w-[85vw] sm:w-[350px] lg:w-full flex-shrink-0 snap-center bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-500 dark:text-slate-400">
            Sponsored
          </h3>
        </div>
        <div className="flex items-start space-x-3">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-md flex-shrink-0 flex items-center justify-center text-2xl">
            ☕
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
              The Daily Grind
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-tight">
              Best Coffee in {city || "Town"}! Get 50% off first order.
            </p>
          </div>
        </div>
        <button className="mt-3 w-full py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 text-sm font-semibold rounded-md transition-colors">
          Get Coupon
        </button>
      </div>
    </div>
  );
}

const ListSkeleton = () => (
  <div className="animate-pulse space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded"></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    ))}
  </div>
);

const WeatherSkeleton = () => (
  <div className="animate-pulse flex items-center">
    <div className="mr-4 w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
    <div className="space-y-2 flex-1">
      <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
    </div>
  </div>
);
