import { google } from "googleapis";
import { createOAuthClient } from "../oauth/google.js";
import { DriveCredentialsRepo } from "../../repositories/driveCredentials.js";
import { decrypt } from "../crypto/index.js";

const DRIVE_FOLDER_NAME = "Meeting Transcripts";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

export class DriveRevokedError extends Error {
  constructor() {
    super("Google Drive access was revoked by the user");
    this.name = "DriveRevokedError";
  }
}

async function getDriveClient(userId: string) {
  const creds = await DriveCredentialsRepo.forUser(userId);
  if (!creds || creds.status === "revoked") throw new DriveRevokedError();

  const oauth = createOAuthClient();
  oauth.setCredentials({ refresh_token: decrypt(creds.encrypted_refresh_token) });
  return { drive: google.drive({ version: "v3", auth: oauth }), creds };
}

async function ensureFolder(
  drive: ReturnType<typeof google.drive>,
  userId: string,
  existingFolderId: string | null
): Promise<string> {
  if (existingFolderId) {
    try {
      await drive.files.get({ fileId: existingFolderId, fields: "id" });
      return existingFolderId;
    } catch (err: unknown) {
      const status = (err as { code?: number; status?: number })?.code ?? (err as { status?: number })?.status;
      if (status !== 404) throw err;
      // Folder was deleted by the user — fall through and create a new one.
    }
  }

  const created = await drive.files.create({
    requestBody: { name: DRIVE_FOLDER_NAME, mimeType: DRIVE_FOLDER_MIME },
    fields: "id",
  });
  const folderId = created.data.id;
  if (!folderId) throw new Error("Drive folder creation returned no id");
  await DriveCredentialsRepo.setFolderId(userId, folderId);
  return folderId;
}

/** Uploads a Markdown transcript to the user's app-owned Drive folder, creating it if needed. */
export async function saveTranscriptToDrive(
  userId: string,
  filename: string,
  markdown: string
): Promise<void> {
  try {
    const { drive, creds } = await getDriveClient(userId);
    const folderId = await ensureFolder(drive, userId, creds.drive_folder_id);

    await drive.files.create({
      requestBody: { name: filename, parents: [folderId] },
      media: { mimeType: "text/markdown", body: markdown },
    });
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message ?? "";
    const status = (err as { code?: number; status?: number })?.code ?? (err as { status?: number })?.status;
    if (message.includes("invalid_grant") || status === 401 || status === 403) {
      await DriveCredentialsRepo.markRevoked(userId);
      throw new DriveRevokedError();
    }
    throw err;
  }
}
