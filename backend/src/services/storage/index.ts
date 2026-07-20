import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env.js";

// Cloudflare R2 speaks the S3 API — region is always "auto", endpoint is account-scoped.
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});
const bucket = env.R2_BUCKET_NAME;

export const Storage = {
  async upload(path: string, data: Buffer, contentType: string): Promise<void> {
    await s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: path, Body: data, ContentType: contentType })
    );
  },

  async download(path: string): Promise<Buffer> {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: path }));
    if (!result.Body) throw new Error(`R2 download failed: empty body for ${path}`);
    return Buffer.from(await result.Body.transformToByteArray());
  },

  async createSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: path }), {
      expiresIn: expiresInSeconds,
    });
  },

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: paths.map((Key) => ({ Key })) },
      })
    );
  },
};
