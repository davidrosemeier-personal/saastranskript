export interface TranscriptUtterance {
  speakerLabel: string;
  text: string;
  startMs: number;
  endMs: number;
}

export interface WebhookParseResult {
  status: "completed" | "failed";
  utterances: TranscriptUtterance[];
  errorMessage?: string;
}

export interface TranscriptionProvider {
  readonly name: string;

  /**
   * Submits an audio file (via a signed URL the provider can fetch) for async transcription.
   * `webhookUrl` already has the recording id embedded as a query param, so correlation on
   * webhook arrival never depends on parsing a provider-specific job-id shape. Synchronous
   * providers (Whisper) may self-post to `webhookUrl` from within this call instead of
   * returning and waiting for an inbound callback — same interface either way.
   */
  submit(params: { audioUrl: string; webhookUrl: string; apiKey: string }): Promise<{
    providerJobId: string;
  }>;

  /** Parses the provider's webhook payload into a normalized shape. Providers may need to
   *  fetch the full result from their API using a job id embedded in the payload. */
  parseWebhook(payload: unknown, apiKey: string): Promise<WebhookParseResult>;
}
