import { createHash, randomBytes } from "node:crypto";
import { pool } from "../db/pool.js";
import { env } from "../config/env.js";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const PasswordResetTokens = {
  /** Returns the raw token (only ever returned here — the DB stores just its hash). */
  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [userId, hashToken(token), expiresAt]
    );
    return token;
  },

  async findValidByToken(token: string): Promise<{ id: string; user_id: string } | null> {
    const { rows } = await pool.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
      [hashToken(token)]
    );
    return rows[0] ?? null;
  },

  async markUsed(id: string): Promise<void> {
    await pool.query("UPDATE password_reset_tokens SET used_at = now() WHERE id = $1", [id]);
  },
};
