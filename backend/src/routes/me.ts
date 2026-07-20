import { Router } from "express";
import { requireActiveUser, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { uploadAudio } from "../middleware/upload.js";
import { SpeakerVoiceProfiles } from "../repositories/speakerVoiceProfiles.js";
import { Users } from "../repositories/users.js";
import { embedAudioClip } from "../services/voice/index.js";

export const meRouter = Router();
meRouter.use(requireAuth, requireActiveUser);

meRouter.get(
  "/voice-profile",
  asyncHandler(async (req, res) => {
    const profile = await SpeakerVoiceProfiles.findSelfProfile(req.user!.id);
    res.json(
      profile
        ? { enrolled: true, displayName: profile.display_name, updatedAt: profile.updated_at }
        : { enrolled: false }
    );
  })
);

meRouter.post(
  "/voice-profile",
  uploadAudio.single("audio"),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No audio file provided (field name: audio)" });
      return;
    }
    const user = await Users.findById(userId);
    const displayName = user?.display_name ?? user?.email ?? "Me";

    const embedding = await embedAudioClip(file.buffer, file.originalname);
    await SpeakerVoiceProfiles.upsertSelfProfile(userId, displayName, embedding);
    res.status(204).end();
  })
);

meRouter.delete(
  "/voice-profile",
  asyncHandler(async (req, res) => {
    await SpeakerVoiceProfiles.deleteSelfProfile(req.user!.id);
    res.status(204).end();
  })
);
