import nodemailer from "nodemailer";

// Create a transporter based on environment
let transporter;

// In development, use a test account from Ethereal
if (process.env.NODE_ENV === "development") {
  // You could create a test account automatically with:
  // const testAccount = await nodemailer.createTestAccount();
  // But for now, we'll just log the reset link
  transporter = {
    sendMail: async (mailOptions) => {
      console.log(
        "Email would be sent with the following options:",
        mailOptions
      );
      return { messageId: "test-message-id" };
    },
  };
} else {
  // In production, use your actual email provider
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.example.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

/**
 * Send a password reset email
 * @param {string} to - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} name - User's name
 * @returns {Promise} - Email send result
 */
export const sendPasswordResetEmail = async (to, resetToken, name) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

  try {
    const info = await transporter.sendMail({
      from: `"ConnectifAI" <${
        process.env.EMAIL_FROM || "noreply@connectifai.com"
      }>`,
      to,
      subject: "Reset Your Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Hi ${name || "there"},</p>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p>If you didn't request this, you can safely ignore this email. The link will expire in 30 minutes.</p>
          <p>Thanks,<br>The ConnectifAI Team</p>
        </div>
      `,
    });

    console.log("Password reset email sent:", info.messageId);
    return { success: true, resetUrl };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
