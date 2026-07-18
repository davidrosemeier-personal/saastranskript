import { ProviderCredentialsRepo } from "../../repositories/providerCredentials.js";
import { decrypt } from "../crypto/index.js";
import type { ProviderName } from "../../types.js";
import { assemblyAIProvider } from "./assemblyai.js";
import { deepgramProvider } from "./deepgram.js";
import { whisperProvider } from "./whisper.js";
import type { TranscriptionProvider } from "./types.js";

export type { TranscriptionProvider, TranscriptUtterance, WebhookParseResult } from "./types.js";

const registry: Record<ProviderName, TranscriptionProvider> = {
  assemblyai: assemblyAIProvider,
  deepgram: deepgramProvider,
  whisper: whisperProvider,
};

export function getProviderAdapter(name: ProviderName): TranscriptionProvider {
  const provider = registry[name];
  if (!provider) throw new Error(`Unknown transcription provider: ${name}`);
  return provider;
}

export async function getActiveProvider(): Promise<{
  provider: TranscriptionProvider;
  apiKey: string;
  name: ProviderName;
}> {
  const active = await ProviderCredentialsRepo.getActive();
  if (!active || !active.encrypted_api_key) {
    throw new Error("No active transcription provider is configured");
  }
  return {
    provider: getProviderAdapter(active.provider),
    apiKey: decrypt(active.encrypted_api_key),
    name: active.provider,
  };
}
