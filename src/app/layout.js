// src/app/layout.jsx
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import "@fortawesome/fontawesome-free/css/all.css";

// --- FIX IS HERE: Changed to named import for Providers ---
// Assuming providers.jsx is in src/app/ and not src/components/
import { Providers } from "../components/Providers"; // If providers.jsx is in src/app/

// If providers.jsx were truly in src/components/, it would be:
// import { Providers } from "../components/Providers"; // Notice the curly braces
const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata = {
	title: "Connectify App",
	description: "Your professional social network",
};

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}