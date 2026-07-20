import { Router } from "express";
import { env } from "../config/env.js";
import { Users } from "../repositories/users.js";
import { DriveCredentialsRepo } from "../repositories/driveCredentials.js";
import { PlatformSettingsRepo } from "../repositories/platformSettings.js";
import { encrypt } from "../services/crypto/index.js";
import { exchangeCodeForTokens, getConsentUrl } from "../services/oauth/google.js";
import { SESSION_COOKIE_NAME, sessionCookieOptions, signSession } from "../services/oauth/session.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const authRouter = Router();

authRouter.get("/google/start", (_req, res) => {
  res.redirect(getConsentUrl());
});

authRouter.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    if (!code) {
      res.status(400).send("Missing authorization code");
      return;
    }

    try {
      const { refreshToken, idTokenPayload } = await exchangeCodeForTokens(code);
      const isAdmin = env.ADMIN_EMAILS.includes(idTokenPayload.email.toLowerCase());
      const settings = await PlatformSettingsRepo.get();

      const user = await Users.upsertFromGoogle({
        googleId: idTokenPayload.sub,
        email: idTokenPayload.email,
        displayName: idTokenPayload.name,
        avatarUrl: idTokenPayload.picture,
        isAdmin,
        defaultUsageLimitMinutes: settings.default_usage_limit_minutes,
      });

      if (refreshToken) {
        await DriveCredentialsRepo.upsertRefreshToken(user.id, encrypt(refreshToken));
      }
      // If Google omits refresh_token (already consented before), any existing stored
      // token is left untouched — access_type=offline + prompt=consent should prevent this.

      const sessionToken = signSession({ id: user.id, email: user.email, is_admin: user.is_admin });
      res.cookie(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);
      res.redirect(env.FRONTEND_URL);
    } catch (err) {
      console.error("Google OAuth callback failed:", err);
      res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
    }
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
      avatarUrl: user.avatar_url,
      isAdmin: user.is_admin,
    });
  })
);
