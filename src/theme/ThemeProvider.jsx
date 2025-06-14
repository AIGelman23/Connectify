"use client";
import React, { createContext, useLayoutEffect, useState } from "react";

export const ThemeContext = createContext({
	theme: "light",
	setTheme: () => {},
});

export function ThemeProvider({ children }) {
	const [theme, setThemeState] = useState("light");
	const [themeLoaded, setThemeLoaded] = useState(false);

	// Synchronously set theme before paint to avoid FOUC
	useLayoutEffect(() => {
		let saved = null;
		if (typeof window !== "undefined") {
			saved = localStorage.getItem("theme");
			if (!saved) {
				saved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
			}
			setThemeState(saved);
			updateHtmlClass(saved);
			setThemeLoaded(true);
		}
	}, []);

	useLayoutEffect(() => {
		if (!themeLoaded) return;
		if (typeof window !== "undefined") {
			updateHtmlClass(theme);
			localStorage.setItem("theme", theme);
		}
	}, [theme, themeLoaded]);

	const updateHtmlClass = (themeValue) => {
		const html = document.documentElement;
		if (themeValue === "dark") {
			html.classList.add("dark");
			html.classList.remove("light");
			html.setAttribute("data-theme", "dark");
		} else {
			html.classList.remove("dark");
			html.classList.add("light");
			html.setAttribute("data-theme", "light");
		}
	};

	const setTheme = (newTheme) => {
		setThemeState(newTheme);
		if (typeof window !== "undefined") {
			updateHtmlClass(newTheme);
			localStorage.setItem("theme", newTheme);
		}
	};

	if (!themeLoaded) return null;

	return (
		<ThemeContext.Provider value={{ theme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}
