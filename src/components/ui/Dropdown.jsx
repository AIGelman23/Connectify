// src/components/ui/Dropdown.jsx
"use client";

import React, { useState, useRef, useEffect, createContext, useContext } from "react";
import { createPortal } from "react-dom";

/**
 * Dropdown Context
 */
const DropdownContext = createContext({
  isOpen: false,
  setIsOpen: () => {},
  triggerRef: null,
});

/**
 * Dropdown Component - Flexible dropdown menu
 * 
 * @param {boolean} open - Controlled open state
 * @param {function} onOpenChange - Open state change handler
 * @param {string} align - Menu alignment: start, center, end
 * @param {string} side - Menu position: top, bottom
 * @param {string} className - Additional CSS classes
 */
const Dropdown = ({
  open,
  onOpenChange,
  align = "start",
  side = "bottom",
  children,
  className = "",
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const triggerRef = useRef(null);

  const setIsOpen = (newOpen) => {
    if (open === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, triggerRef, align, side }}>
      <div ref={triggerRef} className={`relative inline-block ${className}`}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

/**
 * DropdownTrigger - Element that triggers the dropdown
 */
const DropdownTrigger = ({ children, asChild = false }) => {
  const { isOpen, setIsOpen } = useContext(DropdownContext);

  const handleClick = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        handleClick(e);
        children.props.onClick?.(e);
      },
      "aria-expanded": isOpen,
      "aria-haspopup": true,
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      {children}
    </button>
  );
};

/**
 * DropdownMenu - The dropdown menu container
 */
const DropdownMenu = ({ children, className = "", width = "auto" }) => {
  const { isOpen, align, side } = useContext(DropdownContext);

  if (!isOpen) return null;

  const alignStyles = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  const sideStyles = {
    top: "bottom-full mb-1",
    bottom: "top-full mt-1",
  };

  const widthStyles = {
    auto: "min-w-[200px]",
    sm: "w-48",
    md: "w-56",
    lg: "w-64",
    xl: "w-80",
    full: "w-full",
  };

  return (
    <div
      className={`
        absolute z-50
        ${alignStyles[align]}
        ${sideStyles[side]}
        ${widthStyles[width]}
        bg-white dark:bg-slate-800
        border border-gray-200 dark:border-slate-700
        rounded-lg shadow-lg
        py-1
        animate-scale-in origin-top
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="menu"
    >
      {children}
    </div>
  );
};

/**
 * DropdownItem - Individual menu item
 */
const DropdownItem = ({
  children,
  icon,
  shortcut,
  disabled = false,
  danger = false,
  onClick,
  className = "",
}) => {
  const { setIsOpen } = useContext(DropdownContext);

  const handleClick = (e) => {
    if (disabled) return;
    onClick?.(e);
    setIsOpen(false);
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={`
        w-full px-3 py-2
        flex items-center gap-3
        text-left text-sm
        transition-colors
        ${disabled
          ? "opacity-50 cursor-not-allowed"
          : danger
            ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
        }
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {icon && (
        <i className={`${icon} w-4 text-center ${danger ? "" : "text-gray-400 dark:text-slate-500"}`} />
      )}
      <span className="flex-1">{children}</span>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-slate-500">
          {shortcut}
        </span>
      )}
    </button>
  );
};

/**
 * DropdownSeparator - Visual separator between items
 */
const DropdownSeparator = () => {
  return <div className="my-1 border-t border-gray-200 dark:border-slate-700" />;
};

/**
 * DropdownLabel - Non-interactive label/header
 */
const DropdownLabel = ({ children, className = "" }) => {
  return (
    <div
      className={`
        px-3 py-1.5
        text-xs font-semibold uppercase tracking-wider
        text-gray-500 dark:text-slate-400
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </div>
  );
};

/**
 * DropdownCheckboxItem - Checkbox menu item
 */
const DropdownCheckboxItem = ({
  children,
  checked,
  onCheckedChange,
  disabled = false,
  className = "",
}) => {
  const { setIsOpen } = useContext(DropdownContext);

  const handleClick = () => {
    if (disabled) return;
    onCheckedChange?.(!checked);
  };

  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={`
        w-full px-3 py-2
        flex items-center gap-3
        text-left text-sm
        transition-colors
        ${disabled
          ? "opacity-50 cursor-not-allowed"
          : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
        }
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      <span
        className={`
          w-4 h-4 rounded border flex items-center justify-center
          ${checked
            ? "bg-blue-600 border-blue-600 text-white"
            : "border-gray-300 dark:border-slate-600"
          }
        `.trim().replace(/\s+/g, ' ')}
      >
        {checked && <i className="fas fa-check text-[10px]" />}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
};

/**
 * SimpleDropdown - Pre-composed dropdown for simple use cases
 */
const SimpleDropdown = ({
  trigger,
  items,
  align = "start",
  side = "bottom",
  width = "auto",
  className = "",
}) => {
  return (
    <Dropdown align={align} side={side} className={className}>
      <DropdownTrigger asChild>
        {trigger}
      </DropdownTrigger>
      <DropdownMenu width={width}>
        {items.map((item, index) => {
          if (item.type === "separator") {
            return <DropdownSeparator key={`sep-${index}`} />;
          }
          if (item.type === "label") {
            return <DropdownLabel key={`label-${index}`}>{item.text}</DropdownLabel>;
          }
          return (
            <DropdownItem
              key={item.value || index}
              icon={item.icon}
              shortcut={item.shortcut}
              disabled={item.disabled}
              danger={item.danger}
              onClick={item.onClick}
            >
              {item.label}
            </DropdownItem>
          );
        })}
      </DropdownMenu>
    </Dropdown>
  );
};

export {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  DropdownCheckboxItem,
  SimpleDropdown,
};
export default Dropdown;
