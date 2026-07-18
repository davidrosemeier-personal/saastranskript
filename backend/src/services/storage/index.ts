import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const bucket = env.SUPABASE_STORAGE_BUCKET;

export const Storage = {
  async upload(path: string, data: Buffer, contentType: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).upload(path, data, {
      contentType,
      upsert: false,
    });
    if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
  },

  async download(path: string): Promise<Buffer> {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) throw new Error(`Supabase Storage download failed: ${error?.message}`);
    return Buffer.from(await data.arrayBuffer());
  },

  async createSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data) throw new Error(`Supabase Storage signed URL failed: ${error?.message}`);
    return data.signedUrl;
  },

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw new Error(`Supabase Storage delete failed: ${error.message}`);
  },
};
