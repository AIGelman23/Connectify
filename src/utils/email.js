import nodemailer from "nodemailer";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Create AWS SES client for production
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

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
 * Send email using AWS SES
 * @param {object} params - Email parameters
 * @returns {Promise} - SES send result
 */
const sendEmailViaSES = async ({ to, subject, html, text }) => {
  const fromEmail = process.env.EMAIL_FROM || "noreply@connectifai.com";

  const command = new SendEmailCommand({
    Source: `ConnectifAI <${fromEmail}>`,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: html,
          Charset: "UTF-8",
        },
        Text: {
          Data: text,
          Charset: "UTF-8",
        },
      },
    },
  });

  return sesClient.send(command);
};

/**
 * Send a password reset verification code email
 * @param {string} to - Recipient email
 * @param {string} code - 6-digit verification code
 * @param {string} name - User's name
 * @returns {Promise} - Email send result
 */
export const sendPasswordResetCodeEmail = async (to, code, name) => {
  const subject = "Your Password Reset Code - ConnectifAI";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a56db; margin-bottom: 24px;">Reset Your Password</h2>
      <p style="color: #374151; font-size: 16px;">Hi ${name || "there"},</p>
      <p style="color: #374151; font-size: 16px;">We received a request to reset your password. Use this verification code:</p>

      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 32px; text-align: center; margin: 32px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #1a56db; font-family: 'Courier New', monospace;">
          ${code}
        </span>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        This code will expire in <strong>10 minutes</strong>.
      </p>

      <p style="color: #6b7280; font-size: 14px;">
        If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated message from ConnectifAI. Please do not reply to this email.
      </p>
    </div>
  `;
  const text = `Your password reset code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, you can safely ignore this email.`;

  try {
    // In development, log to console
    if (process.env.NODE_ENV === "development") {
      console.log("=".repeat(50));
      console.log("PASSWORD RESET CODE EMAIL");
      console.log("=".repeat(50));
      console.log(`To: ${to}`);
      console.log(`Code: ${code}`);
      console.log("=".repeat(50));
      return { success: true, messageId: "dev-message-id" };
    }

    // In production, use AWS SES if configured, otherwise fallback to SMTP
    if (process.env.AWS_ACCESS_KEY_ID) {
      const result = await sendEmailViaSES({ to, subject, html, text });
      console.log("Password reset code email sent via SES:", result.MessageId);
      return { success: true, messageId: result.MessageId };
    } else {
      const info = await transporter.sendMail({
        from: `"ConnectifAI" <${process.env.EMAIL_FROM || "noreply@connectifai.com"}>`,
        to,
        subject,
        html,
        text,
      });
      console.log("Password reset code email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    }
  } catch (error) {
    console.error("Error sending password reset code email:", error);
    throw error;
  }
};

/**
 * Send a password reset email (legacy - for backwards compatibility)
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
