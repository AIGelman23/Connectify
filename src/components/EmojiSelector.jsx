"use client";

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

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

export default function FacebookEmojiSelector({ onEmojiSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('recent');
  const containerRef = useRef(null);
  const pickerRef = useRef(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);

  // Get current emojis based on category
  const currentEmojis = emojiData[selectedCategory] || [];

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle outside clicks to close the panel
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        (pickerRef.current && pickerRef.current.contains(event.target)) ||
        (containerRef.current && containerRef.current.contains(event.target))
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
  }, [isOpen]);

  // Calculate position relative to the button
  useEffect(() => {
    if (isOpen && containerRef.current && !isMobile) {
      const updatePosition = () => {
        const buttonRect = containerRef.current.getBoundingClientRect();
        const pickerHeight = 280;
        const pickerWidth = 320;

        // Position above the button by default
        let top = buttonRect.top - pickerHeight - 8;
        let left = buttonRect.left - pickerWidth + buttonRect.width;

        // If not enough space above, position below
        if (top < 10) {
          top = buttonRect.bottom + 8;
        }

        // Keep within viewport horizontally
        if (left < 10) {
          left = 10;
        }
        if (left + pickerWidth > window.innerWidth - 10) {
          left = window.innerWidth - pickerWidth - 10;
        }

        setPickerPosition({ top, left });
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, isMobile]);

  const togglePanel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);

    if (!isOpen) {
      setSelectedCategory('recent');
    }
  };

  const handleEmojiClick = (emoji, e) => {
    e.preventDefault();
    e.stopPropagation();
    onEmojiSelect(emoji);
    // Add to recent emojis (without triggering re-render of picker)
    if (!emojiData.recent.includes(emoji)) {
      emojiData.recent = [emoji, ...emojiData.recent.slice(0, 7)];
    }
  };

  const handleCategoryClick = (category, e) => {
    e.stopPropagation();
    setSelectedCategory(category);
  };

  return (
    <div className="relative inline-flex" ref={containerRef}>
      <button
        type="button"
        onClick={togglePanel}
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isOpen
            ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30'
            : 'text-gray-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        title="Add emoji"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="8" cy="10" r="1.5" fill="currentColor" />
          <circle cx="16" cy="10" r="1.5" fill="currentColor" />
          <path d="M8 15s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && createPortal(
        <div
          ref={pickerRef}
          className={`
            ${isMobile
              ? 'fixed bottom-0 left-0 right-0 rounded-t-xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)]'
              : 'fixed rounded-xl shadow-2xl'
            }
            bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
            overflow-hidden flex flex-col z-[60]
          `}
          style={!isMobile ? {
            top: pickerPosition.top,
            left: pickerPosition.left,
            width: 320,
            height: 280
          } : {
            maxHeight: '220px'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Mobile drag handle + close */}
          {isMobile && (
            <div className="flex items-center justify-center px-3 py-1.5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 relative">
              <div className="w-10 h-1 bg-gray-300 dark:bg-slate-500 rounded-full"></div>
              <button
                onClick={() => setIsOpen(false)}
                className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-full"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Desktop header with quick emoji row */}
          {!isMobile && (
            <div className="flex items-center justify-between p-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
              <div className="flex gap-1 overflow-x-auto">
                {emojiData.recent.slice(0, 6).map((emoji) => (
                  <button
                    key={`quick-${emoji}`}
                    type="button"
                    onMouseDown={(e) => handleEmojiClick(emoji, e)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-xl transition-transform hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors ml-2"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Category tabs */}
          <div className="flex border-b border-gray-100 dark:border-slate-700 overflow-x-auto bg-white dark:bg-slate-800">
            {Object.keys(emojiData).map(category => (
              <button
                key={category}
                onClick={(e) => handleCategoryClick(category, e)}
                className={`flex-shrink-0 py-1.5 px-2 text-base hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors relative ${selectedCategory === category
                    ? 'text-blue-500 dark:text-blue-400'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                  }`}
                title={category.charAt(0).toUpperCase() + category.slice(1)}
              >
                {categoryIcons[category]}
                {selectedCategory === category && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-5 h-0.5 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                )}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="flex-1 overflow-y-auto p-1.5">
            <div className={`grid ${isMobile ? 'grid-cols-8 gap-0' : 'grid-cols-8 gap-0.5'}`}>
              {currentEmojis.map((emoji) => (
                <button
                  key={`${selectedCategory}-${emoji}`}
                  type="button"
                  onMouseDown={(e) => handleEmojiClick(emoji, e)}
                  className={`flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors active:scale-95 ${isMobile ? 'w-10 h-10 text-2xl' : 'w-9 h-9 text-xl hover:scale-110'
                    }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Safe area padding for mobile */}
          {isMobile && <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }} />}
        </div>,
        document.body
      )}
    </div>
  );
}
