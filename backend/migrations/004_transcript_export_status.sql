-- Tracks whether a transcript has ever been exported (copied, downloaded as .md, or
-- saved to Drive), so the UI can distinguish "ready" from "exported" without overloading
-- recordings.status (which represents the transcription pipeline, not user actions).
ALTER TABLE transcripts ADD COLUMN last_exported_at TIMESTAMPTZ;
