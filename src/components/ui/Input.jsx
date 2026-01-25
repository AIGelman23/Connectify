// src/components/ui/Input.jsx
"use client";

import React, { forwardRef, useState } from "react";

/**
 * Input Component - Standardized form input
 * 
 * @param {string} variant - Input style: default, filled, flushed
 * @param {string} size - Input size: sm, md, lg
 * @param {string} label - Label text
 * @param {string} error - Error message
 * @param {string} hint - Hint/help text
 * @param {string} leftIcon - FontAwesome icon class for left icon
 * @param {string} rightIcon - FontAwesome icon class for right icon
 * @param {function} onRightIconClick - Right icon click handler
 * @param {boolean} fullWidth - Take full width
 * @param {string} className - Additional CSS classes
 */
const Input = forwardRef(
  (
    {
      type = "text",
      variant = "default",
      size = "md",
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconClick,
      fullWidth = true,
      className = "",
      id,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    // Base input styles
    const baseStyles = `
      w-full
      transition-all duration-200
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      placeholder:text-gray-400 dark:placeholder:text-slate-500
    `;

    // Variant styles
    const variants = {
      default: `
        bg-white dark:bg-slate-800
        border border-gray-300 dark:border-slate-600
        rounded-lg
        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
        dark:focus:border-blue-400 dark:focus:ring-blue-400/20
        ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
      `,
      filled: `
        bg-gray-100 dark:bg-slate-700
        border border-transparent
        rounded-lg
        focus:bg-white dark:focus:bg-slate-800
        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
        ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
      `,
      flushed: `
        bg-transparent
        border-0 border-b-2 border-gray-300 dark:border-slate-600
        rounded-none
        focus:border-blue-500
        ${error ? "border-red-500 focus:border-red-500" : ""}
      `,
    };

    // Size styles
    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-4 py-3 text-lg",
    };

    // Padding adjustments for icons
    const leftPadding = {
      sm: "pl-9",
      md: "pl-10",
      lg: "pl-12",
    };

    const rightPadding = {
      sm: "pr-9",
      md: "pr-10",
      lg: "pr-12",
    };

    // Icon sizes
    const iconSizes = {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    };

    const iconPositions = {
      sm: "top-1/2 -translate-y-1/2",
      md: "top-1/2 -translate-y-1/2",
      lg: "top-1/2 -translate-y-1/2",
    };

    const widthStyle = fullWidth ? "w-full" : "";

    // Determine if we should show password toggle
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;
    const effectiveRightIcon = isPassword
      ? showPassword
        ? "fas fa-eye-slash"
        : "fas fa-eye"
      : rightIcon;
    const effectiveOnRightIconClick = isPassword
      ? () => setShowPassword(!showPassword)
      : onRightIconClick;

    return (
      <div className={`${widthStyle} ${className}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <span
              className={`
                absolute left-3 ${iconPositions[size]}
                ${iconSizes[size]}
                text-gray-400 dark:text-slate-500
                pointer-events-none
              `}
            >
              <i className={leftIcon} />
            </span>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            disabled={disabled}
            required={required}
            className={`
              ${baseStyles}
              ${variants[variant]}
              ${sizes[size]}
              ${leftIcon ? leftPadding[size] : ""}
              ${effectiveRightIcon ? rightPadding[size] : ""}
              text-gray-900 dark:text-slate-100
            `.trim().replace(/\s+/g, ' ')}
            {...props}
          />

          {/* Right icon */}
          {effectiveRightIcon && (
            <button
              type="button"
              onClick={effectiveOnRightIconClick}
              disabled={disabled}
              className={`
                absolute right-3 ${iconPositions[size]}
                ${iconSizes[size]}
                text-gray-400 dark:text-slate-500
                hover:text-gray-600 dark:hover:text-slate-300
                transition-colors
                ${effectiveOnRightIconClick ? "cursor-pointer" : "pointer-events-none"}
              `}
              tabIndex={-1}
            >
              <i className={effectiveRightIcon} />
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <i className="fas fa-exclamation-circle text-xs" />
            {error}
          </p>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

/**
 * Textarea Component - Multi-line text input
 */
const Textarea = forwardRef(
  (
    {
      variant = "default",
      size = "md",
      label,
      error,
      hint,
      fullWidth = true,
      className = "",
      id,
      required,
      disabled,
      rows = 3,
      resize = "vertical",
      ...props
    },
    ref
  ) => {
    const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    const baseStyles = `
      w-full
      transition-all duration-200
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      placeholder:text-gray-400 dark:placeholder:text-slate-500
    `;

    const variants = {
      default: `
        bg-white dark:bg-slate-800
        border border-gray-300 dark:border-slate-600
        rounded-lg
        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
        dark:focus:border-blue-400 dark:focus:ring-blue-400/20
        ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
      `,
      filled: `
        bg-gray-100 dark:bg-slate-700
        border border-transparent
        rounded-lg
        focus:bg-white dark:focus:bg-slate-800
        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
        ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
      `,
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-4 py-3 text-lg",
    };

    const resizeStyles = {
      none: "resize-none",
      vertical: "resize-y",
      horizontal: "resize-x",
      both: "resize",
    };

    const widthStyle = fullWidth ? "w-full" : "";

    return (
      <div className={`${widthStyle} ${className}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          rows={rows}
          className={`
            ${baseStyles}
            ${variants[variant]}
            ${sizes[size]}
            ${resizeStyles[resize]}
            text-gray-900 dark:text-slate-100
          `.trim().replace(/\s+/g, ' ')}
          {...props}
        />

        {error && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <i className="fas fa-exclamation-circle text-xs" />
            {error}
          </p>
        )}

        {hint && !error && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

/**
 * SearchInput - Specialized search input
 */
const SearchInput = forwardRef(
  (
    {
      size = "md",
      placeholder = "Search...",
      onClear,
      value,
      className = "",
      ...props
    },
    ref
  ) => {
    const hasValue = value && value.length > 0;

    return (
      <Input
        ref={ref}
        type="search"
        variant="filled"
        size={size}
        placeholder={placeholder}
        leftIcon="fas fa-search"
        rightIcon={hasValue ? "fas fa-times" : undefined}
        onRightIconClick={hasValue ? onClear : undefined}
        value={value}
        className={className}
        {...props}
      />
    );
  }
);

SearchInput.displayName = "SearchInput";

export { Input, Textarea, SearchInput };
export default Input;
