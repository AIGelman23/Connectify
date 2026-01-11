"use client";

import { useState, useRef, useEffect } from 'react';

// Enhanced emoji data with more comprehensive categories like Facebook
const emojiData = {
  recent: ["😀", "❤️", "👍", "😂", "😊", "🔥", "💯", "🎉"],
  smileys: [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃",
    "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜",
    "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔",
    "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤",
    "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓"
  ],
  people: [
    "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘",
    "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "👊", "✊", "🤛",
    "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾",
    "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🦷", "🦴", "👀", "👁️", "👅"
  ],
  nature: [
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮",
    "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤",
    "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛",
    "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷️", "🦂", "🐢", "🐍", "🦎", "🦖"
  ],
  food: [
    "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑",
    "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑",
    "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨",
    "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭"
  ],
  activity: [
    "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓",
    "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿",
    "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂",
    "🏋️‍♀️", "🏋️", "🏋️‍♂️", "🤼‍♀️", "🤼", "🤼‍♂️", "🤸‍♀️", "🤸", "🤸‍♂️", "⛹️‍♀️"
  ],
  travel: [
    "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚",
    "🚛", "🚜", "🏍️", "🛵", "🚲", "🛴", "🛹", "🛼", "🚁", "🛸", "✈️", "🛩️",
    "🛫", "🛬", "🪂", "💺", "🚀", "🛰️", "🚢", "⛵", "🚤", "🛥️", "🛳️", "⛴️",
    "🚨", "🚥", "🚦", "🛑", "🚧", "⚓", "⛽", "🚏", "🗺️", "🗿", "🗽", "🗼"
  ],
  objects: [
    "⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽",
    "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️",
    "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️",
    "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸"
  ],
  symbols: [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
    "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️",
    "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌",
    "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️"
  ],
  flags: [
    "🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️", "🇺🇸", "🇬🇧", "🇨🇦", "🇫🇷",
    "🇩🇪", "🇮🇹", "🇪🇸", "🇯🇵", "🇰🇷", "🇨🇳", "🇮🇳", "🇧🇷", "🇦🇺", "🇷🇺", "🇲🇽", "🇳🇱"
  ]
};

// Category icons like Facebook
const categoryIcons = {
  recent: "🕒",
  smileys: "😀",
  people: "👋",
  nature: "🐶",
  food: "🍎",
  activity: "⚽",
  travel: "🚗",
  objects: "💡",
  symbols: "❤️",
  flags: "🏁"
};

export default function FacebookEmojiSelector({ onEmojiSelect, parentRef }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('recent');
  const [filteredEmojis, setFilteredEmojis] = useState(emojiData.recent);
  const [hoveredEmoji, setHoveredEmoji] = useState(null);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Handle outside clicks to close the panel
  useEffect(() => {
    function handleClickOutside(event) {
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
      const allEmojis = Object.values(emojiData).flat();
      const filtered = allEmojis.filter(emoji => {
        // Simple search - could be enhanced with emoji names
        return true; // For now, show all when searching
      });
      setFilteredEmojis(filtered.slice(0, 64)); // Limit results
    } else {
      setFilteredEmojis(emojiData[selectedCategory] || []);
    }
  }, [searchText, selectedCategory]);

  const togglePanel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);

    if (!isOpen) {
      setSearchText('');
      setSelectedCategory('recent');
      setFilteredEmojis(emojiData.recent);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 10);
    }
  };

  const handleEmojiSelect = (emoji) => {
    onEmojiSelect(emoji);
    // Add to recent emojis (in a real app, this would persist)
    if (!emojiData.recent.includes(emoji)) {
      emojiData.recent.unshift(emoji);
      emojiData.recent = emojiData.recent.slice(0, 8);
    }
    // Keep the emoji selector open for multiple selections
    // Don't close the panel to allow multiple emoji selections
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={togglePanel}
        className="flex items-center justify-center w-8 h-8 text-gray-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Add emoji"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="8" cy="10" r="1.5" fill="currentColor" />
          <circle cx="16" cy="10" r="1.5" fill="currentColor" />
          <path d="M8 15s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-slate-800 shadow-2xl rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50" style={{ width: '320px', height: '380px' }}>
          <div className="flex flex-col h-full">
            {/* Search bar */}
            <div className="p-3 border-b border-gray-100 dark:border-slate-700">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  ref={searchInputRef}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search emojis"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border-0 rounded-full text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-600 transition-all"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700">
              {Object.keys(emojiData).map(category => (
                <button
                  key={category}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategory(category);
                    setSearchText('');
                  }}
                  className={`flex-1 py-3 px-1 text-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors relative ${selectedCategory === category && !searchText
                      ? 'text-blue-500 dark:text-blue-400'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100'
                    }`}
                  title={category.charAt(0).toUpperCase() + category.slice(1)}
                >
                  {categoryIcons[category]}
                  {selectedCategory === category && !searchText && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Emoji grid */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-8 gap-1">
                {filteredEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input from losing focus
                      e.stopPropagation();
                      handleEmojiSelect(emoji);
                    }}
                    onMouseEnter={() => setHoveredEmoji(emoji)}
                    onMouseLeave={() => setHoveredEmoji(null)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-2xl cursor-pointer transition-all duration-150 hover:scale-110"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {filteredEmojis.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-slate-400">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="text-sm">No emojis found</div>
                </div>
              )}
            </div>

            {/* Hover preview (like Facebook) */}
            {hoveredEmoji && (
              <div className="absolute top-2 left-2 bg-gray-800 dark:bg-slate-600 text-white px-2 py-1 rounded text-xs pointer-events-none shadow-lg">
                {hoveredEmoji}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}