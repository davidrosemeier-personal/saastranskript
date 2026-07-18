import { google } from "googleapis";
import { env } from "../../config/env.js";

export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
];

export function createOAuthClient() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

export function getConsentUrl(): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_OAUTH_SCOPES,
  });
}

export interface GoogleTokenExchange {
  accessToken: string;
  refreshToken: string | null;
  idTokenPayload: {
    sub: string;
    email: string;
    name: string | null;
    picture: string | null;
  };
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenExchange> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error("Google OAuth: no access_token returned");
  if (!tokens.id_token) throw new Error("Google OAuth: no id_token returned");

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Google OAuth: id_token missing sub/email");
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    idTokenPayload: {
      sub: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      picture: payload.picture ?? null,
    },
  };
}

/** Exchanges an encrypted, stored refresh token for a fresh access token. Throws on invalid_grant. */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) throw new Error("Google OAuth: refresh returned no access_token");
  return credentials.access_token;
}
