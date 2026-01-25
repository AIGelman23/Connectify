// src/components/stories/StickerPicker.jsx
"use client";

import { useState, useEffect, useCallback } from "react";

const GIPHY_API_KEY = "7r6adPGUcQgoiqagBiKg2AwXmPFvrBPl";

const STICKER_CATEGORIES = [
  { id: "trending", name: "Trending", icon: "fire" },
  { id: "love", name: "Love", icon: "heart" },
  { id: "happy", name: "Happy", icon: "smile" },
  { id: "sad", name: "Sad", icon: "frown" },
  { id: "reactions", name: "Reactions", icon: "face-surprise" },
  { id: "animals", name: "Animals", icon: "paw" },
  { id: "food", name: "Food", icon: "burger" },
  { id: "celebration", name: "Party", icon: "party-horn" },
];

export default function StickerPicker({ isOpen, onClose, onSelect }) {
  const [search, setSearch] = useState("");
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("trending");

  // Fetch stickers
  const fetchStickers = useCallback(async (query = "", offset = 0) => {
    setLoading(true);
    try {
      let url;
      if (query) {
        url = `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&offset=${offset}&rating=pg`;
      } else if (activeCategory === "trending") {
        url = `https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_API_KEY}&limit=24&offset=${offset}&rating=pg`;
      } else {
        url = `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(activeCategory)}&limit=24&offset=${offset}&rating=pg`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setStickers(data.data || []);
    } catch (error) {
      console.error("Failed to fetch stickers:", error);
      setStickers([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  // Fetch on open and category change
  useEffect(() => {
    if (isOpen) {
      fetchStickers();
    }
  }, [isOpen, activeCategory, fetchStickers]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      fetchStickers(search);
    }
  };

  // Handle sticker selection
  const handleSelectSticker = (sticker) => {
    onSelect({
      id: sticker.id,
      url: sticker.images.fixed_width.url,
      width: parseInt(sticker.images.fixed_width.width, 10),
      height: parseInt(sticker.images.fixed_width.height, 10),
      x: 50, // center position (percentage)
      y: 50,
      scale: 1,
      rotation: 0,
    });
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
          <h2 className="text-lg font-bold text-white">Add Sticker</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-700">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stickers..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-pink-500 text-white rounded-xl font-medium hover:bg-pink-600 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Categories */}
        <div className="px-4 py-3 border-b border-slate-700 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            {STICKER_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setActiveCategory(category.id);
                  setSearch("");
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? "bg-pink-500 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <i className={`fas fa-${category.icon} mr-1.5`}></i>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Stickers Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : stickers.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-sticky-note text-4xl text-slate-600 mb-3"></i>
              <p className="text-slate-400">No stickers found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {stickers.map((sticker) => (
                <button
                  key={sticker.id}
                  onClick={() => handleSelectSticker(sticker)}
                  className="aspect-square bg-slate-800/50 rounded-xl p-2 hover:bg-slate-700/50 transition-colors flex items-center justify-center group"
                >
                  <img
                    src={sticker.images.fixed_width_small.url}
                    alt={sticker.title}
                    className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GIPHY Attribution */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-center">
          <a
            href="https://giphy.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            <img
              src="https://giphy.com/static/img/giphy_logo_square_social.png"
              alt="Powered by GIPHY"
              className="w-6 h-6"
            />
            <span className="text-xs text-slate-400 font-medium">Powered by GIPHY</span>
          </a>
        </div>
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
