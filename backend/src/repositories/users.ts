import { pool } from "../db/pool.js";
import type { User } from "../types.js";

export const Users = {
  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query<User>("SELECT * FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query<User>("SELECT * FROM users WHERE id = $1", [id]);
    return rows[0] ?? null;
  },

  async create(params: {
    email: string;
    passwordHash: string;
    displayName: string | null;
    isAdmin: boolean;
  }): Promise<User> {
    const { rows } = await pool.query<User>(
      `INSERT INTO users (email, password_hash, display_name, is_admin)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [params.email.toLowerCase(), params.passwordHash, params.displayName, params.isAdmin]
    );
    const row = rows[0];
    if (!row) throw new Error("Users.create: insert returned no row");
    return row;
  },

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await pool.query("UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1", [
      userId,
      passwordHash,
    ]);
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
