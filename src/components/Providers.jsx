// src/app/providers.jsx
"use client"; // This directive is crucial! It marks this as a Client Component.

import { SessionProvider } from "next-auth/react";
import { ChatProvider } from "@/context/ChatContext"; // Import your ChatProvider

export function Providers({ children }) {
  return (
    <SessionProvider>
      {/*
        Wrap your children with ChatProvider.
        It must be inside SessionProvider so that ChatProvider can access
        the session data (user ID, JWT, etc.) via useSession().
      */}
      <ChatProvider>
        {children}
      </ChatProvider>
    </SessionProvider>
  );
}