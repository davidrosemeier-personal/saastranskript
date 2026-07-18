# Meeting Transcription SaaS

Multi-tenant meeting transcription service. See [Briefing Trabscript Tool.md](Briefing%20Trabscript%20Tool.md)
for the product spec and `/Users/davidrosemeier/Downloads/UI-SPEC.md` for the design system.

## Structure

- `backend/` — Express + TypeScript API, deployed as one Railway service.
- `frontend/` — Vite/React + TypeScript SPA, deployed as a second Railway service (static build).

## Local setup

### Backend

```
cd backend
cp .env.example .env   # fill in Supabase, Google OAuth, and secret values
npm install
npm run migrate        # applies migrations/*.sql against DATABASE_URL
npm run dev             # http://localhost:3000
```

Generate `MASTER_ENCRYPTION_KEY` and `JWT_SECRET`:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # MASTER_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"      # JWT_SECRET
```

### Frontend

```
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api and /auth to the backend
```

No `.env` needed locally — `VITE_API_URL` is only required in production, where the
frontend and backend are separate Railway services on different subdomains.

## Google Cloud OAuth setup

Authorized redirect URI must exactly match `GOOGLE_OAUTH_REDIRECT_URI`
(e.g. `https://<backend>.up.railway.app/auth/google/callback`). Required scopes:
`openid email profile https://www.googleapis.com/auth/drive.file`.

## STT providers

Add API keys via the admin UI (Provider API Keys screen) after logging in with an
`ADMIN_EMAILS`-allowlisted account — keys are encrypted at rest, never stored in env vars.
Supported: AssemblyAI, Deepgram, Whisper (OpenAI). Exactly one provider is "active" at a
time; that's the one used for new uploads.

## Deploying to Railway

Two services in one Railway project, each pointed at its subfolder:

- `backend` service: root directory `backend/`, uses `nixpacks.toml` (installs ffmpeg).
- `frontend` service: root directory `frontend/`, uses `nixpacks.toml`, set `VITE_API_URL`
  to the backend service's public URL as a build-time env var.

Set `BACKEND_PUBLIC_URL` on the backend service to its own Railway public URL (used to
build STT provider webhook callback URLs) and `FRONTEND_URL` to the frontend service's URL.
