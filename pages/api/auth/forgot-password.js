import { getUserByEmail, createResetToken, sendResetEmail } from "@/lib/auth";
import rateLimit from "@/lib/rateLimit";

const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500, // adjust based on your needs
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Rate limit handling
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const rateLimitResult = await limiter.check(
    res,
    10,
    "CACHE_KEY_AUTH_FORGOT_PASSWORD",
    ip
  );

  if (rateLimitResult) {
    return res
      .status(429)
      .json({ message: "Too many requests, please try again later." });
  }

  // Parse body
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Check if user exists
    const user = await getUserByEmail(email);

    if (!user) {
      // Do not reveal if the email is registered or not for security reasons
      return res
        .status(200)
        .json({ message: "If your email exists, a reset link was sent." });
    }

    // Create reset token
    const token = await createResetToken(user.id);

    // Send reset email
    await sendResetEmail(user.email, token);

    return res
      .status(200)
      .json({ message: "If your email exists, a reset link was sent." });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}
