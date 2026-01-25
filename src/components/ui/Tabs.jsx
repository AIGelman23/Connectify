// src/components/ui/Tabs.jsx
"use client";

import React, { createContext, useContext, useState } from "react";

/**
 * Tabs Context
 */
const TabsContext = createContext({
  activeTab: "",
  setActiveTab: () => {},
});

/**
 * Tabs Component - Tab container
 * 
 * @param {string} defaultValue - Default active tab value
 * @param {string} value - Controlled active tab value
 * @param {function} onValueChange - Tab change handler
 * @param {string} variant - Tab style: default, pills, underline
 * @param {string} size - Tab size: sm, md, lg
 * @param {boolean} fullWidth - Tabs take full width
 * @param {string} className - Additional CSS classes
 */
const Tabs = ({
  defaultValue,
  value,
  onValueChange,
  variant = "default",
  size = "md",
  fullWidth = false,
  children,
  className = "",
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const activeTab = value !== undefined ? value : internalValue;

  const setActiveTab = (newValue) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant, size, fullWidth }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

/**
 * TabsList - Container for tab triggers
 */
const TabsList = ({ children, className = "" }) => {
  const { variant, fullWidth } = useContext(TabsContext);

  const variants = {
    default: `
      inline-flex items-center
      p-1 rounded-lg
      bg-gray-100 dark:bg-slate-700
    `,
    pills: `
      inline-flex items-center gap-2
    `,
    underline: `
      inline-flex items-center
      border-b border-gray-200 dark:border-slate-700
    `,
  };

  return (
    <div
      className={`
        ${variants[variant]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="tablist"
    >
      {children}
    </div>
  );
};

/**
 * TabsTrigger - Individual tab button
 */
const TabsTrigger = ({
  value,
  disabled = false,
  children,
  icon,
  count,
  className = "",
}) => {
  const { activeTab, setActiveTab, variant, size, fullWidth } = useContext(TabsContext);
  const isActive = activeTab === value;

  // Size styles
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  // Variant styles
  const variantStyles = {
    default: {
      base: "rounded-md transition-all duration-200 font-medium",
      active: "bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-slate-100",
      inactive: "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200",
    },
    pills: {
      base: "rounded-full transition-all duration-200 font-medium",
      active: "bg-blue-600 text-white dark:bg-blue-500",
      inactive: "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600",
    },
    underline: {
      base: "border-b-2 transition-all duration-200 font-medium -mb-px",
      active: "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400",
      inactive: "border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:border-gray-300",
    },
  };

  const styles = variantStyles[variant];

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={`
        ${styles.base}
        ${sizes[size]}
        ${isActive ? styles.active : styles.inactive}
        ${fullWidth ? "flex-1" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        inline-flex items-center justify-center gap-2
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {icon && <i className={`${icon} text-sm`} />}
      {children}
      {count !== undefined && (
        <span
          className={`
            ml-1 px-1.5 py-0.5 rounded-full text-xs font-medium
            ${isActive
              ? variant === "pills"
                ? "bg-white/20 text-white"
                : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              : "bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-slate-400"
            }
          `.trim().replace(/\s+/g, ' ')}
        >
          {count}
        </span>
      )}
    </button>
  );
};

/**
 * TabsContent - Content panel for a tab
 */
const TabsContent = ({
  value,
  children,
  className = "",
  forceMount = false,
}) => {
  const { activeTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  if (!isActive && !forceMount) return null;

  return (
    <div
      id={`panel-${value}`}
      role="tabpanel"
      aria-labelledby={`tab-${value}`}
      hidden={!isActive}
      className={`
        ${isActive ? "animate-fade-in" : "hidden"}
        focus:outline-none
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      tabIndex={0}
    >
      {children}
    </div>
  );
};

/**
 * SimpleTabs - Pre-composed tabs for simple use cases
 */
const SimpleTabs = ({
  tabs,
  defaultValue,
  value,
  onValueChange,
  variant = "default",
  size = "md",
  fullWidth = false,
  className = "",
}) => {
  return (
    <Tabs
      defaultValue={defaultValue || tabs[0]?.value}
      value={value}
      onValueChange={onValueChange}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
    >
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            icon={tab.icon}
            count={tab.count}
            disabled={tab.disabled}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent, SimpleTabs };
export default Tabs;
