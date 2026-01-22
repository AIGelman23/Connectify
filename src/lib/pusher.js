import PusherServer from "pusher";

const appId = process.env.PUSHER_APP_ID;
const key = process.env.NEXT_PUBLIC_PUSHER;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

const isConfigured = !!(appId && key && secret && cluster);

if (!isConfigured) {
  console.error("[Pusher Server] Missing env vars:", {
    appId: !!appId,
    key: !!key,
    secret: !!secret,
    cluster: !!cluster,
  });
}

export const pusherServer = isConfigured
  ? new PusherServer({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })
  : null;
