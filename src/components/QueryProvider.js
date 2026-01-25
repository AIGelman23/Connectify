// src/components/QueryProvider.jsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { pusherClient } from "@/lib/pusher-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"; // Optional: for dev tools

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
  if (typeof window === "undefined") {
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
  const { data: session } = useSession();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // In development, service workers frequently cause stale chunk/caching issues
    // (e.g. 404s for /_next/static/chunks/*). Keep dev predictable by unregistering.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      return;
    }

    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log(
          "Service Worker registered with scope:",
          registration.scope,
        );

        // Clear any active notifications in the system tray
        registration.getNotifications().then((notifications) => {
          notifications.forEach((notification) => notification.close());
        });

        // Clear the app icon badge if supported
        if ("clearAppBadge" in navigator) {
          navigator
            .clearAppBadge()
            .catch((err) => console.error("Failed to clear badge", err));
        }

        // Initialize Pusher Beams
        import("@pusher/push-notifications-web")
          .then(({ Client }) => {
            const beamsClient = new Client({
              instanceId: "9ddc93ef-b40a-4905-adbe-ffad4efce457",
            });

            // Check if permission is already denied to avoid the error
            if (window.Notification && Notification.permission === "denied") {
              console.warn(
                "Pusher Beams: Notifications are blocked. Please enable them in your browser settings.",
              );
              return;
            }

            beamsClient
              .start()
              .then((beamsClient) => {
                // Only add interest if start was successful
                if (beamsClient) {
                  return beamsClient.addDeviceInterest("hello");
                }
              })
              .then(() =>
                console.log(
                  "Successfully registered and subscribed to Pusher Beams!",
                ),
              )
              .catch((error) => {
                // Silently handle common errors
                if (error.name === "NotAllowedError") {
                  // User denied notifications - don't log
                } else if (
                  error.message &&
                  (error.message.includes("Could not add Device Interest") ||
                    error.message.includes("SDK not registered"))
                ) {
                  // SDK not ready - don't log
                } else {
                  console.warn("Pusher Beams:", error.message || error);
                }
              });
          })
          .catch(() => {
            // Library not installed - silent fail
          });
      })
      .catch((error) => {
        if (
          error.name === "NotAllowedError" ||
          error.message.includes("denied")
        ) {
          console.warn(
            "Service Worker registration skipped: Permission denied",
          );
        } else {
          console.error("Service Worker registration failed:", error);
        }
      });
  }, []);

  // Subscribe to the user's specific interest when they are logged in
  useEffect(() => {
    if (session?.user?.id) {
      // --- Pusher Beams (Push Notifications) ---
      // Skip if notifications are blocked
      if (window.Notification && Notification.permission === "denied") {
        // Silently skip - user has denied notifications
      } else {
        import("@pusher/push-notifications-web")
          .then(({ Client }) => {
            const beamsClient = new Client({
              instanceId: "9ddc93ef-b40a-4905-adbe-ffad4efce457",
            });

            beamsClient
              .start()
              .then((client) => {
                if (client) {
                  return client.addDeviceInterest(`user-${session.user.id}`);
                }
              })
              .catch(() => {
                // Silently handle all Beams errors - they're non-critical
              });
          })
          .catch(() => {
            // Library not installed or failed to load - silent fail
          });
      }

      // --- Pusher Channels (Real-time in-app events) ---
      const userChannelName = `user-${session.user.id}`;
      if (!pusherClient) return;

      pusherClient.subscribe(userChannelName);

      const handlePasswordReset = (data) => {
        alert(data.message || "Your password was reset. Please log in again.");
        signOut({ callbackUrl: "/auth/login" });
      };
      pusherClient.bind("password-reset", handlePasswordReset);

      return () => {
        pusherClient.unbind("password-reset", handlePasswordReset);
        pusherClient.unsubscribe(userChannelName);
      };
    }
  }, [session]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Optional: React Query Devtools for easy debugging in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
