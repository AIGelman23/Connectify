// src/components/ui/Card.jsx
"use client";

import React, { forwardRef } from "react";

/**
 * Card Component - Standardized card container
 * 
 * @param {string} variant - Card style: default, elevated, interactive, outlined
 * @param {string} padding - Padding size: none, sm, md, lg
 * @param {boolean} hoverable - Add hover effects
 * @param {string} className - Additional CSS classes
 */
const Card = forwardRef(
  (
    {
      children,
      variant = "default",
      padding = "md",
      hoverable = false,
      className = "",
      as: Component = "div",
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = `
      bg-white dark:bg-slate-800
      rounded-xl
      transition-all duration-200
    `;

    // Variant styles
    const variants = {
      default: `
        border border-gray-200 dark:border-slate-700
        shadow-sm
      `,
      elevated: `
        border border-gray-100 dark:border-slate-700
        shadow-md
      `,
      interactive: `
        border border-gray-200 dark:border-slate-700
        shadow-sm
        cursor-pointer
        hover:shadow-md hover:border-gray-300 dark:hover:border-slate-600
        active:scale-[0.99]
      `,
      outlined: `
        border-2 border-gray-200 dark:border-slate-700
      `,
      ghost: `
        bg-transparent dark:bg-transparent
      `,
    };

    // Padding styles
    const paddings = {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
      xl: "p-8",
    };

    // Hover effect (separate from interactive variant)
    const hoverStyles = hoverable
      ? "hover:shadow-md hover:-translate-y-0.5"
      : "";

    return (
      <Component
        ref={ref}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${paddings[padding]}
          ${hoverStyles}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = "Card";

/**
 * CardHeader - Card header section
 */
const CardHeader = forwardRef(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          flex items-center justify-between
          pb-4 mb-4
          border-b border-gray-100 dark:border-slate-700
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

/**
 * CardTitle - Card title text
 */
const CardTitle = forwardRef(
  ({ children, className = "", as: Component = "h3", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={`
          text-lg font-semibold
          text-gray-900 dark:text-slate-100
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

CardTitle.displayName = "CardTitle";

/**
 * CardDescription - Card description text
 */
const CardDescription = forwardRef(
  ({ children, className = "", ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`
          text-sm text-gray-500 dark:text-slate-400
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = "CardDescription";

/**
 * CardContent - Card main content area
 */
const CardContent = forwardRef(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={className}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = "CardContent";

/**
 * CardFooter - Card footer section
 */
const CardFooter = forwardRef(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          flex items-center justify-between
          pt-4 mt-4
          border-t border-gray-100 dark:border-slate-700
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export default Card;
