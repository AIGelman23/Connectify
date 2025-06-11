// src/app/providers.jsx
"use client"; // This directive is crucial! It marks this as a Client Component.

import { SessionProvider } from "next-auth/react";
import { ChatProvider } from "@/context/ChatContext"; // Import your ChatProvider
import QueryProvider from '@/components/QueryProvider'; // Import the QueryProvider

export function Providers({ children }) {
	return (
		<SessionProvider>
			<QueryProvider> {/* <-- QueryProvider is used here */}
				<ChatProvider>
					{children}
				</ChatProvider>
			</QueryProvider>
		</SessionProvider>
	);
}