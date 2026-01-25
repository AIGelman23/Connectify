// src/components/ui/Button.jsx
"use client";

import React, { forwardRef } from "react";
import { Spinner } from "./Spinner";

/**
 * Button Component - Standardized button with multiple variants
 * 
 * @param {string} variant - Button style: primary, secondary, outline, ghost, danger
 * @param {string} size - Button size: xs, sm, md, lg, xl
 * @param {boolean} fullWidth - Whether button takes full width
 * @param {boolean} loading - Show loading spinner
 * @param {boolean} disabled - Disable button
 * @param {string} leftIcon - FontAwesome icon class for left icon
 * @param {string} rightIcon - FontAwesome icon class for right icon
 * @param {string} className - Additional CSS classes
 */
const Button = forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = "",
      type = "button",
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = `
      inline-flex items-center justify-center font-medium
      transition-all duration-200 ease-in-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-[0.98]
    `;

    // Variant styles
    const variants = {
      primary: `
        bg-blue-600 text-white
        hover:bg-blue-700
        focus-visible:ring-blue-500
        dark:bg-blue-500 dark:hover:bg-blue-600
      `,
      secondary: `
        bg-gray-100 text-gray-900
        hover:bg-gray-200
        focus-visible:ring-gray-500
        dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600
      `,
      outline: `
        border-2 border-blue-600 text-blue-600 bg-transparent
        hover:bg-blue-50
        focus-visible:ring-blue-500
        dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20
      `,
      ghost: `
        text-gray-700 bg-transparent
        hover:bg-gray-100
        focus-visible:ring-gray-500
        dark:text-slate-300 dark:hover:bg-slate-700
      `,
      danger: `
        bg-red-600 text-white
        hover:bg-red-700
        focus-visible:ring-red-500
        dark:bg-red-500 dark:hover:bg-red-600
      `,
      success: `
        bg-green-600 text-white
        hover:bg-green-700
        focus-visible:ring-green-500
        dark:bg-green-500 dark:hover:bg-green-600
      `,
      link: `
        text-blue-600 bg-transparent underline-offset-4
        hover:underline
        focus-visible:ring-blue-500
        dark:text-blue-400
        p-0
      `,
    };

    // Size styles
    const sizes = {
      xs: "px-2 py-1 text-xs rounded gap-1",
      sm: "px-3 py-1.5 text-sm rounded-md gap-1.5",
      md: "px-4 py-2 text-sm rounded-lg gap-2",
      lg: "px-5 py-2.5 text-base rounded-lg gap-2",
      xl: "px-6 py-3 text-lg rounded-xl gap-2.5",
    };

    // Icon sizes based on button size
    const iconSizes = {
      xs: "text-xs",
      sm: "text-sm",
      md: "text-sm",
      lg: "text-base",
      xl: "text-lg",
    };

    const widthStyle = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${sizes[size]}
          ${widthStyle}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {loading ? (
          <>
            <Spinner size={size === "xs" || size === "sm" ? "xs" : "sm"} />
            <span className="ml-2">{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <i className={`${leftIcon} ${iconSizes[size]}`} />}
            {children}
            {rightIcon && <i className={`${rightIcon} ${iconSizes[size]}`} />}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

/**
 * IconButton - Button with only an icon
 */
const IconButton = forwardRef(
  (
    {
      icon,
      variant = "ghost",
      size = "md",
      label,
      className = "",
      ...props
    },
    ref
  ) => {
    // Size styles for icon buttons (square)
    const sizes = {
      xs: "w-6 h-6 text-xs rounded",
      sm: "w-8 h-8 text-sm rounded-md",
      md: "w-10 h-10 text-base rounded-lg",
      lg: "w-12 h-12 text-lg rounded-lg",
      xl: "w-14 h-14 text-xl rounded-xl",
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        className={`${sizes[size]} !p-0 ${className}`}
        aria-label={label}
        {...props}
      >
        <i className={icon} />
      </Button>
    );
  }
);

IconButton.displayName = "IconButton";

/**
 * ButtonGroup - Group of buttons
 */
const ButtonGroup = ({ children, className = "" }) => {
  return (
    <div className={`inline-flex rounded-lg overflow-hidden ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return null;
        return React.cloneElement(child, {
          className: `
            ${child.props.className || ""}
            ${index === 0 ? "rounded-r-none" : ""}
            ${index === React.Children.count(children) - 1 ? "rounded-l-none" : ""}
            ${index !== 0 && index !== React.Children.count(children) - 1 ? "rounded-none" : ""}
            ${index !== 0 ? "border-l-0" : ""}
          `,
        });
      })}
    </div>
  );
};

export { Button, IconButton, ButtonGroup };
export default Button;
