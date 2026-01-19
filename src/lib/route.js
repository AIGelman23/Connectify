import { NextResponse } from "next/server";
import { beamsClient } from "@/lib/beams";

export async function POST() {
  try {
    const publishResponse = await beamsClient.publishToInterests(["hello"], {
      web: {
        notification: {
          title: "Hello from Connectify!",
          body: "This is a test notification sent from the server to the 'hello' interest.",
          deep_link: "http://localhost:3000", // Where clicking the notification takes the user
        },
      },
    });

    return NextResponse.json({
      success: true,
      publishId: publishResponse.publishId,
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
