import { Router } from "express";
import { Recordings } from "../repositories/recordings.js";
import { Transcripts } from "../repositories/transcripts.js";
import { TranscriptSegments } from "../repositories/transcriptSegments.js";
import { UsageLedger } from "../repositories/usageLedger.js";
import { Storage } from "../services/storage/index.js";
import { getProviderAdapter } from "../services/providers/index.js";
import { getActiveProvider } from "../services/providers/index.js";
import { extractSampleClip } from "../services/ffmpeg/index.js";
import type { ProviderName } from "../types.js";
import path from "node:path";

export const webhooksRouter = Router();

const SUPPORTED_PROVIDERS: ProviderName[] = ["assemblyai", "deepgram", "whisper"];

webhooksRouter.post("/:provider", async (req, res) => {
  const providerParam = req.params.provider;
  const recordingId = typeof req.query.recordingId === "string" ? req.query.recordingId : null;

  if (!SUPPORTED_PROVIDERS.includes(providerParam as ProviderName) || !recordingId) {
    res.status(400).json({ error: "Invalid webhook: unknown provider or missing recordingId" });
    return;
  }
  const providerName = providerParam as ProviderName;

  const recording = await Recordings.findById(recordingId);
  if (!recording) {
    // Ack anyway — nothing to retry, the recording is gone (e.g. user deleted it mid-flight).
    res.status(200).end();
    return;
  }

  try {
    const adapter = getProviderAdapter(providerName);
    // Whisper's key isn't needed to parse its self-posted payload, but AssemblyAI needs its
    // key to re-fetch the full result — reuse whichever key is currently active.
    const { apiKey } = await getActiveProvider().catch(() => ({ apiKey: "" }));
    const result = await adapter.parseWebhook(req.body, apiKey);

    if (result.status === "failed" || result.utterances.length === 0) {
      await Recordings.setStatus(recordingId, "failed", result.errorMessage ?? "Transcription failed");
      res.status(200).end();
      return;
    }

    const transcript = await Transcripts.createForRecording(recording.user_id, recordingId);
    await TranscriptSegments.bulkInsert(
      recording.user_id,
      transcript.id,
      result.utterances.map((u, i) => ({
        speakerLabel: u.speakerLabel,
        text: u.text,
        startMs: u.startMs,
        endMs: u.endMs,
        sortOrder: i,
      }))
    );

    const durationMinutes = (recording.duration_seconds ?? 0) / 60;
    await UsageLedger.record(recording.user_id, recordingId, durationMinutes);

    await extractSpeakerSamples(recording.user_id, recording.id, transcript.id, recording.storage_path);

    if (recording.storage_path) {
      await Storage.remove([recording.storage_path]);
      await Recordings.clearStoragePath(recordingId);
    }
    await Recordings.setStatus(recordingId, "completed");
  } catch (err) {
    console.error(`Webhook processing failed for recording ${recordingId}:`, err);
    await Recordings.setStatus(recordingId, "failed", "Internal processing error");
  }

  res.status(200).end();
});

/** One sample clip per distinct speaker label, extracted before the source audio is deleted. */
async function extractSpeakerSamples(
  userId: string,
  recordingId: string,
  transcriptId: string,
  storagePath: string | null
): Promise<void> {
  if (!storagePath) return;
  const segments = await TranscriptSegments.forTranscript(userId, transcriptId);
  const seenSpeakers = new Set<string>();
  const audioBuffer = await Storage.download(storagePath);
  const extension = path.extname(storagePath) || ".mp3";

  for (const segment of segments) {
    if (seenSpeakers.has(segment.speaker_label)) continue;
    seenSpeakers.add(segment.speaker_label);
    try {
      const clip = await extractSampleClip(audioBuffer, extension, segment.start_ms);
      const clipPath = `${userId}/samples/${recordingId}-${segment.speaker_label.replace(/\s+/g, "_")}.mp3`;
      await Storage.upload(clipPath, clip, "audio/mpeg");
      await TranscriptSegments.setSpeakerSamplePath(userId, segment.id, clipPath);
    } catch (err) {
      console.error(`Failed to extract sample clip for speaker ${segment.speaker_label}:`, err);
    }
  }
}
