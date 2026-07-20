import { Router } from "express";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireActiveUser, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { uploadAudio } from "../middleware/upload.js";
import { Recordings } from "../repositories/recordings.js";
import { Transcripts } from "../repositories/transcripts.js";
import { UsageService, UsageLimitExceededError } from "../services/usage/index.js";
import { Storage } from "../services/storage/index.js";
import { probeDurationSeconds } from "../services/ffmpeg/index.js";
import { getActiveProvider } from "../services/providers/index.js";
import { env } from "../config/env.js";

export const recordingsRouter = Router();
recordingsRouter.use(requireAuth, requireActiveUser);

recordingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const recordings = await Recordings.forUser(req.user!.id);
    res.json(recordings);
  })
);

recordingsRouter.get(
  "/usage",
  asyncHandler(async (req, res) => {
    const status = await UsageService.getStatus(req.user!.id);
    res.json(status);
  })
);

recordingsRouter.post(
  "/",
  uploadAudio.single("audio"),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No audio file provided (field name: audio)" });
      return;
    }

    const extension = path.extname(file.originalname) || ".mp3";
    let durationSeconds: number;
    try {
      durationSeconds = await probeDurationSeconds(file.buffer, extension);
    } catch (err) {
      console.error("Duration probe failed:", err);
      res.status(400).json({ error: "Could not read audio file duration" });
      return;
    }
    const durationMinutes = durationSeconds / 60;

    try {
      await UsageService.assertWithinLimit(userId, durationMinutes);
    } catch (err) {
      if (err instanceof UsageLimitExceededError) {
        res.status(402).json({ error: "Usage limit exceeded for current billing cycle", status: err.status });
        return;
      }
      throw err;
    }

    const storagePath = `${userId}/${randomUUID()}${extension}`;
    try {
      await Storage.upload(storagePath, file.buffer, file.mimetype || "audio/mpeg");
    } catch (err) {
      console.error("Storage upload failed:", err);
      res.status(502).json({ error: "Failed to store the uploaded file. Please try again." });
      return;
    }

    const recording = await Recordings.create(userId, {
      originalFilename: file.originalname,
      storagePath,
      durationSeconds,
    });

    try {
      const { provider, apiKey, name } = await getActiveProvider();
      const audioUrl = await Storage.createSignedUrl(storagePath, 3600);

      const { providerJobId } = await provider.submit({
        audioUrl,
        webhookUrl: buildWebhookUrl(name, recording.id),
        apiKey,
      });
      await Recordings.setProviderJob(recording.id, name, providerJobId);
    } catch (err) {
      console.error("Failed to submit recording to transcription provider:", err);
      await Recordings.setStatus(recording.id, "failed", "Failed to submit for transcription");
    }

    res.status(201).json(await Recordings.findForUser(userId, recording.id));
  })
);

function buildWebhookUrl(provider: string, recordingId: string): string {
  return `${env.BACKEND_PUBLIC_URL}/api/webhooks/${provider}?recordingId=${recordingId}`;
}

recordingsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const recording = await Recordings.findForUser(req.user!.id, req.params.id!);
    if (!recording) {
      res.status(404).json({ error: "Recording not found" });
      return;
    }
    res.json(recording);
  })
);

recordingsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const transcript = await Transcripts.forRecording(userId, req.params.id!);
    if (transcript) {
      const orphanedPaths = await Transcripts.deleteForUser(userId, transcript.id);
      await Storage.remove(orphanedPaths);
    }
    const recording = await Recordings.deleteForUser(userId, req.params.id!);
    if (!recording) {
      res.status(404).json({ error: "Recording not found" });
      return;
    }
    if (recording.storage_path) {
      await Storage.remove([recording.storage_path]);
    }
    res.status(204).end();
  })
);
