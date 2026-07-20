import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { recordingsRouter } from "./routes/recordings.js";
import { transcriptsRouter } from "./routes/transcripts.js";
import { adminRouter } from "./routes/admin.js";
import { webhooksRouter } from "./routes/webhooks.js";

export const app = express();

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/api/recordings", recordingsRouter);
app.use("/api/transcripts", transcriptsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/webhooks", webhooksRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "File is too large for the current upload limit (50MB)." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
