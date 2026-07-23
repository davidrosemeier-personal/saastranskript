-- Replaces Google OAuth with classic email/password auth. The Drive integration is
-- removed entirely (was only ever obtained via the Google OAuth login flow), so
-- drive_credentials has no remaining purpose.
DROP TABLE IF EXISTS drive_credentials;

ALTER TABLE users
  DROP COLUMN google_id,
  DROP COLUMN avatar_url,
  ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE users ALTER COLUMN password_hash DROP DEFAULT;

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
