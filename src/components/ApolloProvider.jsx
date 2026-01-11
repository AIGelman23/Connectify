// src/components/ApolloClientProvider.jsx
"use client"; // This is crucial! It marks this as a Client Component.

import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { useSession } from 'next-auth/react'; // NEW: Import useSession
import React, { useMemo } from 'react'; // NEW: Import useMemo
import ConnectifyLogo from "./ConnectifyLogo";

// Define your static GraphQL endpoint here.
// IMPORTANT: Replace 'http://localhost:4000/graphql' with your actual GraphQL server URL
const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';

// Create the HttpLink once, as it's static
const httpLink = new HttpLink({
	uri: GRAPHQL_ENDPOINT,
});

export default function ApolloClientProvider({ children }) {
	// Use the useSession hook to get the current session
	const { data: session, status } = useSession();

	// Use useMemo to create the Apollo Client instance.
	// It will only re-create the client if the session.jwt changes.
	const apolloClient = useMemo(() => {
		// This authLink will now have access to the dynamic session data
		const authLink = setContext((_, { headers }) => {
			// Get the token from the session object
			// You've correctly added `session.jwt` in your NextAuth callbacks.
			console.log(session?.jwt)
			const token = session?.jwt || null; // Use session.jwt for the token

			return {
				headers: {
					...headers,
					// Only add the Authorization header if a token exists
					authorization: token ? `Bearer ${token}` : '',
				}
			};
		});

		return new ApolloClient({
			// Chain the authLink before the httpLink
			link: authLink.concat(httpLink),
			cache: new InMemoryCache(), // Caches query results
		});
	}, [session?.jwt]); // Dependency array: recreate client if session.jwt changes

	// Optional: You might want to render a loading state or nothing if the session is still loading
	// This depends on whether your app can function meaningfully without auth status.
	// For most cases, waiting for the session status is good practice.
	if (status === "loading") {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100">
				<div className="text-center">
					<ConnectifyLogo width={350} height={350} className="mx-auto animate-pulse" />
				</div>
			</div>
		);
	}

	return (
		<ApolloProvider client={apolloClient}>
			{children}
		</ApolloProvider>
	);
}