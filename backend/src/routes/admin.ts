import { Router } from "express";
import { requireActiveUser, requireAdmin, requireAuth } from "../middleware/auth.js";
import { Users } from "../repositories/users.js";
import { UsageLedger } from "../repositories/usageLedger.js";
import { ProviderCredentialsRepo } from "../repositories/providerCredentials.js";
import { PlatformSettingsRepo } from "../repositories/platformSettings.js";
import { UsageService } from "../services/usage/index.js";
import { encrypt } from "../services/crypto/index.js";
import type { ProviderName } from "../types.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireActiveUser, requireAdmin);

const VALID_PROVIDERS: ProviderName[] = ["assemblyai", "deepgram", "whisper"];

adminRouter.get("/users", async (_req, res) => {
  const users = await Users.listAll();
  const statuses = await Promise.all(users.map((u) => UsageService.getStatus(u.id)));
  res.json(
    users.map((u, i) => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      status: u.status,
      isAdmin: u.is_admin,
      usageLimitMinutes: u.usage_limit_minutes,
      createdAt: u.created_at,
      usage: statuses[i],
    }))
  );
});

adminRouter.post("/users/:id/block", async (req, res) => {
  const user = await Users.setStatus(req.params.id, "blocked");
  res.json(user);
});

adminRouter.post("/users/:id/unblock", async (req, res) => {
  const user = await Users.setStatus(req.params.id, "active");
  res.json(user);
});

adminRouter.patch("/users/:id/usage-limit", async (req, res) => {
  const { minutes } = req.body as { minutes?: number | null };
  if (minutes !== null && (typeof minutes !== "number" || minutes < 0)) {
    res.status(400).json({ error: "minutes must be a non-negative number or null" });
    return;
  }
  const user = await Users.setUsageLimitOverride(req.params.id, minutes ?? null);
  res.json(user);
});

adminRouter.get("/usage-overview", async (_req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const totals = await UsageLedger.globalTotalsSince(since);
  res.json(totals);
});

adminRouter.get("/providers", async (_req, res) => {
  const providers = await ProviderCredentialsRepo.listAll();
  res.json(
    providers.map((p) => ({
      provider: p.provider,
      isActive: p.is_active,
      hasKey: p.encrypted_api_key !== null,
      updatedAt: p.updated_at,
    }))
  );
});

adminRouter.put("/providers/:provider/key", async (req, res) => {
  const provider = req.params.provider as ProviderName;
  if (!VALID_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: "Unknown provider" });
    return;
  }
  const { apiKey } = req.body as { apiKey?: string };
  if (!apiKey) {
    res.status(400).json({ error: "apiKey is required" });
    return;
  }
  await ProviderCredentialsRepo.upsertKey(provider, encrypt(apiKey));
  res.status(204).end();
});

adminRouter.post("/providers/:provider/activate", async (req, res) => {
  const provider = req.params.provider as ProviderName;
  if (!VALID_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: "Unknown provider" });
    return;
  }
  await ProviderCredentialsRepo.setActive(provider);
  res.status(204).end();
});

adminRouter.post("/providers/:provider/deactivate", async (req, res) => {
  const provider = req.params.provider as ProviderName;
  if (!VALID_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: "Unknown provider" });
    return;
  }
  await ProviderCredentialsRepo.deactivate(provider);
  res.status(204).end();
});

adminRouter.get("/settings", async (_req, res) => {
  res.json(await PlatformSettingsRepo.get());
});

adminRouter.put("/settings", async (req, res) => {
  const { defaultUsageLimitMinutes } = req.body as { defaultUsageLimitMinutes?: number };
  if (typeof defaultUsageLimitMinutes !== "number" || defaultUsageLimitMinutes < 0) {
    res.status(400).json({ error: "defaultUsageLimitMinutes must be a non-negative number" });
    return;
  }
  res.json(await PlatformSettingsRepo.update(defaultUsageLimitMinutes));
});
