"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navbar from "../../../components/NavBar";
import { useGeolocation } from "../../../hooks/useGeolocation";

// Dynamically import the Map component to avoid SSR issues
const EventMap = dynamic(() => import("../../../components/EventMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl flex items-center justify-center text-gray-400">
      Loading Map...
    </div>
  ),
});

export default function EventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { location, city, error } = useGeolocation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [category, setCategory] = useState("All");
  const [activeTab, setActiveTab] = useState("discover");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [radius, setRadius] = useState("50");
  const [timeframe, setTimeframe] = useState("upcoming");
  const [zipCode, setZipCode] = useState("");
  const [customLocation, setCustomLocation] = useState(null);
  const [savedEvents, setSavedEvents] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'map'

  const categories = [
    "All",
    "Music",
    "Sports",
    "Arts & Theatre",
    "Film",
    "Food & Drink",
    "Miscellaneous",
  ];

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Load saved events from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("connectify_saved_events");
    if (saved) {
      setSavedEvents(JSON.parse(saved));
    }
  }, []);

  const handleEventStatus = (event, status) => {
    const existingIndex = savedEvents.findIndex((e) => e.id === event.id);
    let newSaved = [...savedEvents];

    if (existingIndex >= 0) {
      const currentStatus = newSaved[existingIndex].userStatus || 'interested';
      if (currentStatus === status) {
        newSaved.splice(existingIndex, 1);
      } else {
        newSaved[existingIndex] = { ...newSaved[existingIndex], userStatus: status };
      }
    } else {
      newSaved.push({ ...event, userStatus: status });
    }
    setSavedEvents(newSaved);
    localStorage.setItem("connectify_saved_events", JSON.stringify(newSaved));
  };

  const handleShareEvent = async (e, event) => {
    e.preventDefault();
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Check out this event: ${event.name}`,
          url: event.url,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(event.url);
        alert("Link copied to clipboard!");
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleZipCodeUpdate = async () => {
    if (!zipCode.trim()) {
      setCustomLocation(null);
      return;
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zipCode)}&country=US&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setCustomLocation({ latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) });
      } else {
        alert("Could not find location for this Zip Code");
      }
    } catch (e) {
      console.error("Geocoding error:", e);
    }
  };

  // Fetch Events
  useEffect(() => {
    const effectiveLocation = customLocation || location;
    if (effectiveLocation) {
      setLoading(true);
      const API_KEY = process.env.NEXT_PUBLIC_TICKETMASTER_API;
      setFetchError(null);

      let url = `https://app.ticketmaster.com/discovery/v2/events.json?latlong=${effectiveLocation.latitude},${effectiveLocation.longitude}&radius=${radius}&unit=miles&size=20&apikey=${API_KEY}`;
      const now = new Date().toISOString().split('.')[0] + "Z";
      if (timeframe === 'upcoming') {
        url += `&startDateTime=${now}&sort=date,asc`;
      } else if (timeframe === 'past') {
        url += `&endDateTime=${now}&sort=date,desc`;
      } else {
        url += `&sort=date,asc`;
      }

      if (category !== "All") {
        url += `&classificationName=${encodeURIComponent(category)}`;
      }
      if (startDate) {
        url += `&startDateTime=${startDate}T00:00:00Z`;
      }
      if (endDate) {
        url += `&endDateTime=${endDate}T23:59:59Z`;
      }
      if (searchQuery) {
        url += `&keyword=${encodeURIComponent(searchQuery)}`;
      }

      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch events");
          return res.json();
        })
        .then((data) => {
          if (data._embedded && data._embedded.events) {
            setEvents(data._embedded.events);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch events:", err);
          setFetchError("Failed to load events. Please try again later.");
          setLoading(false);
        });
    } else if (error && !customLocation) {
      setLoading(false);
    }
  }, [location, customLocation, error, category, startDate, endDate, searchQuery, radius, timeframe]);

  if (status === "loading") return <div className="min-h-screen bg-[#f0f2f5] dark:bg-slate-900" />;

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5] dark:bg-slate-900">
      <Navbar session={session} router={router} />
      <main className="flex-1">
        <div className="max-w-[1920px] mx-auto flex justify-between px-4 sm:px-6 lg:px-8 py-6 gap-6">

          {/* Main Content */}
          <div className="flex-1 max-w-[1600px] mx-auto w-full min-w-0 flex flex-col lg:flex-row gap-6 lg:gap-8">

            {/* Events Sidebar (Filters & Nav) */}
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-24 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-hide">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Events</h1>

                {/* Search */}
                <div className="relative mb-6">
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 pl-10 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                  <span className="absolute left-3.5 top-3 text-gray-400 dark:text-slate-500">🔍</span>
                </div>

                {/* Navigation Menu */}
                <div className="space-y-2 mb-8">
                  <button
                    onClick={() => setActiveTab("discover")}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 ${activeTab === "discover"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                      } `}
                  >
                    <span className="text-lg"></span>
                    Discover
                  </button>
                  <button
                    onClick={() => setActiveTab("interested")}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 ${activeTab === "interested"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                      } `}
                  >
                    <span className="text-lg">★</span>
                    Interested
                    {savedEvents.filter(e => (e.userStatus || 'interested') === 'interested').length > 0 && (
                      <span className="ml-auto bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 text-xs font-bold py-0.5 px-2 rounded-full shadow-sm">
                        {savedEvents.filter(e => (e.userStatus || 'interested') === 'interested').length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("going")}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 ${activeTab === "going"
                      ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                      : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                      } `}
                  >
                    <span className="text-lg">✓</span>
                    Going
                    {savedEvents.filter(e => e.userStatus === 'going').length > 0 && (
                      <span className="ml-auto bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 text-xs font-bold py-0.5 px-2 rounded-full shadow-sm">
                        {savedEvents.filter(e => e.userStatus === 'going').length}
                      </span>
                    )}
                  </button>
                </div>

                {activeTab === "discover" && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Filters</span>
                      <div className="h-px flex-1 bg-gray-100 dark:bg-slate-700"></div>
                    </div>

                    <div className="space-y-5">
                      {/* Timeframe Filter */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Timeframe</label>
                        <select
                          value={timeframe}
                          onChange={(e) => setTimeframe(e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white transition-all"
                        >
                          <option value="upcoming">Upcoming Events</option>
                          <option value="past">Past Events</option>
                          <option value="all">All Events</option>
                        </select>
                      </div>

                      {/* Location Filter */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Location</label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Zip Code"
                              value={zipCode}
                              onChange={(e) => setZipCode(e.target.value)}
                              className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white transition-all"
                            />
                            <button onClick={handleZipCodeUpdate} className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition-colors">
                              Go
                            </button>
                          </div>
                          <select
                            value={radius}
                            onChange={(e) => setRadius(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white transition-all"
                          >
                            <option value="10">Within 10 miles</option>
                            <option value="20">Within 20 miles</option>
                            <option value="50">Within 50 miles</option>
                            <option value="100">Within 100 miles</option>
                          </select>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 mt-1.5 px-1">
                            <span>📍</span>
                            <span className="truncate">
                              {zipCode ? `Zip ${zipCode} ` : (city || "Locating...")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Date Filter */}
                    <div className="mt-6">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Date Range</label>
                      <div className="space-y-2">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white transition-all"
                        />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Categories */}
                    <div className="mt-6">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Categories</label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${category === cat
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                              } `}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Feed Area */}
            <div className="flex-1 min-w-0">
              {/* Feed Header */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {activeTab === "discover" ? "Upcoming Events" : activeTab === "interested" ? "Interested Events" : "Going Events"}
                </h2>

                <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === "list" ? "bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"} `}
                  >
                    <i className="fas fa-list"></i> List
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === "map" ? "bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"} `}
                  >
                    <i className="fas fa-map-marker-alt"></i> Map
                  </button>
                </div>
              </div>

              {/* Error & Loading States (Discover Tab) */}
              {activeTab === "discover" && (
                <>
                  {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}
                  {fetchError && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">{fetchError}</div>}

                  {loading && !error && (
                    <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-slate-100 mb-2"></div>
                      <p>Finding local events...</p>
                    </div>
                  )}

                  {!loading && !error && !fetchError && events.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 rounded-lg">No events found in your area right now.</div>
                  )}
                </>
              )}

              {viewMode === "list" ? (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {(activeTab === "discover" ? events : savedEvents.filter(e => (e.userStatus || 'interested') === activeTab)).map((event) => {
                    // Parse date safely to avoid timezone shifts (using noon ensures date stays same)
                    const eventDateStr = event.dates?.start?.localDate;
                    const eventDate = eventDateStr ? new Date(`${eventDateStr}T12:00:00`) : new Date();

                    // Format time to 12-hour format (e.g., 7:30 PM)
                    const formatTime = (time) => {
                      if (!time) return 'Time TBD';
                      try {
                        const [hours, minutes] = time.split(':');
                        const h = parseInt(hours, 10);
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const formattedHour = h % 12 || 12;
                        return `${formattedHour}:${minutes} ${ampm} `;
                      } catch (e) { return time; }
                    };
                    const timeDisplay = formatTime(event.dates?.start?.localTime);
                    const dateDisplay = eventDate.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

                    return (
                      <div
                        key={event.id}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col h-full cursor-pointer group"
                        title={event.name}
                        onClick={() => window.open(event.url, '_blank')}
                      >
                        {/* Cover Image */}
                        <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-slate-700">
                          {event.images && event.images[0] ? (
                            <img src={event.images[0].url} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">📅</div>
                          )}
                        </div>

                        {/* Content Area */}
                        <div className="p-4 flex flex-col flex-1">
                          <div className="text-[#E41E3F] dark:text-red-400 text-xs font-bold uppercase tracking-wide mb-1">
                            {dateDisplay} • {timeDisplay}
                          </div>

                          <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-snug mb-1 line-clamp-2 group-hover:underline decoration-2 underline-offset-2">
                            {event.name}
                          </h3>

                          <div className="text-sm text-gray-500 dark:text-slate-400 font-medium mb-4 line-clamp-1">
                            {event._embedded?.venues?.[0]?.name || "Location TBD"}
                          </div>

                          <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between gap-2">
                            {(() => {
                              const savedEvent = savedEvents.find(e => e.id === event.id);
                              const userStatus = savedEvent ? (savedEvent.userStatus || 'interested') : null;

                              return (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEventStatus(event, 'interested'); }}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${userStatus === 'interested'
                                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                                      } `}
                                  >
                                    <span className="text-lg">★</span> Interested
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEventStatus(event, 'going'); }}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${userStatus === 'going'
                                      ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                                      } `}
                                  >
                                    <span className="text-lg">✓</span> Going
                                  </button>
                                </>
                              );
                            })()}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleShareEvent(e, event); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <span className="text-lg">📤</span> Share
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[400px] lg:h-[600px] w-full rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm z-0">
                  <EventMap
                    events={activeTab === "discover" ? events : savedEvents.filter(e => (e.userStatus || 'interested') === activeTab)}
                    center={customLocation || location}
                  />
                </div>
              )}

              {activeTab !== "discover" && (activeTab === "discover" ? events : savedEvents.filter(e => (e.userStatus || 'interested') === activeTab)).length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                  <p className="text-gray-500 dark:text-slate-400">
                    {activeTab === "interested" ? "You haven't marked any events as interested yet." : "You haven't marked any events as going yet."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
