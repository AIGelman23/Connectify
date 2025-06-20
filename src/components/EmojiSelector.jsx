"use client";

import { useState, useRef, useEffect } from 'react';

// Emoji data - basic categories and emojis
const emojiData = {
  smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘"],
  people: ["👋", "👌", "👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💪", "🦾", "🦿", "🦶", "🦵", "👂", "🦻"],
  nature: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦"],
  food: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑"],
  activity: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥅", "🏒", "🏑", "🥍", "🏏", "🥎", "🎯", "🎲"],
  travel: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛", "🚜", "🚲", "🛴", "🛹", "🚨", "🚡"],
  objects: ["⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "💽", "💾", "💿", "📀", "📷", "📸", "📹", "🎥", "📽️", "🎞️"],
  symbols: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝"]
};

export default function EmojiSelector({ onEmojiSelect, parentRef }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('smileys');
  const [filteredEmojis, setFilteredEmojis] = useState(emojiData.smileys);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Handle outside clicks to close the panel
  useEffect(() => {
    function handleClickOutside(event) {
      // Don't close if clicking inside our component or the parent container
      if (
        (containerRef.current && containerRef.current.contains(event.target)) ||
        (parentRef && parentRef.current && parentRef.current.contains(event.target))
      ) {
        return;
      }
      setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, parentRef]);

  // Filter emojis based on search or category
  useEffect(() => {
    if (searchText) {
      // Flatten all emojis and filter based on search
      const allEmojis = Object.values(emojiData).flat();
      setFilteredEmojis(allEmojis);
    } else {
      // Show emojis from selected category
      setFilteredEmojis(emojiData[selectedCategory] || []);
    }
  }, [searchText, selectedCategory]);

  // Toggle emoji panel
  const togglePanel = (e) => {
    e.preventDefault(); // Prevent default to avoid losing focus
    e.stopPropagation(); // Stop event from propagating to parent elements

    setIsOpen(!isOpen);
    if (!isOpen) {
      // Reset search and select default category when opening
      setSearchText('');
      setSelectedCategory('smileys');
      setFilteredEmojis(emojiData.smileys);

      // Focus search input when panel opens
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 10);
    }
  };

  // Select emoji and close panel
  const handleEmojiSelect = (emoji) => {
    onEmojiSelect(emoji);
    // Keep panel open for multiple emoji selections
    // setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={togglePanel}
        className="text-gray-500 hover:text-gray-700 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        title="Add emoji"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C14.1217 20 16.1566 19.1571 17.6569 17.6569C19.1571 16.1566 20 14.1217 20 12C20 9.87827 19.1571 7.84344 17.6569 6.34315C16.1566 4.84285 14.1217 4 12 4C9.87827 4 7.84344 4.84285 6.34315 6.34315C4.84285 7.84344 4 9.87827 4 12C4 14.1217 4.84285 16.1566 6.34315 17.6569C7.84344 19.1571 9.87827 20 12 20ZM8 13C8.55 13 9 12.55 9 12C9 11.45 8.55 11 8 11C7.45 11 7 11.45 7 12C7 12.55 7.45 13 8 13ZM16 13C16.55 13 17 12.55 17 12C17 11.45 16.55 11 16 11C15.45 11 15 11.45 15 12C15 12.55 15.45 13 16 13ZM12 17.5C14.5 17.5 16.5 15.98 17.1 14H6.9C7.5 15.98 9.5 17.5 12 17.5Z" fill="currentColor" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 bg-white shadow-lg rounded-lg border border-gray-200 w-64 p-3 z-50">
          <div className="flex flex-col">
            {/* Search bar */}
            <div className="mb-2">
              <input
                type="text"
                ref={searchInputRef}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search emojis..."
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onClick={(e) => e.stopPropagation()} // Prevent click from bubbling
              />
            </div>

            {/* Category tabs */}
            <div className="flex overflow-x-auto mb-3 pb-1">
              {Object.keys(emojiData).map(category => (
                <button
                  key={category}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent propagation
                    setSelectedCategory(category);
                    setSearchText('');
                  }}
                  className={`px-2 py-1 text-xs whitespace-nowrap mr-1 rounded ${selectedCategory === category && !searchText
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Emoji grid */}
            <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
              {filteredEmojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent propagation
                    handleEmojiSelect(emoji);
                  }}
                  className="h-7 w-7 flex items-center justify-center hover:bg-gray-100 rounded text-lg cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {filteredEmojis.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No emojis found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
