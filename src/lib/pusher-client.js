import PusherClient from "pusher-js";

// Enable pusher logging - don't include this in production
if (process.env.NODE_ENV === "development") {
  PusherClient.logToConsole = true;
}

const pusherKey = process.env.NEXT_PUBLIC_PUSHER;
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

if (
  !pusherKey ||
  !pusherCluster ||
  pusherKey.includes("your-public-key") ||
  pusherCluster.includes("your-cluster")
) {
  throw new Error(
    "Pusher environment variables NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER are not set correctly. " +
      "Please check your .env file and ensure you have replaced the placeholder values."
  );
}

export const pusherClient = new PusherClient(pusherKey, {
  cluster: pusherCluster,
  authEndpoint: "/api/pusher/auth",
});
