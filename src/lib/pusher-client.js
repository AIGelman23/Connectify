import PusherClient from "pusher-js";

// Enable pusher logging - don't include this in production
if (process.env.NODE_ENV === "development") {
  PusherClient.logToConsole = true;
}

const pusherKey = process.env.NEXT_PUBLIC_PUSHER;
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

const isConfigured =
  !!pusherKey &&
  !!pusherCluster &&
  !pusherKey.includes("your-public-key") &&
  !pusherCluster.includes("your-cluster");

// IMPORTANT:
// Do not throw during import. This file is imported by global providers; throwing here
// can crash unrelated features (including messenger) when Pusher isn't configured.
export const pusherClient = isConfigured
  ? new PusherClient(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: "/api/pusher/auth",
    })
  : null;

if (!isConfigured && process.env.NODE_ENV === "development") {
  console.warn(
    "Pusher is not configured (NEXT_PUBLIC_PUSHER / NEXT_PUBLIC_PUSHER_CLUSTER). " +
      "Real-time Pusher Channels events will be disabled."
  );
}
