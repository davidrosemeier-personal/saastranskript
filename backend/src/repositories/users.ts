import { pool } from "../db/pool.js";
import type { User } from "../types.js";

export const Users = {
  async findByGoogleId(googleId: string): Promise<User | null> {
    const { rows } = await pool.query<User>("SELECT * FROM users WHERE google_id = $1", [
      googleId,
    ]);
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query<User>("SELECT * FROM users WHERE id = $1", [id]);
    return rows[0] ?? null;
  },

  async upsertFromGoogle(params: {
    googleId: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    isAdmin: boolean;
    defaultUsageLimitMinutes: number;
  }): Promise<User> {
    const { rows } = await pool.query<User>(
      `INSERT INTO users (google_id, email, display_name, avatar_url, is_admin, usage_limit_minutes)
       VALUES ($1, $2, $3, $4, $5, NULL)
       ON CONFLICT (google_id) DO UPDATE SET
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         avatar_url = EXCLUDED.avatar_url,
         is_admin = EXCLUDED.is_admin,
         updated_at = now()
       RETURNING *`,
      [params.googleId, params.email, params.displayName, params.avatarUrl, params.isAdmin]
    );
    // defaultUsageLimitMinutes is only a fallback used at read time when usage_limit_minutes is NULL
    void params.defaultUsageLimitMinutes;
    const row = rows[0];
    if (!row) throw new Error("upsertFromGoogle: insert returned no row");
    return row;
  },

  // --- Admin-only ---

  async listAll(): Promise<User[]> {
    const { rows } = await pool.query<User>("SELECT * FROM users ORDER BY created_at DESC");
    return rows;
  },

  async setStatus(userId: string, status: "active" | "blocked"): Promise<User> {
    const { rows } = await pool.query<User>(
      "UPDATE users SET status = $2, updated_at = now() WHERE id = $1 RETURNING *",
      [userId, status]
    );
    const row = rows[0];
    if (!row) throw new Error("User not found");
    return row;
  },

  async setUsageLimitOverride(userId: string, minutes: number | null): Promise<User> {
    const { rows } = await pool.query<User>(
      "UPDATE users SET usage_limit_minutes = $2, updated_at = now() WHERE id = $1 RETURNING *",
      [userId, minutes]
    );
    const row = rows[0];
    if (!row) throw new Error("User not found");
    return row;
  },
};
