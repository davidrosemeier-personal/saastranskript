import { env } from "../../config/env.js";

/** Calls the internal voice-service to compute a 192-dim speaker embedding for a clip. */
export async function embedAudioClip(audioBuffer: Buffer, filename = "clip.mp3"): Promise<number[]> {
  const form = new FormData();
  form.append("file", new Blob([audioBuffer]), filename);

  const res = await fetch(`${env.VOICE_SERVICE_URL}/embed`, {
    method: "POST",
    headers: { "x-internal-secret": env.VOICE_SERVICE_SECRET },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Voice service embed failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Embedding dimension mismatch");
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Returns the best-matching profile (if any) above the configured similarity threshold. */
export function findBestMatch<T extends { embedding: number[] }>(
  queryEmbedding: number[],
  candidates: T[]
): { candidate: T; similarity: number } | null {
  let best: { candidate: T; similarity: number } | null = null;
  for (const candidate of candidates) {
    const similarity = cosineSimilarity(queryEmbedding, candidate.embedding);
    if (!best || similarity > best.similarity) {
      best = { candidate, similarity };
    }
  }
  if (!best || best.similarity < env.VOICE_MATCH_THRESHOLD) return null;
  return best;
}
