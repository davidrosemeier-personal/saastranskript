import { Router } from "express";
import { env } from "../config/env.js";
import { Users } from "../repositories/users.js";
import { PasswordResetTokens } from "../repositories/passwordResetTokens.js";
import { hashPassword, verifyPassword } from "../services/auth/password.js";
import { sendPasswordResetEmail } from "../services/email/index.js";
import { SESSION_COOKIE_NAME, sessionCookieOptions, signSession } from "../services/oauth/session.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const authRouter = Router();

const MIN_PASSWORD_LENGTH = 8;

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password, displayName } = req.body as {
      email?: string;
      password?: string;
      displayName?: string;
    };
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }
    if (await Users.findByEmail(email)) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const isAdmin = env.ADMIN_EMAILS.includes(email.toLowerCase());
    const passwordHash = await hashPassword(password);
    const user = await Users.create({
      email,
      passwordHash,
      displayName: displayName?.trim() || null,
      isAdmin,
    });

    const sessionToken = signSession({ id: user.id, email: user.email, is_admin: user.is_admin });
    res.cookie(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);
    res.status(201).json({ id: user.id, email: user.email });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const user = await Users.findByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    if (user.status === "blocked") {
      res.status(403).json({ error: "Account blocked" });
      return;
    }

    const sessionToken = signSession({ id: user.id, email: user.email, is_admin: user.is_admin });
    res.cookie(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);
    res.status(204).end();
  })
);

authRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    // Always respond identically whether or not the account exists, to avoid leaking
    // which emails are registered.
    const user = await Users.findByEmail(email);
    if (user) {
      const token = await PasswordResetTokens.create(user.id);
      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }
    res.status(204).end();
  })
);

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    if (!token || !newPassword) {
      res.status(400).json({ error: "token and newPassword are required" });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }

    const record = await PasswordResetTokens.findValidByToken(token);
    if (!record) {
      res.status(400).json({ error: "This reset link is invalid or has expired" });
      return;
    }

    await Users.updatePassword(record.user_id, await hashPassword(newPassword));
    await PasswordResetTokens.markUsed(record.id);
    res.status(204).end();
  })
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  res.status(204).end();
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await Users.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (user.status === "blocked") {
      res.status(403).json({ error: "Account blocked" });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      isAdmin: user.is_admin,
    });
  })
);
