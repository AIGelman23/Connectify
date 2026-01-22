import PusherClient from "pusher-js";

// Enable pusher logging for debugging
PusherClient.logToConsole = process.env.NODE_ENV === "development";

const pusherKey = process.env.NEXT_PUBLIC_PUSHER;
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

const isConfigured =
  !!pusherKey &&
  !!pusherCluster &&
  !pusherKey.includes("your-public-key") &&
  !pusherCluster.includes("your-cluster");

// Log configuration status
console.log("[Pusher] Configured:", isConfigured, "Key:", pusherKey ? "set" : "missing", "Cluster:", pusherCluster || "missing");

// IMPORTANT:
// Do not throw during import. This file is imported by global providers; throwing here
// can crash unrelated features (including messenger) when Pusher isn't configured.
export const pusherClient = isConfigured
  ? new PusherClient(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: "/api/pusher/auth",
    })
  : null;

if (!isConfigured) {
  console.warn(
    "[Pusher] Not configured. Real-time events disabled. Check NEXT_PUBLIC_PUSHER and NEXT_PUBLIC_PUSHER_CLUSTER env vars."
  );
}
