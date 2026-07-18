import { pool } from "../db/pool.js";
import type { DriveCredentials } from "../types.js";

export const DriveCredentialsRepo = {
  async forUser(userId: string): Promise<DriveCredentials | null> {
    const { rows } = await pool.query<DriveCredentials>(
      "SELECT * FROM drive_credentials WHERE user_id = $1",
      [userId]
    );
    return rows[0] ?? null;
  },

  async upsertRefreshToken(userId: string, encryptedRefreshToken: string): Promise<DriveCredentials> {
    const { rows } = await pool.query<DriveCredentials>(
      `INSERT INTO drive_credentials (user_id, encrypted_refresh_token, status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (user_id) DO UPDATE SET
         encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
         status = 'active',
         updated_at = now()
       RETURNING *`,
      [userId, encryptedRefreshToken]
    );
    const row = rows[0];
    if (!row) throw new Error("upsertRefreshToken: insert returned no row");
    return row;
  },

  async setFolderId(userId: string, folderId: string): Promise<void> {
    await pool.query(
      "UPDATE drive_credentials SET drive_folder_id = $2, updated_at = now() WHERE user_id = $1",
      [userId, folderId]
    );
  },

  async markRevoked(userId: string): Promise<void> {
    await pool.query(
      "UPDATE drive_credentials SET status = 'revoked', updated_at = now() WHERE user_id = $1",
      [userId]
    );
  },
};
