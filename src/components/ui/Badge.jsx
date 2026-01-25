// src/components/ui/Badge.jsx
"use client";

import React, { forwardRef } from "react";

/**
 * Badge Component - Small status indicator or label
 * 
 * @param {string} variant - Badge style: default, primary, secondary, success, warning, danger, info
 * @param {string} size - Badge size: sm, md, lg
 * @param {boolean} dot - Show as a dot indicator only
 * @param {boolean} pill - Use pill shape (more rounded)
 * @param {string} icon - FontAwesome icon class
 * @param {boolean} removable - Show remove button
 * @param {function} onRemove - Remove button click handler
 * @param {string} className - Additional CSS classes
 */
const Badge = forwardRef(
  (
    {
      children,
      variant = "default",
      size = "md",
      dot = false,
      pill = true,
      icon,
      removable = false,
      onRemove,
      className = "",
      ...props
    },
    ref
  ) => {
    // Variant styles
    const variants = {
      default: `
        bg-gray-100 text-gray-800
        dark:bg-slate-700 dark:text-slate-200
      `,
      primary: `
        bg-blue-100 text-blue-800
        dark:bg-blue-900/30 dark:text-blue-300
      `,
      secondary: `
        bg-purple-100 text-purple-800
        dark:bg-purple-900/30 dark:text-purple-300
      `,
      success: `
        bg-green-100 text-green-800
        dark:bg-green-900/30 dark:text-green-300
      `,
      warning: `
        bg-yellow-100 text-yellow-800
        dark:bg-yellow-900/30 dark:text-yellow-300
      `,
      danger: `
        bg-red-100 text-red-800
        dark:bg-red-900/30 dark:text-red-300
      `,
      info: `
        bg-cyan-100 text-cyan-800
        dark:bg-cyan-900/30 dark:text-cyan-300
      `,
      outline: `
        bg-transparent border border-gray-300 text-gray-700
        dark:border-slate-600 dark:text-slate-300
      `,
    };

    // Size styles
    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-0.5 text-xs",
      lg: "px-3 py-1 text-sm",
    };

    // Dot sizes
    const dotSizes = {
      sm: "w-1.5 h-1.5",
      md: "w-2 h-2",
      lg: "w-2.5 h-2.5",
    };

    const roundedStyle = pill ? "rounded-full" : "rounded-md";

    // If dot mode, render a simple dot
    if (dot) {
      const dotColors = {
        default: "bg-gray-500",
        primary: "bg-blue-500",
        secondary: "bg-purple-500",
        success: "bg-green-500",
        warning: "bg-yellow-500",
        danger: "bg-red-500",
        info: "bg-cyan-500",
      };

      return (
        <span
          ref={ref}
          className={`
            ${dotSizes[size]}
            ${dotColors[variant]}
            rounded-full inline-block
            ${className}
          `.trim().replace(/\s+/g, ' ')}
          {...props}
        />
      );
    }

    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center gap-1
          font-medium
          ${variants[variant]}
          ${sizes[size]}
          ${roundedStyle}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {icon && <i className={`${icon} text-[0.65em]`} />}
        {children}
        {removable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className="ml-1 -mr-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
            aria-label="Remove"
          >
            <i className="fas fa-times text-[0.65em]" />
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = "Badge";

/**
 * VerifiedBadge - Special badge for verified users
 * This will be used across the platform for verified status
 * 
 * @param {string} size - Badge size: xs, sm, md, lg, xl
 * @param {string} plan - Subscription plan: basic, pro, business (determines color)
 * @param {string} color - Custom color override (hex code like #3B82F6)
 * @param {boolean} showTooltip - Show tooltip on hover
 */
const VerifiedBadge = forwardRef(
  (
    {
      size = "md",
      plan = "basic", // basic (blue), pro (gold), business (purple)
      color = null, // Custom color override
      showTooltip = true,
      className = "",
      ...props
    },
    ref
  ) => {
    const sizes = {
      xs: "w-3 h-3",
      sm: "w-3.5 h-3.5",
      md: "w-4 h-4",
      lg: "w-5 h-5",
      xl: "w-6 h-6",
    };

    // Plan-based colors matching Stripe subscription tiers
    const planColors = {
      basic: "#3B82F6", // Blue
      pro: "#F59E0B", // Gold/Amber
      business: "#8B5CF6", // Purple
    };

    const planTooltips = {
      basic: "Verified",
      pro: "Pro Verified",
      business: "Business Verified",
    };

    // Use custom color if provided, otherwise use plan color
    const badgeColor = color || planColors[plan] || planColors.basic;
    const tooltipText = planTooltips[plan] || "Verified";

    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center justify-center
          ${sizes[size]}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        style={{ color: badgeColor }}
        title={showTooltip ? tooltipText : undefined}
        aria-label={tooltipText}
        {...props}
      >
        <svg
          viewBox="0 0 22 22"
          fill="currentColor"
          className="w-full h-full"
        >
          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
        </svg>
      </span>
    );
  }
);

VerifiedBadge.displayName = "VerifiedBadge";

/**
 * AdminBadge - Special badge for admin/staff users
 * Shows a shield icon with customizable colors for different admin roles
 * 
 * @param {string} size - Badge size: xs, sm, md, lg, xl
 * @param {string} role - Admin role: admin, moderator, staff (determines color)
 * @param {string} color - Custom color override (hex code)
 * @param {boolean} showTooltip - Show tooltip on hover
 */
const AdminBadge = forwardRef(
  (
    {
      size = "md",
      role = "admin", // admin (red), moderator (green), staff (orange)
      color = null,
      showTooltip = true,
      className = "",
      ...props
    },
    ref
  ) => {
    const sizes = {
      xs: "w-3 h-3",
      sm: "w-3.5 h-3.5",
      md: "w-4 h-4",
      lg: "w-5 h-5",
      xl: "w-6 h-6",
    };

    // Role-based colors
    const roleColors = {
      admin: "#EF4444", // Red
      moderator: "#10B981", // Green
      staff: "#F97316", // Orange
    };

    const roleTooltips = {
      admin: "Admin",
      moderator: "Moderator",
      staff: "Staff",
    };

    const badgeColor = color || roleColors[role] || roleColors.admin;
    const tooltipText = roleTooltips[role] || "Admin";

    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center justify-center
          ${sizes[size]}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        style={{ color: badgeColor }}
        title={showTooltip ? tooltipText : undefined}
        aria-label={tooltipText}
        {...props}
      >
        {/* Shield icon */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-full h-full"
        >
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
        </svg>
      </span>
    );
  }
);

AdminBadge.displayName = "AdminBadge";

/**
 * CountBadge - Badge showing a count (notifications, messages, etc.)
 */
const CountBadge = forwardRef(
  (
    {
      count = 0,
      max = 99,
      showZero = false,
      size = "md",
      variant = "danger",
      className = "",
      ...props
    },
    ref
  ) => {
    if (count === 0 && !showZero) return null;

    const displayCount = count > max ? `${max}+` : count;

    const sizes = {
      sm: "min-w-4 h-4 text-[10px]",
      md: "min-w-5 h-5 text-xs",
      lg: "min-w-6 h-6 text-sm",
    };

    const colors = {
      primary: "bg-blue-500 text-white",
      danger: "bg-red-500 text-white",
      success: "bg-green-500 text-white",
    };

    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center justify-center
          px-1.5 rounded-full
          font-medium
          ${sizes[size]}
          ${colors[variant]}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {displayCount}
      </span>
    );
  }
);

CountBadge.displayName = "CountBadge";

export { Badge, VerifiedBadge, AdminBadge, CountBadge };
export default Badge;
