// src/app/layout.jsx
import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.css";

// --- FIX IS HERE: Changed to named import for Providers ---
// Assuming providers.jsx is in src/app/ and not src/components/
import { Providers } from "../components/Providers";
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

const client = new ApolloClient({
	uri: 'http://localhost:4000/graphql', // Replace with your GraphQL server URL
	cache: new InMemoryCache(),
});

export const metadata = {
	title: "Connectify App",
	description: "Your professional social network",
};

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body className="min-h-screen bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">
				<Providers>
					{children}
				</Providers>
			</body>
		</html>
	);
}

// --- IMPORTANT ---
// Remove any useEffect, useLayoutEffect, or other React hooks from this file.
// Do NOT add "use client" to this file. 
// If you need to sync body classes with theme, do it in a separate client component inside <Providers>.
// This file must remain a Server Component for Next.js 15+ layout API and metadata support.