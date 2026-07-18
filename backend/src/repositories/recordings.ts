import { pool } from "../db/pool.js";
import type { Recording, RecordingStatus } from "../types.js";

export const Recordings = {
  async forUser(userId: string): Promise<Recording[]> {
    const { rows } = await pool.query<Recording>(
      "SELECT * FROM recordings WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return rows;
  },

  async findForUser(userId: string, recordingId: string): Promise<Recording | null> {
    const { rows } = await pool.query<Recording>(
      "SELECT * FROM recordings WHERE id = $1 AND user_id = $2",
      [recordingId, userId]
    );
    return rows[0] ?? null;
  },

  /** Webhook-only: STT provider callbacks carry no session, so lookup is by id, not user. */
  async findById(recordingId: string): Promise<Recording | null> {
    const { rows } = await pool.query<Recording>("SELECT * FROM recordings WHERE id = $1", [
      recordingId,
    ]);
    return rows[0] ?? null;
  },

  async create(
    userId: string,
    data: { originalFilename: string; storagePath: string; durationSeconds: number }
  ): Promise<Recording> {
    const { rows } = await pool.query<Recording>(
      `INSERT INTO recordings (user_id, original_filename, storage_path, duration_seconds, status)
       VALUES ($1, $2, $3, $4, 'uploaded')
       RETURNING *`,
      [userId, data.originalFilename, data.storagePath, data.durationSeconds]
    );
    const row = rows[0];
    if (!row) throw new Error("Recordings.create: insert returned no row");
    return row;
  },

  async setProviderJob(recordingId: string, provider: string, providerJobId: string): Promise<void> {
    await pool.query(
      `UPDATE recordings SET provider = $2, provider_job_id = $3, status = 'processing', updated_at = now()
       WHERE id = $1`,
      [recordingId, provider, providerJobId]
    );
  },

  async setStatus(recordingId: string, status: RecordingStatus, errorMessage?: string): Promise<void> {
    await pool.query(
      "UPDATE recordings SET status = $2, error_message = $3, updated_at = now() WHERE id = $1",
      [recordingId, status, errorMessage ?? null]
    );
  },

  async clearStoragePath(recordingId: string): Promise<void> {
    await pool.query("UPDATE recordings SET storage_path = NULL, updated_at = now() WHERE id = $1", [
      recordingId,
    ]);
  },

  async deleteForUser(userId: string, recordingId: string): Promise<Recording | null> {
    const { rows } = await pool.query<Recording>(
      "DELETE FROM recordings WHERE id = $1 AND user_id = $2 RETURNING *",
      [recordingId, userId]
    );
    return rows[0] ?? null;
  },
};
