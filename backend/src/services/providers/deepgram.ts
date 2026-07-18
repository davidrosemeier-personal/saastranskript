import type { TranscriptionProvider, TranscriptUtterance, WebhookParseResult } from "./types.js";

const API_BASE = "https://api.deepgram.com/v1";

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  speaker?: number;
}

interface DeepgramCallbackPayload {
  request_id?: string;
  results?: {
    channels?: Array<{
      alternatives?: Array<{ words?: DeepgramWord[] }>;
    }>;
  };
  err_code?: string;
  err_msg?: string;
}

/** Deepgram's prerecorded callback includes the full result inline (no re-fetch needed). */
function utterancesFromWords(words: DeepgramWord[]): TranscriptUtterance[] {
  const utterances: TranscriptUtterance[] = [];
  for (const word of words) {
    const speakerLabel = `Speaker ${word.speaker ?? 0}`;
    const last = utterances.at(-1);
    if (last && last.speakerLabel === speakerLabel) {
      last.text += ` ${word.word}`;
      last.endMs = Math.round(word.end * 1000);
    } else {
      utterances.push({
        speakerLabel,
        text: word.word,
        startMs: Math.round(word.start * 1000),
        endMs: Math.round(word.end * 1000),
      });
    }
  }
  return utterances;
}

export const deepgramProvider: TranscriptionProvider = {
  name: "deepgram",

  async submit({ audioUrl, webhookUrl, apiKey }) {
    const url = new URL(`${API_BASE}/listen`);
    url.searchParams.set("diarize", "true");
    url.searchParams.set("callback", webhookUrl);

    const res = await fetch(url, {
      method: "POST",
      headers: { authorization: `Token ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ url: audioUrl }),
    });
    if (!res.ok) throw new Error(`Deepgram submit failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { request_id: string };
    return { providerJobId: data.request_id };
  },

  async parseWebhook(payload): Promise<WebhookParseResult> {
    const body = payload as DeepgramCallbackPayload;
    if (body.err_code) {
      return { status: "failed", utterances: [], errorMessage: body.err_msg ?? body.err_code };
    }
    const words = body.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
    return { status: "completed", utterances: utterancesFromWords(words) };
  },
};
