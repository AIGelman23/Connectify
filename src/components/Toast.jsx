"use client";

import { useEffect, useState } from "react";

export default function Toast({ message, type = "info", duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300); // Wait for fade out
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    info: "fas fa-info-circle",
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
  };

  const colors = {
    info: "bg-blue-600",
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-yellow-600",
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed bottom-20 md:bottom-4 right-4 z-[100] 
        px-4 py-3 rounded-lg shadow-xl text-white 
        flex items-center gap-3 min-w-[300px] max-w-[400px]
        animate-slide-up backdrop-blur-sm
        ${colors[type]}
      `}
      style={{
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <i className={`${icons[type]} text-xl`}></i>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose?.(), 300);
        }}
        className="ml-2 text-white/80 hover:text-white"
      >
        <i className="fas fa-times"></i>
      </button>
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
