// src/components/ui/Avatar.jsx
"use client";

import React, { useState, forwardRef } from "react";

/**
 * Avatar Component - User avatar with fallback
 * 
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text for image
 * @param {string} name - User name (used for fallback initials)
 * @param {string} size - Avatar size: xs, sm, md, lg, xl, 2xl
 * @param {boolean} rounded - Use full rounded (circle) or rounded corners
 * @param {string} status - Online status: online, offline, away, busy
 * @param {boolean} bordered - Add border around avatar
 * @param {string} className - Additional CSS classes
 */
const Avatar = forwardRef(
  (
    {
      src,
      alt,
      name,
      size = "md",
      rounded = true,
      status,
      bordered = false,
      className = "",
      onClick,
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = useState(false);

    // Size styles
    const sizes = {
      xs: "w-6 h-6 text-xs",
      sm: "w-8 h-8 text-sm",
      md: "w-10 h-10 text-base",
      lg: "w-12 h-12 text-lg",
      xl: "w-16 h-16 text-xl",
      "2xl": "w-20 h-20 text-2xl",
    };

    // Status indicator sizes
    const statusSizes = {
      xs: "w-1.5 h-1.5 border",
      sm: "w-2 h-2 border",
      md: "w-2.5 h-2.5 border-2",
      lg: "w-3 h-3 border-2",
      xl: "w-3.5 h-3.5 border-2",
      "2xl": "w-4 h-4 border-2",
    };

    // Status colors
    const statusColors = {
      online: "bg-green-500",
      offline: "bg-gray-400",
      away: "bg-yellow-500",
      busy: "bg-red-500",
    };

    // Get initials from name
    const getInitials = (name) => {
      if (!name) return "?";
      const parts = name.split(" ").filter(Boolean);
      if (parts.length === 1) return parts[0][0].toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Generate a consistent color based on name
    const getBackgroundColor = (name) => {
      if (!name) return "bg-gray-400";
      const colors = [
        "bg-blue-500",
        "bg-green-500",
        "bg-purple-500",
        "bg-pink-500",
        "bg-indigo-500",
        "bg-teal-500",
        "bg-orange-500",
        "bg-cyan-500",
      ];
      const index = name.charCodeAt(0) % colors.length;
      return colors[index];
    };

    const roundedStyle = rounded ? "rounded-full" : "rounded-lg";
    const borderStyle = bordered
      ? "ring-2 ring-white dark:ring-slate-800"
      : "";
    const cursorStyle = onClick ? "cursor-pointer" : "";

    const showFallback = !src || imageError;

    return (
      <div className="relative inline-flex" ref={ref}>
        {showFallback ? (
          <div
            className={`
              ${sizes[size]}
              ${roundedStyle}
              ${borderStyle}
              ${cursorStyle}
              ${getBackgroundColor(name)}
              flex items-center justify-center
              font-medium text-white
              ${className}
            `.trim().replace(/\s+/g, ' ')}
            onClick={onClick}
            title={alt || name}
            {...props}
          >
            {getInitials(name)}
          </div>
        ) : (
          <img
            src={src}
            alt={alt || name || "Avatar"}
            onError={() => setImageError(true)}
            onClick={onClick}
            className={`
              ${sizes[size]}
              ${roundedStyle}
              ${borderStyle}
              ${cursorStyle}
              object-cover
              ${className}
            `.trim().replace(/\s+/g, ' ')}
            {...props}
          />
        )}

        {/* Status indicator */}
        {status && (
          <span
            className={`
              absolute bottom-0 right-0
              ${statusSizes[size]}
              ${statusColors[status]}
              ${roundedStyle}
              border-white dark:border-slate-800
            `.trim().replace(/\s+/g, ' ')}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

/**
 * AvatarGroup - Display multiple avatars stacked
 */
const AvatarGroup = ({
  avatars = [],
  max = 4,
  size = "md",
  className = "",
}) => {
  const displayAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  // Overlap spacing based on size
  const overlaps = {
    xs: "-space-x-1.5",
    sm: "-space-x-2",
    md: "-space-x-2.5",
    lg: "-space-x-3",
    xl: "-space-x-4",
    "2xl": "-space-x-5",
  };

  const sizes = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
    "2xl": "w-20 h-20 text-xl",
  };

  return (
    <div className={`flex items-center ${overlaps[size]} ${className}`}>
      {displayAvatars.map((avatar, index) => (
        <Avatar
          key={avatar.id || index}
          src={avatar.src || avatar.imageUrl || avatar.image}
          name={avatar.name}
          alt={avatar.alt || avatar.name}
          size={size}
          bordered
          className="ring-2 ring-white dark:ring-slate-800"
        />
      ))}
      {remaining > 0 && (
        <div
          className={`
            ${sizes[size]}
            rounded-full
            bg-gray-200 dark:bg-slate-700
            flex items-center justify-center
            font-medium text-gray-600 dark:text-slate-300
            ring-2 ring-white dark:ring-slate-800
          `.trim().replace(/\s+/g, ' ')}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

export { Avatar, AvatarGroup };
export default Avatar;
