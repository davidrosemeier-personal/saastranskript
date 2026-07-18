import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE_NAME, verifySession } from "../services/oauth/session.js";
import { Users } from "../repositories/users.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    req.user = verifySession(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

/** Blocks a user mid-session even though their JWT is still valid (admin can block anytime). */
export async function requireActiveUser(req: Request, res: Response, next: NextFunction) {
  const user = await Users.findById(req.user!.id);
  if (!user || user.status === "blocked") {
    res.status(403).json({ error: "Account blocked or not found" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.is_admin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
