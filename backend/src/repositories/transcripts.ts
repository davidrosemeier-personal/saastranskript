import { pool } from "../db/pool.js";
import type { Transcript } from "../types.js";

export const Transcripts = {
  async forRecording(userId: string, recordingId: string): Promise<Transcript | null> {
    const { rows } = await pool.query<Transcript>(
      "SELECT * FROM transcripts WHERE recording_id = $1 AND user_id = $2",
      [recordingId, userId]
    );
    return rows[0] ?? null;
  },

  async findForUser(userId: string, transcriptId: string): Promise<Transcript | null> {
    const { rows } = await pool.query<Transcript>(
      "SELECT * FROM transcripts WHERE id = $1 AND user_id = $2",
      [transcriptId, userId]
    );
    return rows[0] ?? null;
  },

  /** Used only by webhook handlers, which resolve user_id from the recording, not a session. */
  async createForRecording(userId: string, recordingId: string): Promise<Transcript> {
    const { rows } = await pool.query<Transcript>(
      `INSERT INTO transcripts (recording_id, user_id) VALUES ($1, $2) RETURNING *`,
      [recordingId, userId]
    );
    const row = rows[0];
    if (!row) throw new Error("createForRecording: insert returned no row");
    return row;
  },

  async markSpeakersConfirmed(userId: string, transcriptId: string): Promise<void> {
    await pool.query(
      "UPDATE transcripts SET speakers_confirmed_at = now(), updated_at = now() WHERE id = $1 AND user_id = $2",
      [transcriptId, userId]
    );
  },

  /** Records that the transcript was copied, downloaded as .md, or saved to Drive. */
  async markExported(userId: string, transcriptId: string): Promise<void> {
    await pool.query(
      "UPDATE transcripts SET last_exported_at = now(), updated_at = now() WHERE id = $1 AND user_id = $2",
      [transcriptId, userId]
    );
  },

  /**
   * Returns the speaker_sample_path values that will be orphaned by this delete,
   * so the caller can remove them from Supabase Storage. DB rows cascade automatically.
   */
  async deleteForUser(userId: string, transcriptId: string): Promise<string[]> {
    const { rows } = await pool.query<{ speaker_sample_path: string | null }>(
      `SELECT speaker_sample_path FROM transcript_segments
       WHERE transcript_id = $1 AND user_id = $2 AND speaker_sample_path IS NOT NULL`,
      [transcriptId, userId]
    );
    await pool.query("DELETE FROM transcripts WHERE id = $1 AND user_id = $2", [
      transcriptId,
      userId,
    ]);
    return rows.map((r) => r.speaker_sample_path).filter((p): p is string => p !== null);
  },
};
