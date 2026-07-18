import { pool } from "../db/pool.js";
import type { KnownName } from "../types.js";

export const KnownNames = {
  async forUser(userId: string): Promise<KnownName[]> {
    const { rows } = await pool.query<KnownName>(
      "SELECT * FROM known_names WHERE user_id = $1 ORDER BY display_name ASC",
      [userId]
    );
    return rows;
  },

  async upsert(userId: string, speakerLabel: string, displayName: string): Promise<KnownName> {
    const { rows } = await pool.query<KnownName>(
      `INSERT INTO known_names (user_id, speaker_label, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, speaker_label) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING *`,
      [userId, speakerLabel, displayName]
    );
    const row = rows[0];
    if (!row) throw new Error("KnownNames.upsert: insert returned no row");
    return row;
  },
};
