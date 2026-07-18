import { pool } from "../db/pool.js";

export const UsageLedger = {
  /** Sum of minutes consumed since `since` (the current rolling-cycle anchor). */
  async minutesConsumedSince(userId: string, since: Date): Promise<number> {
    const { rows } = await pool.query<{ total: string | null }>(
      `SELECT COALESCE(SUM(minutes_consumed), 0) AS total
       FROM usage_ledger WHERE user_id = $1 AND created_at >= $2`,
      [userId, since]
    );
    return Number(rows[0]?.total ?? 0);
  },

  async record(userId: string, recordingId: string, minutesConsumed: number): Promise<void> {
    await pool.query(
      "INSERT INTO usage_ledger (user_id, recording_id, minutes_consumed) VALUES ($1, $2, $3)",
      [userId, recordingId, minutesConsumed]
    );
  },

  // --- Admin-only ---

  async globalTotalsSince(since: Date): Promise<Array<{ user_id: string; total_minutes: number }>> {
    const { rows } = await pool.query<{ user_id: string; total_minutes: string }>(
      `SELECT user_id, COALESCE(SUM(minutes_consumed), 0) AS total_minutes
       FROM usage_ledger WHERE created_at >= $1 GROUP BY user_id`,
      [since]
    );
    return rows.map((r) => ({ user_id: r.user_id, total_minutes: Number(r.total_minutes) }));
  },
};
