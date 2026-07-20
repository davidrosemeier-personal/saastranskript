-- Voice-based cross-recording speaker recognition.
-- known_names never worked as a cross-recording mechanism (speaker_label is scoped to a
-- single recording's diarization output) and was never read anywhere — dropped in favor
-- of speaker_voice_profiles, which matches by voice embedding instead of by label.
DROP TABLE IF EXISTS known_names;

CREATE TABLE speaker_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  encrypted_embedding TEXT NOT NULL,
  is_self_profile BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_speaker_voice_profiles_user_id ON speaker_voice_profiles(user_id);
-- At most one self-profile (the account owner's own enrolled voice) per user.
CREATE UNIQUE INDEX idx_speaker_voice_profiles_one_self_per_user
  ON speaker_voice_profiles(user_id) WHERE is_self_profile;

ALTER TABLE transcripts ADD COLUMN speakers_confirmed_at TIMESTAMPTZ;

ALTER TABLE transcript_segments
  ADD COLUMN matched_profile_id UUID REFERENCES speaker_voice_profiles(id) ON DELETE SET NULL,
  ADD COLUMN match_confidence NUMERIC;
