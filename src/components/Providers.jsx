// src/app/providers.jsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { ChatProvider } from "@/context/ChatContext";
import QueryProvider from '@/components/QueryProvider';
import ApolloClientProvider from '@/components/ApolloProvider';
import ChatDock from "@/components/chat/ChatDock";

export function Providers({ children }) {
	return (
		<SessionProvider>
			<ThemeProvider>
				<ApolloClientProvider>
					<QueryProvider>
						<ChatProvider>
							{children}
							<ChatDock />
						</ChatProvider>
					</QueryProvider>
				</ApolloClientProvider>
			</ThemeProvider>
		</SessionProvider>
	);
}