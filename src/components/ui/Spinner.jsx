// src/components/ui/Spinner.jsx
"use client";

import React from "react";

/**
 * Spinner Component - Loading indicator
 * 
 * @param {string} size - Spinner size: xs, sm, md, lg, xl
 * @param {string} color - Color variant: primary, white, gray, current
 * @param {string} className - Additional CSS classes
 */
const Spinner = ({ size = "md", color = "primary", className = "" }) => {
  // Size styles
  const sizes = {
    xs: "w-3 h-3 border",
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-2",
    xl: "w-12 h-12 border-3",
  };

  // Color styles
  const colors = {
    primary: "border-blue-600 border-t-transparent dark:border-blue-400",
    white: "border-white border-t-transparent",
    gray: "border-gray-400 border-t-transparent dark:border-slate-500",
    current: "border-current border-t-transparent",
  };

  return (
    <div
      className={`
        ${sizes[size]}
        ${colors[color]}
        rounded-full
        animate-spin
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="status"
      aria-label="Loading"
    />
  );
};

/**
 * SpinnerOverlay - Full container spinner with backdrop
 */
const SpinnerOverlay = ({
  size = "lg",
  message,
  className = "",
}) => {
  return (
    <div
      className={`
        absolute inset-0
        flex flex-col items-center justify-center
        bg-white/80 dark:bg-slate-900/80
        backdrop-blur-sm
        z-50
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      <Spinner size={size} />
      {message && (
        <p className="mt-3 text-sm text-gray-600 dark:text-slate-400">
          {message}
        </p>
      )}
    </div>
  );
};

/**
 * PageLoader - Full page loading state (used during initial page load)
 */
const PageLoader = ({ message = "Loading..." }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col items-center space-y-4">
        {/* Logo placeholder - can be replaced with actual logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg animate-pulse">
          <span className="text-white text-2xl font-bold">C</span>
        </div>
        <Spinner size="md" />
        <p className="text-gray-600 dark:text-slate-400 text-sm animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};

/**
 * SkeletonLoader - Placeholder loading animation
 */
const Skeleton = ({
  variant = "text",
  width,
  height,
  className = "",
}) => {
  const variants = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  const style = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`
        bg-gray-200 dark:bg-slate-700
        animate-pulse
        ${variants[variant]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      style={style}
    />
  );
};

/**
 * CardSkeleton - Skeleton for a typical card
 */
const CardSkeleton = ({ className = "" }) => {
  return (
    <div
      className={`
        bg-white dark:bg-slate-800
        rounded-xl border border-gray-200 dark:border-slate-700
        p-4
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="40%" height={16} />
          <Skeleton width="60%" height={12} />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton width="100%" height={12} />
        <Skeleton width="90%" height={12} />
        <Skeleton width="70%" height={12} />
      </div>
    </div>
  );
};

/**
 * PostSkeleton - Skeleton for a post card
 */
const PostSkeleton = ({ className = "" }) => {
  return (
    <div
      className={`
        bg-white dark:bg-slate-800
        rounded-xl border border-gray-200 dark:border-slate-700
        p-4
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton width="30%" height={14} className="mb-1" />
          <Skeleton width="20%" height={10} />
        </div>
      </div>
      {/* Content */}
      <div className="space-y-2 mb-4">
        <Skeleton width="100%" height={12} />
        <Skeleton width="95%" height={12} />
        <Skeleton width="60%" height={12} />
      </div>
      {/* Image placeholder */}
      <Skeleton variant="rectangular" width="100%" height={200} className="mb-4" />
      {/* Actions */}
      <div className="flex gap-4">
        <Skeleton width={60} height={24} />
        <Skeleton width={60} height={24} />
        <Skeleton width={60} height={24} />
      </div>
    </div>
  );
};

export { Spinner, SpinnerOverlay, PageLoader, Skeleton, CardSkeleton, PostSkeleton };
export default Spinner;
