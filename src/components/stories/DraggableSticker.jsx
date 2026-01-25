// src/components/stories/DraggableSticker.jsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export default function DraggableSticker({
  sticker,
  onUpdate,
  onDelete,
  containerRef,
  isSelected,
  onSelect,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [initialDistance, setInitialDistance] = useState(0);
  const [initialRotation, setInitialRotation] = useState(0);
  const [initialScale, setInitialScale] = useState(1);
  const stickerRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startStickerPos = useRef({ x: 0, y: 0 });

  // Calculate distance between two touch points
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate angle between two touch points
  const getAngle = (touch1, touch2) => {
    return Math.atan2(
      touch2.clientY - touch1.clientY,
      touch2.clientX - touch1.clientX
    ) * (180 / Math.PI);
  };

  // Convert client coordinates to percentage position
  const getPercentPosition = useCallback((clientX, clientY) => {
    if (!containerRef?.current) return { x: 50, y: 50 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, [containerRef]);

  // Mouse/touch move handler
  const handleMove = useCallback((clientX, clientY) => {
    if (!isDragging || !containerRef?.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;
    
    // Convert delta to percentage
    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;
    
    // Calculate new position
    let newX = startStickerPos.current.x + deltaXPercent;
    let newY = startStickerPos.current.y + deltaYPercent;
    
    // Clamp to container bounds (with some padding)
    newX = Math.max(5, Math.min(95, newX));
    newY = Math.max(5, Math.min(95, newY));
    
    onUpdate(sticker.id, { x: newX, y: newY });
  }, [isDragging, containerRef, sticker.id, onUpdate]);

  // Mouse handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(sticker.id);
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startStickerPos.current = { x: sticker.x, y: sticker.y };
  };

  const handleMouseMove = useCallback((e) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers
  const handleTouchStart = (e) => {
    e.stopPropagation();
    onSelect?.(sticker.id);
    
    if (e.touches.length === 2) {
      // Pinch gesture start
      setIsPinching(true);
      setIsDragging(false);
      setInitialDistance(getDistance(e.touches[0], e.touches[1]));
      setInitialRotation(getAngle(e.touches[0], e.touches[1]));
      setInitialScale(sticker.scale || 1);
    } else if (e.touches.length === 1) {
      // Single touch drag
      setIsDragging(true);
      startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      startStickerPos.current = { x: sticker.x, y: sticker.y };
    }
  };

  const handleTouchMove = useCallback((e) => {
    if (isPinching && e.touches.length === 2) {
      // Handle pinch to scale and rotate
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const currentAngle = getAngle(e.touches[0], e.touches[1]);
      
      const scaleDelta = currentDistance / initialDistance;
      const newScale = Math.max(0.5, Math.min(3, initialScale * scaleDelta));
      
      const rotationDelta = currentAngle - initialRotation;
      const newRotation = (sticker.rotation || 0) + rotationDelta;
      
      onUpdate(sticker.id, { 
        scale: newScale,
        rotation: newRotation 
      });
      
      // Update initial rotation for continuous rotation
      setInitialRotation(currentAngle);
    } else if (isDragging && e.touches.length === 1) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [isPinching, isDragging, initialDistance, initialRotation, initialScale, sticker.id, sticker.rotation, onUpdate, handleMove]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setIsPinching(false);
  }, []);

  // Global event listeners for mouse
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Global event listeners for touch
  useEffect(() => {
    if (isDragging || isPinching) {
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
      return () => {
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, isPinching, handleTouchMove, handleTouchEnd]);

  // Double tap to delete
  const lastTapRef = useRef(0);
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onDelete?.(sticker.id);
    }
    lastTapRef.current = now;
  };

  return (
    <div
      ref={stickerRef}
      className={`absolute cursor-move select-none touch-none ${
        isSelected ? "ring-2 ring-pink-500 ring-offset-2 ring-offset-transparent rounded-lg" : ""
      } ${isDragging ? "z-50" : "z-20"}`}
      style={{
        left: `${sticker.x}%`,
        top: `${sticker.y}%`,
        transform: `translate(-50%, -50%) scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
        transition: isDragging || isPinching ? "none" : "transform 0.1s ease-out",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleDoubleTap}
    >
      <img
        src={sticker.url}
        alt="Sticker"
        className="max-w-[120px] pointer-events-none"
        draggable={false}
      />
      
      {/* Delete button - shows when selected */}
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(sticker.id);
          }}
          className="absolute -top-3 -right-3 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-colors"
        >
          <i className="fas fa-times text-sm"></i>
        </button>
      )}
      
      {/* Scale/Rotate hint - shows when selected */}
      {isSelected && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
          Pinch to resize & rotate
        </div>
      )}
    </div>
  );
}
