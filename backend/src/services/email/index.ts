import { Resend } from "resend";
import { env } from "../../config/env.js";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: "Reset your password",
    html: `
      <p>Someone requested a password reset for this account.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a></p>
      <p>If you didn't request this, you can safely ignore this email — your password
      won't change unless you click the link above.</p>
      <p>This link expires in ${env.PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes.</p>
    `,
  });
  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}
