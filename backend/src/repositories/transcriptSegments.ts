import { pool } from "../db/pool.js";
import type { TranscriptSegment } from "../types.js";

export const TranscriptSegments = {
  async forTranscript(userId: string, transcriptId: string): Promise<TranscriptSegment[]> {
    const { rows } = await pool.query<TranscriptSegment>(
      `SELECT * FROM transcript_segments WHERE transcript_id = $1 AND user_id = $2
       ORDER BY sort_order ASC`,
      [transcriptId, userId]
    );
    return rows;
  },

  async bulkInsert(
    userId: string,
    transcriptId: string,
    segments: Array<{
      speakerLabel: string;
      text: string;
      startMs: number;
      endMs: number;
      sortOrder: number;
      speakerSamplePath?: string | null;
    }>
  ): Promise<void> {
    if (segments.length === 0) return;
    const values: unknown[] = [];
    const placeholders = segments.map((s, i) => {
      const base = i * 7;
      values.push(
        transcriptId,
        userId,
        s.speakerLabel,
        s.text,
        s.startMs,
        s.endMs,
        s.sortOrder
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
    });
    await pool.query(
      `INSERT INTO transcript_segments
        (transcript_id, user_id, speaker_label, text, start_ms, end_ms, sort_order)
       VALUES ${placeholders.join(", ")}`,
      values
    );
  },

  async updateText(userId: string, segmentId: string, text: string): Promise<void> {
    await pool.query(
      "UPDATE transcript_segments SET text = $3, updated_at = now() WHERE id = $1 AND user_id = $2",
      [segmentId, userId, text]
    );
  },

  /** Renames a speaker across every segment sharing the same speaker_label within a transcript. */
  async renameSpeaker(
    userId: string,
    transcriptId: string,
    speakerLabel: string,
    speakerName: string
  ): Promise<void> {
    await pool.query(
      `UPDATE transcript_segments SET speaker_name = $4, updated_at = now()
       WHERE transcript_id = $1 AND user_id = $2 AND speaker_label = $3`,
      [transcriptId, userId, speakerLabel, speakerName]
    );
  },

  async deleteSegment(userId: string, segmentId: string): Promise<void> {
    await pool.query("DELETE FROM transcript_segments WHERE id = $1 AND user_id = $2", [
      segmentId,
      userId,
    ]);
  },

  async setSpeakerSamplePath(userId: string, segmentId: string, path: string): Promise<void> {
    await pool.query(
      "UPDATE transcript_segments SET speaker_sample_path = $3 WHERE id = $1 AND user_id = $2",
      [segmentId, userId, path]
    );
  },

  /** Replaces the full ordering after a merge/reorder operation. */
  async reorder(userId: string, transcriptId: string, orderedSegmentIds: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < orderedSegmentIds.length; i++) {
        await client.query(
          `UPDATE transcript_segments SET sort_order = $4, updated_at = now()
           WHERE id = $1 AND user_id = $2 AND transcript_id = $3`,
          [orderedSegmentIds[i], userId, transcriptId, i]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  /** Merges `sourceId` into `targetId`: concatenates text, extends end time, deletes source. */
  async merge(userId: string, targetId: string, sourceId: string): Promise<void> {
    const { rows } = await pool.query<TranscriptSegment>(
      "SELECT * FROM transcript_segments WHERE id = ANY($1) AND user_id = $2",
      [[targetId, sourceId], userId]
    );
    const target = rows.find((r) => r.id === targetId);
    const source = rows.find((r) => r.id === sourceId);
    if (!target || !source) throw new Error("merge: segment not found");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE transcript_segments SET text = $3, end_ms = $4, updated_at = now()
         WHERE id = $1 AND user_id = $2`,
        [targetId, userId, `${target.text} ${source.text}`.trim(), Math.max(target.end_ms, source.end_ms)]
      );
      await client.query("DELETE FROM transcript_segments WHERE id = $1 AND user_id = $2", [
        sourceId,
        userId,
      ]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};
