import multer from "multer";

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500MB — briefing §3: must override Node/Multer defaults

export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});
