import type { TranscriptionProvider, TranscriptUtterance, WebhookParseResult } from "./types.js";

const API_BASE = "https://api.openai.com/v1";

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

interface WhisperVerboseJsonResponse {
  segments: WhisperSegment[];
}

/**
 * OpenAI's Whisper API is synchronous (no async job + webhook, and no built-in speaker
 * diarization). To keep it behind the same TranscriptionProvider interface as the
 * webhook-driven providers, `submit` performs the transcription immediately and then
 * self-posts the result to our own webhook endpoint — the rest of the pipeline (route,
 * repositories, ffmpeg sample extraction) is unaware of the difference. This is a single
 * synchronous call, not a polling loop.
 */
export const whisperProvider: TranscriptionProvider = {
  name: "whisper",

  async submit({ audioUrl, webhookUrl, apiKey }) {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`Whisper: failed to fetch audio from signed URL`);
    const audioBlob = await audioRes.blob();

    const form = new FormData();
    form.append("file", audioBlob, "audio.mp3");
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");

    const res = await fetch(`${API_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Whisper submit failed: ${res.status} ${await res.text()}`);
    const result = (await res.json()) as WhisperVerboseJsonResponse;

    const providerJobId = crypto.randomUUID();
    // Self-post to webhookUrl (which already carries ?recordingId=... — see providers/index.ts)
    // so the normal webhook route persists the result identically to the async providers.
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ providerJobId, segments: result.segments }),
    });

    return { providerJobId };
  },

  async parseWebhook(payload): Promise<WebhookParseResult> {
    const body = payload as { segments: WhisperSegment[] };
    // No diarization: entire transcript attributed to a single speaker label.
    const utterances: TranscriptUtterance[] = body.segments.map((s) => ({
      speakerLabel: "Speaker 0",
      text: s.text.trim(),
      startMs: Math.round(s.start * 1000),
      endMs: Math.round(s.end * 1000),
    }));
    return { status: "completed", utterances };
  },
};
