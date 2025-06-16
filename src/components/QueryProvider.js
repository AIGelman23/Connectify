// src/components/QueryProvider.jsx
"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Optional: for dev tools

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// With SSR, we usually want to set some default staleTime
				// above 0 to avoid refetching on first mount.
				staleTime: 60 * 1000, // 60 seconds
			},
		},
	});
}

// REMOVED TYPE ANNOTATION:
let browserQueryClient = undefined;

function getQueryClient() {
	if (typeof window === 'undefined') {
		// Server: Always make a new query client
		return makeQueryClient();
	} else {
		// Browser: Create a single query client if it doesn't already exist
		// If we are hot-reloading, we may need to create a new one to avoid stale data
		if (!browserQueryClient) browserQueryClient = makeQueryClient();
		return browserQueryClient;
	}
}

export default function QueryProvider({ children }) {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{/* Optional: React Query Devtools for easy debugging in development */}
			{process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
		</QueryClientProvider>
	);
}