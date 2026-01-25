import React, { useEffect, useRef, useState } from 'react';

export default function PhotoCollage({ images = [], onImageClick, layout = 'classic', autoScroll = true }) {
  const count = images.length;
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (layout === 'carousel' && !isPaused && autoScroll && count > 1) {
      const interval = setInterval(() => {
        if (scrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
          // Check if we are near the end
          if (scrollLeft + clientWidth >= scrollWidth - 10) {
            scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            const firstChild = scrollRef.current.firstElementChild;
            if (firstChild) {
              const gap = 8; // gap-2 is 0.5rem = 8px
              scrollRef.current.scrollBy({ left: firstChild.clientWidth + gap, behavior: 'smooth' });
            }
          }
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [layout, isPaused, autoScroll, count]);

  if (count === 0) return null;

  const isGiphy = (url) => typeof url === 'string' && (url.includes('giphy.com') || url.includes('giphy.gif'));

  // Single Image
  if (count === 1) {
    const url = images[0];
    const isGif = isGiphy(url);
    return (
      <div className="flex justify-center px-0 py-0">
        <img
          src={url}
          alt="Post attachment"
          className={`max-h-[350px] sm:max-h-[500px] w-full ${isGif ? 'object-contain bg-gray-50 dark:bg-slate-900' : 'object-cover'} cursor-pointer hover:brightness-95 transition-all duration-200 rounded-none`}
          onClick={() => onImageClick && onImageClick(url, 0)}
        />
      </div>
    );
  }

  // Carousel Layout
  if (layout === 'carousel') {
    return (
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-2 pb-2 snap-x snap-mandatory scrollbar-hide px-1 touch-pan-y"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {images.map((url, index) => (
          <div
            key={index}
            className="min-w-[85%] sm:min-w-[70%] md:min-w-[60%] snap-center relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer hover:brightness-95 transition-all shrink-0"
            onClick={() => onImageClick && onImageClick(url, index)}
          >
            <img src={url} alt={`Post image ${index}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  // Masonry Layout
  if (layout === 'masonry') {
    return (
      <div className="columns-2 md:columns-3 gap-1 space-y-1 px-0">
        {images.map((url, index) => (
          <div
            key={index}
            className="break-inside-avoid mb-1 cursor-pointer hover:brightness-95 transition-all relative group"
            onClick={() => onImageClick && onImageClick(url, index)}
          >
            <img src={url} alt={`Post image ${index}`} className="w-full h-auto rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  // Grid Layout (Uniform squares)
  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5">
        {images.map((url, index) => (
          <div
            key={index}
            className="relative aspect-square cursor-pointer hover:brightness-95 transition-all"
            onClick={() => onImageClick && onImageClick(url, index)}
          >
            <img src={url} alt={`Post image ${index}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  // Classic Layout (Facebook style)
  return (
    <div className={`grid gap-0.5 ${count === 2 ? 'grid-cols-2' :
      count === 3 ? 'grid-cols-2' :
        'grid-cols-2'
      }`}>
      {images.map((url, index) => {
        if (count > 4 && index > 3) return null;

        const isOverlay = count > 4 && index === 3;
        const isFirstOfThree = count === 3 && index === 0;

        return (
          <div
            key={index}
            className={`relative cursor-pointer hover:brightness-95 transition-all duration-200 ${isFirstOfThree ? 'col-span-2' : ''}`}
            onClick={() => onImageClick && onImageClick(url, index)}
          >
            <img
              src={url}
              alt={`Post image ${index}`}
              className={`w-full object-cover rounded-none ${isFirstOfThree ? 'h-72' : 'h-48'}`}
            />
            {isOverlay && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                <span className="text-white text-3xl font-bold">+{count - 4}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}