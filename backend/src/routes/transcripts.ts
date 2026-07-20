import { Router } from "express";
import { requireActiveUser, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { Transcripts } from "../repositories/transcripts.js";
import { TranscriptSegments } from "../repositories/transcriptSegments.js";
import { SpeakerVoiceProfiles } from "../repositories/speakerVoiceProfiles.js";
import { Storage } from "../services/storage/index.js";
import { generateTranscriptMarkdown } from "../services/markdown/index.js";
import { saveTranscriptToDrive, DriveRevokedError } from "../services/drive/index.js";
import { embedAudioClip } from "../services/voice/index.js";

export const transcriptsRouter = Router();
transcriptsRouter.use(requireAuth, requireActiveUser);

transcriptsRouter.get(
  "/by-recording/:recordingId",
  asyncHandler(async (req, res) => {
    const transcript = await Transcripts.forRecording(req.user!.id, req.params.recordingId!);
    if (!transcript) {
      res.status(404).json({ error: "Transcript not found for this recording" });
      return;
    }
    res.json(transcript);
  })
);

transcriptsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const transcript = await Transcripts.findForUser(userId, req.params.id!);
    if (!transcript) {
      res.status(404).json({ error: "Transcript not found" });
      return;
    }
    const segments = await TranscriptSegments.forTranscript(userId, transcript.id);
    res.json({ transcript, segments });
  })
);

transcriptsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const orphanedPaths = await Transcripts.deleteForUser(userId, req.params.id!);
    await Storage.remove(orphanedPaths);
    res.status(204).end();
  })
);

transcriptsRouter.patch(
  "/:id/segments/:segmentId",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { text } = req.body as { text?: string };
    if (typeof text !== "string") {
      res.status(400).json({ error: "text is required" });
      return;
    }
    await TranscriptSegments.updateText(userId, req.params.segmentId!, text);
    res.status(204).end();
  })
);

transcriptsRouter.delete(
  "/:id/segments/:segmentId",
  asyncHandler(async (req, res) => {
    await TranscriptSegments.deleteSegment(req.user!.id, req.params.segmentId!);
    res.status(204).end();
  })
);

transcriptsRouter.post(
  "/:id/segments/reorder",
  asyncHandler(async (req, res) => {
    const { orderedSegmentIds } = req.body as { orderedSegmentIds?: string[] };
    if (!Array.isArray(orderedSegmentIds)) {
      res.status(400).json({ error: "orderedSegmentIds must be an array" });
      return;
    }
    await TranscriptSegments.reorder(req.user!.id, req.params.id!, orderedSegmentIds);
    res.status(204).end();
  })
);

transcriptsRouter.post(
  "/:id/segments/merge",
  asyncHandler(async (req, res) => {
    const { targetId, sourceId } = req.body as { targetId?: string; sourceId?: string };
    if (!targetId || !sourceId) {
      res.status(400).json({ error: "targetId and sourceId are required" });
      return;
    }
    await TranscriptSegments.merge(req.user!.id, targetId, sourceId);
    res.status(204).end();
  })
);

/** Renames a speaker, cascading to every segment sharing that speaker_label (briefing §9). */
transcriptsRouter.patch(
  "/:id/speakers/:speakerLabel",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { displayName } = req.body as { displayName?: string };
    if (!displayName) {
      res.status(400).json({ error: "displayName is required" });
      return;
    }
    const speakerLabel = decodeURIComponent(req.params.speakerLabel!);
    await TranscriptSegments.renameSpeaker(userId, req.params.id!, speakerLabel, displayName);
    res.status(204).end();
  })
);

/** One row per distinct speaker in this transcript, for the naming-review page. */
transcriptsRouter.get(
  "/:id/speakers",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const transcript = await Transcripts.findForUser(userId, req.params.id!);
    if (!transcript) {
      res.status(404).json({ error: "Transcript not found" });
      return;
    }
    const speakers = await TranscriptSegments.distinctSpeakers(userId, transcript.id);
    const result = await Promise.all(
      speakers.map(async (s) => ({
        speakerLabel: s.speaker_label,
        suggestedName: s.speaker_name,
        sampleUrl: s.speaker_sample_path ? await Storage.createSignedUrl(s.speaker_sample_path) : null,
        matchedProfileId: s.matched_profile_id,
        matchConfidence: s.match_confidence,
      }))
    );
    res.json(result);
  })
);

interface ConfirmSpeakerEntry {
  speakerLabel: string;
  displayName: string;
  remember: boolean;
}

/**
 * Applies reviewed speaker names (cascading per label) and, for any speaker the user
 * opted to remember, upserts a speaker_voice_profiles row so future recordings can
 * auto-suggest this name via voice matching. Finally unblocks the transcript editor.
 */
transcriptsRouter.post(
  "/:id/confirm-speakers",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const transcript = await Transcripts.findForUser(userId, req.params.id!);
    if (!transcript) {
      res.status(404).json({ error: "Transcript not found" });
      return;
    }
    const { speakers } = req.body as { speakers?: ConfirmSpeakerEntry[] };
    if (!Array.isArray(speakers)) {
      res.status(400).json({ error: "speakers must be an array" });
      return;
    }

    const distinctSpeakers = await TranscriptSegments.distinctSpeakers(userId, transcript.id);
    const byLabel = new Map(distinctSpeakers.map((s) => [s.speaker_label, s]));

    for (const entry of speakers) {
      if (!entry.speakerLabel || !entry.displayName) continue;
      await TranscriptSegments.renameSpeaker(userId, transcript.id, entry.speakerLabel, entry.displayName);

      if (!entry.remember) continue;
      const current = byLabel.get(entry.speakerLabel);
      if (!current) continue;

      if (current.matched_profile_id) {
        // Already matched to an existing profile — a "remember" here just means the
        // suggested name was corrected, so update that profile rather than duplicate it.
        await SpeakerVoiceProfiles.update(userId, current.matched_profile_id, {
          displayName: entry.displayName,
        });
      } else if (current.speaker_sample_path) {
        const clip = await Storage.download(current.speaker_sample_path);
        const embedding = await embedAudioClip(clip);
        await SpeakerVoiceProfiles.create(userId, entry.displayName, embedding);
      }
    }

    await Transcripts.markSpeakersConfirmed(userId, transcript.id);
    res.status(204).end();
  })
);

transcriptsRouter.get(
  "/:id/markdown",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const transcript = await Transcripts.findForUser(userId, req.params.id!);
    if (!transcript) {
      res.status(404).json({ error: "Transcript not found" });
      return;
    }
    const segments = await TranscriptSegments.forTranscript(userId, transcript.id);
    res.type("text/markdown").send(generateTranscriptMarkdown(segments));
  })
);

transcriptsRouter.post(
  "/:id/save-to-drive",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const transcript = await Transcripts.findForUser(userId, req.params.id!);
    if (!transcript) {
      res.status(404).json({ error: "Transcript not found" });
      return;
    }
    const segments = await TranscriptSegments.forTranscript(userId, transcript.id);
    const markdown = generateTranscriptMarkdown(segments);

    try {
      await saveTranscriptToDrive(userId, `Transcript ${transcript.id}.md`, markdown);
      res.status(204).end();
    } catch (err) {
      if (err instanceof DriveRevokedError) {
        res.status(409).json({ error: "drive_revoked", message: "Reconnect Google Drive to continue" });
        return;
      }
      throw err;
    }
  })
);
