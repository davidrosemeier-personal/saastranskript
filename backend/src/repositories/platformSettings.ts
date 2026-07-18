import { pool } from "../db/pool.js";
import type { PlatformSettings } from "../types.js";

// Admin-managed singleton row.
export const PlatformSettingsRepo = {
  async get(): Promise<PlatformSettings> {
    const { rows } = await pool.query<PlatformSettings>(
      "SELECT default_usage_limit_minutes, updated_at FROM platform_settings WHERE id = true"
    );
    const row = rows[0];
    if (!row) throw new Error("platform_settings singleton row is missing");
    return row;
  },

  async update(defaultUsageLimitMinutes: number): Promise<PlatformSettings> {
    const { rows } = await pool.query<PlatformSettings>(
      `UPDATE platform_settings SET default_usage_limit_minutes = $1, updated_at = now()
       WHERE id = true RETURNING default_usage_limit_minutes, updated_at`,
      [defaultUsageLimitMinutes]
    );
    const row = rows[0];
    if (!row) throw new Error("platform_settings singleton row is missing");
    return row;
  },
};
