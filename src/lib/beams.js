import PushNotifications from "@pusher/push-notifications-server";

export const beamsClient = new PushNotifications({
  // This is the Instance ID you used in QueryProvider.js
  instanceId:
    process.env.NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID ||
    "9ddc93ef-b40a-4905-adbe-ffad4efce457",
  // Get this from your Pusher Beams Dashboard -> Settings -> API Keys
  secretKey: process.env.PUSHER_BEAMS_SECRET_KEY,
});
