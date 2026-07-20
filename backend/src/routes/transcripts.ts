import { Router } from "express";
import { requireActiveUser, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { Transcripts } from "../repositories/transcripts.js";
import { TranscriptSegments } from "../repositories/transcriptSegments.js";
import { KnownNames } from "../repositories/knownNames.js";
import { Storage } from "../services/storage/index.js";
import { generateTranscriptMarkdown } from "../services/markdown/index.js";
import { saveTranscriptToDrive, DriveRevokedError } from "../services/drive/index.js";

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
    await KnownNames.upsert(userId, speakerLabel, displayName);
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
