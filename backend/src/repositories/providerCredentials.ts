import { pool } from "../db/pool.js";
import type { ProviderCredentials, ProviderName } from "../types.js";

// Admin-only table: no user_id scoping applies here.
export const ProviderCredentialsRepo = {
  async listAll(): Promise<ProviderCredentials[]> {
    const { rows } = await pool.query<ProviderCredentials>(
      "SELECT * FROM provider_credentials ORDER BY provider ASC"
    );
    return rows;
  },

  async getActive(): Promise<ProviderCredentials | null> {
    const { rows } = await pool.query<ProviderCredentials>(
      "SELECT * FROM provider_credentials WHERE is_active = true LIMIT 1"
    );
    return rows[0] ?? null;
  },

  async upsertKey(provider: ProviderName, encryptedApiKey: string): Promise<ProviderCredentials> {
    const { rows } = await pool.query<ProviderCredentials>(
      `INSERT INTO provider_credentials (provider, encrypted_api_key, is_active)
       VALUES ($1, $2, false)
       ON CONFLICT (provider) DO UPDATE SET encrypted_api_key = EXCLUDED.encrypted_api_key, updated_at = now()
       RETURNING *`,
      [provider, encryptedApiKey]
    );
    const row = rows[0];
    if (!row) throw new Error("upsertKey: insert returned no row");
    return row;
  },

  /** Activates exactly one provider, deactivating all others. */
  async setActive(provider: ProviderName): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE provider_credentials SET is_active = false, updated_at = now()");
      await client.query(
        "UPDATE provider_credentials SET is_active = true, updated_at = now() WHERE provider = $1",
        [provider]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async deactivate(provider: ProviderName): Promise<void> {
    await pool.query(
      "UPDATE provider_credentials SET is_active = false, updated_at = now() WHERE provider = $1",
      [provider]
    );
  },
};
