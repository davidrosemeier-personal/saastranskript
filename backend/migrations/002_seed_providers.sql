-- Seeds one row per supported STT provider so the admin UI has something to render
-- and configure; encrypted_api_key stays NULL until an admin sets a key via the app.
INSERT INTO provider_credentials (provider, encrypted_api_key, is_active)
VALUES
  ('assemblyai', NULL, false),
  ('deepgram', NULL, false),
  ('whisper', NULL, false)
ON CONFLICT (provider) DO NOTHING;
