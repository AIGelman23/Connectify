// src/components/stories/LocationPicker.jsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Popular/suggested locations (for when no search query)
const POPULAR_LOCATIONS = [
  { id: "1", name: "New York, NY", fullName: "New York, New York, USA" },
  { id: "2", name: "Los Angeles, CA", fullName: "Los Angeles, California, USA" },
  { id: "3", name: "London", fullName: "London, England, UK" },
  { id: "4", name: "Paris", fullName: "Paris, France" },
  { id: "5", name: "Tokyo", fullName: "Tokyo, Japan" },
  { id: "6", name: "Dubai", fullName: "Dubai, UAE" },
  { id: "7", name: "Sydney", fullName: "Sydney, Australia" },
  { id: "8", name: "Miami, FL", fullName: "Miami, Florida, USA" },
];

export default function LocationPicker({ isOpen, onClose, onSelect, selectedLocation }) {
  const [search, setSearch] = useState("");
  const [locations, setLocations] = useState(POPULAR_LOCATIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Search locations using OpenStreetMap Nominatim API (free, no API key needed)
  const searchLocations = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setLocations(POPULAR_LOCATIONS);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      const formattedLocations = data.map((item) => ({
        id: item.place_id.toString(),
        name: item.address?.city || item.address?.town || item.address?.village || item.name || item.display_name.split(",")[0],
        fullName: item.display_name,
        lat: item.lat,
        lon: item.lon,
        type: item.type,
      }));

      setLocations(formattedLocations.length > 0 ? formattedLocations : []);
    } catch (err) {
      console.error("Location search failed:", err);
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(search);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, searchLocations]);

  // Get current location
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Reverse geocode the coordinates
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&addressdetails=1`,
            {
              headers: {
                "Accept-Language": "en",
              },
            }
          );

          if (!response.ok) throw new Error("Reverse geocoding failed");

          const data = await response.json();
          const location = {
            id: data.place_id.toString(),
            name: data.address?.city || data.address?.town || data.address?.village || data.display_name.split(",")[0],
            fullName: data.display_name,
            lat: position.coords.latitude.toString(),
            lon: position.coords.longitude.toString(),
          };

          onSelect(location);
          onClose();
        } catch (err) {
          setLocationError("Failed to get your location name");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information unavailable");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out");
            break;
          default:
            setLocationError("Failed to get your location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Handle location selection
  const handleSelect = (location) => {
    onSelect(location);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full max-w-lg mx-0 sm:mx-4 max-h-[80vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">Add Location</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Current location button */}
        <div className="p-4 border-b border-slate-700">
          <button
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGettingLocation ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Getting location...
              </>
            ) : (
              <>
                <i className="fas fa-location-crosshairs"></i>
                Use Current Location
              </>
            )}
          </button>
          {locationError && (
            <p className="text-red-400 text-sm mt-2 text-center">{locationError}</p>
          )}
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for a location..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>

        {/* Locations List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-map-marker-alt text-4xl text-slate-600 mb-3"></i>
              <p className="text-slate-400">No locations found</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-slate-500 mb-3 px-1">
                {search ? "Search Results" : "Popular Locations"}
              </p>
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleSelect(location)}
                  className={`w-full px-4 py-3 flex items-center gap-3 rounded-xl transition-colors text-left ${
                    selectedLocation?.id === location.id
                      ? "bg-pink-500/20 border border-pink-500/50"
                      : "hover:bg-slate-800"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-map-marker-alt text-pink-400"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{location.name}</p>
                    <p className="text-slate-400 text-sm truncate">{location.fullName}</p>
                  </div>
                  {selectedLocation?.id === location.id && (
                    <i className="fas fa-check text-pink-500"></i>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Remove location button (if selected) */}
        {selectedLocation && (
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={() => {
                onSelect(null);
                onClose();
              }}
              className="w-full py-3 bg-slate-800 text-red-400 rounded-xl font-medium hover:bg-slate-700"
            >
              <i className="fas fa-trash mr-2"></i>
              Remove Location
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
