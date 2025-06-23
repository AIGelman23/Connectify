// src/app/layout.jsx
import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.css";

import { Providers } from "../components/Providers";

export const metadata = {
  title: "ConnectifAI App",
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
