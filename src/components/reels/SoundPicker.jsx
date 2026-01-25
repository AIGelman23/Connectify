"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, SearchInput, Spinner, Button } from "@/components/ui";

export default function SoundPicker({ isOpen, onClose, onSelect, selectedSound }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("trending");
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  // Fetch sounds
  const { data, isLoading } = useQuery({
    queryKey: ["sounds", activeTab, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: searchQuery ? "search" : activeTab,
        limit: "30",
      });
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/sounds?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: isOpen,
  });

  const sounds = data?.sounds || [];

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString() || "0";
  };

  const togglePlayback = (sound) => {
    if (playingId === sound.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = sound.audioUrl;
        audioRef.current.play();
        setPlayingId(sound.id);
      }
    }
  };

  const handleSelect = (sound) => {
    audioRef.current?.pause();
    setPlayingId(null);
    onSelect(sound);
    onClose();
  };

  // Stop playback when modal closes
  useEffect(() => {
    if (!isOpen) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Sound"
      size="lg"
    >
      {/* Search */}
      <div className="mb-4">
        <SearchInput
          placeholder="Search sounds..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Tabs */}
      {!searchQuery && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("trending")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === "trending"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
            }`}
          >
            <i className="fas fa-fire mr-1.5 text-orange-400"></i>
            Trending
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === "recent"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
            }`}
          >
            <i className="fas fa-clock mr-1.5"></i>
            Recent
          </button>
        </div>
      )}

      {/* Selected Sound */}
      {selectedSound && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-music text-white text-sm"></i>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {selectedSound.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Currently selected
                </p>
              </div>
            </div>
            <button
              onClick={() => onSelect(null)}
              className="text-gray-400 hover:text-red-500"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Sounds List */}
      <div className="max-h-[400px] overflow-y-auto -mx-4 px-4">
        {isLoading ? (
          <div className="py-12 text-center">
            <Spinner size="lg" />
          </div>
        ) : sounds.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-slate-400">
            {searchQuery ? `No sounds found for "${searchQuery}"` : "No sounds available"}
          </div>
        ) : (
          <div className="space-y-2">
            {sounds.map((sound) => (
              <div
                key={sound.id}
                className={`p-3 rounded-lg transition-colors cursor-pointer ${
                  selectedSound?.id === sound.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    : "bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
                onClick={() => handleSelect(sound)}
              >
                <div className="flex items-center gap-3">
                  {/* Play button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayback(sound);
                    }}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      playingId === sound.id
                        ? "bg-blue-600 text-white"
                        : "bg-gradient-to-br from-pink-500 to-purple-600 text-white"
                    }`}
                  >
                    <i className={`fas ${playingId === sound.id ? "fa-pause" : "fa-play"} text-sm ${playingId !== sound.id && "ml-0.5"}`}></i>
                  </button>

                  {/* Sound info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {sound.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                      <span>{formatDuration(sound.duration)}</span>
                      <span>{formatCount(sound.usageCount || sound.reelsCount)} uses</span>
                    </div>
                  </div>

                  {/* Use button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(sound);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingId(null)}
        preload="metadata"
      />

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex justify-between">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            onSelect(null);
            onClose();
          }}
        >
          <i className="fas fa-volume-mute mr-2"></i>
          No Sound
        </Button>
      </div>
    </Modal>
  );
}
