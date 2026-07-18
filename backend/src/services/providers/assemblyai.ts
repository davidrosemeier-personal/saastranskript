import type { TranscriptionProvider, WebhookParseResult } from "./types.js";

const API_BASE = "https://api.assemblyai.com/v2";

interface AssemblyAIWebhookPayload {
  transcript_id: string;
  status: "completed" | "error";
}

interface AssemblyAIUtterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

interface AssemblyAITranscriptResult {
  status: "completed" | "error";
  error?: string;
  utterances: AssemblyAIUtterance[] | null;
}

export const assemblyAIProvider: TranscriptionProvider = {
  name: "assemblyai",

  async submit({ audioUrl, webhookUrl, apiKey }) {
    const res = await fetch(`${API_BASE}/transcript`, {
      method: "POST",
      headers: { authorization: apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        audio_url: audioUrl,
        webhook_url: webhookUrl,
        speaker_labels: true,
      }),
    });
    if (!res.ok) throw new Error(`AssemblyAI submit failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { id: string };
    return { providerJobId: data.id };
  },

  async parseWebhook(payload, apiKey): Promise<WebhookParseResult> {
    const body = payload as AssemblyAIWebhookPayload;
    if (body.status === "error") {
      return { status: "failed", utterances: [], errorMessage: "AssemblyAI transcription failed" };
    }

    const res = await fetch(`${API_BASE}/transcript/${body.transcript_id}`, {
      headers: { authorization: apiKey },
    });
    if (!res.ok) throw new Error(`AssemblyAI fetch result failed: ${res.status}`);
    const result = (await res.json()) as AssemblyAITranscriptResult;

    if (result.status === "error") {
      return { status: "failed", utterances: [], errorMessage: result.error ?? "Unknown error" };
    }

    return {
      status: "completed",
      utterances: (result.utterances ?? []).map((u) => ({
        speakerLabel: `Speaker ${u.speaker}`,
        text: u.text,
        startMs: u.start,
        endMs: u.end,
      })),
    };
  },
};
