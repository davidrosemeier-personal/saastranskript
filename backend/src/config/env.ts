import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Supabase Postgres connection string)"),

  // Cloudflare R2 (S3-compatible) — scratch space for uploaded audio until transcription
  // completes. Not Supabase Storage: its Free plan hard-caps uploads at 50MB.
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().default("recordings"),

  // Resend — transactional email for password reset links.
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().default(60),

  ADMIN_EMAILS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    ),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  MASTER_ENCRYPTION_KEY: z
    .string()
    .min(1)
    .refine((v) => Buffer.from(v, "base64").length === 32, {
      message: "MASTER_ENCRYPTION_KEY must be a base64-encoded 32-byte key (AES-256)",
    }),

  FRONTEND_URL: z.string().url(),
  BACKEND_PUBLIC_URL: z.string().url(),

  DEFAULT_USAGE_LIMIT_MINUTES: z.coerce.number().default(180),

  // Internal voice-embedding microservice (voice-service/), used for cross-recording
  // speaker recognition. Not exposed to the browser — server-to-server only.
  VOICE_SERVICE_URL: z.string().url(),
  VOICE_SERVICE_SECRET: z.string().min(1),
  VOICE_MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.75),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
