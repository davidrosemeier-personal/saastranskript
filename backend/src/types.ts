export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  is_admin: boolean;
  status: "active" | "blocked";
  usage_limit_minutes: number | null;
  cycle_start_at: string;
  created_at: string;
  updated_at: string;
}

export type RecordingStatus = "uploaded" | "processing" | "completed" | "failed";

export interface Recording {
  id: string;
  user_id: string;
  original_filename: string;
  storage_path: string | null;
  duration_seconds: number | null;
  status: RecordingStatus;
  provider: string | null;
  provider_job_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transcript {
  id: string;
  recording_id: string;
  user_id: string;
  speakers_confirmed_at: string | null;
  last_exported_at: string | null;
  created_at: string;
  updated_at: string;
}

/** recordings.status plus the transcript-review facts, for the recordings list badge. */
export interface RecordingWithTranscriptStatus extends Recording {
  speakers_confirmed_at: string | null;
  last_exported_at: string | null;
}

export interface TranscriptSegment {
  id: string;
  transcript_id: string;
  user_id: string;
  speaker_label: string;
  speaker_name: string | null;
  text: string;
  start_ms: number;
  end_ms: number;
  sort_order: number;
  speaker_sample_path: string | null;
  matched_profile_id: string | null;
  match_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface UsageLedgerEntry {
  id: string;
  user_id: string;
  recording_id: string | null;
  minutes_consumed: number;
  created_at: string;
}

export type ProviderName = "assemblyai" | "deepgram" | "whisper";

export interface ProviderCredentials {
  id: string;
  provider: ProviderName;
  encrypted_api_key: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface PlatformSettings {
  default_usage_limit_minutes: number;
  updated_at: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  is_admin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
