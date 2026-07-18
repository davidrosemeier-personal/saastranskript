import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { AuthenticatedUser } from "../../types.js";

export const SESSION_COOKIE_NAME = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function signSession(user: AuthenticatedUser): string {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: SESSION_TTL_SECONDS });
}

export function verifySession(token: string): AuthenticatedUser {
  return jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
}

// Frontend and backend run as separate Railway services on different subdomains, so the
// session cookie is cross-site in production and requires SameSite=None (which itself
// requires Secure). Locally both run on localhost with different ports, which browsers
// treat as same-site, so Lax works there.
export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: (env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: SESSION_TTL_SECONDS * 1000,
  path: "/",
};
