import multer from "multer";

// Briefing §3 specifies 500MB, but Supabase's Free plan hard-caps Storage uploads at 50MB
// (Pro plan allows up to 500GB, configurable). Raise this back to 500MB after upgrading.
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB — matches current Supabase Storage plan limit

export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});
