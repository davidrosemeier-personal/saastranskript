import { pool } from "../db/pool.js";
import { encrypt, decrypt } from "../services/crypto/index.js";

export interface SpeakerVoiceProfile {
  id: string;
  user_id: string;
  display_name: string;
  is_self_profile: boolean;
  created_at: string;
  updated_at: string;
}

interface SpeakerVoiceProfileRow extends SpeakerVoiceProfile {
  encrypted_embedding: string;
}

export interface SpeakerVoiceProfileWithEmbedding extends SpeakerVoiceProfile {
  embedding: number[];
}

function decode(row: SpeakerVoiceProfileRow): SpeakerVoiceProfileWithEmbedding {
  const { encrypted_embedding, ...rest } = row;
  return { ...rest, embedding: JSON.parse(decrypt(encrypted_embedding)) as number[] };
}

export const SpeakerVoiceProfiles = {
  async forUser(userId: string): Promise<SpeakerVoiceProfileWithEmbedding[]> {
    const { rows } = await pool.query<SpeakerVoiceProfileRow>(
      "SELECT * FROM speaker_voice_profiles WHERE user_id = $1",
      [userId]
    );
    return rows.map(decode);
  },

  async findForUser(userId: string, id: string): Promise<SpeakerVoiceProfileWithEmbedding | null> {
    const { rows } = await pool.query<SpeakerVoiceProfileRow>(
      "SELECT * FROM speaker_voice_profiles WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    const row = rows[0];
    return row ? decode(row) : null;
  },

  async findSelfProfile(userId: string): Promise<SpeakerVoiceProfile | null> {
    const { rows } = await pool.query<SpeakerVoiceProfileRow>(
      "SELECT * FROM speaker_voice_profiles WHERE user_id = $1 AND is_self_profile = true",
      [userId]
    );
    const row = rows[0];
    return row ? decode(row) : null;
  },

  async create(
    userId: string,
    displayName: string,
    embedding: number[],
    isSelfProfile = false
  ): Promise<SpeakerVoiceProfile> {
    const { rows } = await pool.query<SpeakerVoiceProfileRow>(
      `INSERT INTO speaker_voice_profiles (user_id, display_name, encrypted_embedding, is_self_profile)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, displayName, encrypt(JSON.stringify(embedding)), isSelfProfile]
    );
    const row = rows[0];
    if (!row) throw new Error("SpeakerVoiceProfiles.create: insert returned no row");
    const { encrypted_embedding: _omit, ...rest } = row;
    return rest;
  },

  /** Updates name and/or embedding on an existing profile owned by this user. */
  async update(
    userId: string,
    id: string,
    fields: { displayName?: string; embedding?: number[] }
  ): Promise<void> {
    if (fields.displayName !== undefined) {
      await pool.query(
        "UPDATE speaker_voice_profiles SET display_name = $3, updated_at = now() WHERE id = $1 AND user_id = $2",
        [id, userId, fields.displayName]
      );
    }
    if (fields.embedding !== undefined) {
      await pool.query(
        "UPDATE speaker_voice_profiles SET encrypted_embedding = $3, updated_at = now() WHERE id = $1 AND user_id = $2",
        [id, userId, encrypt(JSON.stringify(fields.embedding))]
      );
    }
  },

  /** Replaces the account owner's self-profile (deletes any prior one first). */
  async upsertSelfProfile(userId: string, displayName: string, embedding: number[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "DELETE FROM speaker_voice_profiles WHERE user_id = $1 AND is_self_profile = true",
        [userId]
      );
      await client.query(
        `INSERT INTO speaker_voice_profiles (user_id, display_name, encrypted_embedding, is_self_profile)
         VALUES ($1, $2, $3, true)`,
        [userId, displayName, encrypt(JSON.stringify(embedding))]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async deleteSelfProfile(userId: string): Promise<void> {
    await pool.query(
      "DELETE FROM speaker_voice_profiles WHERE user_id = $1 AND is_self_profile = true",
      [userId]
    );
  },
};
