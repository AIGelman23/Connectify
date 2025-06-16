// src/app/providers.jsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { ChatProvider } from "@/context/ChatContext";
import QueryProvider from '@/components/QueryProvider';
import ApolloClientProvider from '@/components/ApolloProvider';

export function Providers({ children }) {
	return (
		<SessionProvider>
			<ThemeProvider>
				<ApolloClientProvider>
					<QueryProvider>
						<ChatProvider>
							{children}
						</ChatProvider>
					</QueryProvider>
				</ApolloClientProvider>
			</ThemeProvider>
		</SessionProvider>
	);
}