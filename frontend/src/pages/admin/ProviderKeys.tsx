import { useEffect, useState } from "react";
import { PageHeader } from "../../layouts/AppShell";
import { AccordionCard, AccordionFooter, AccordionList, Field } from "../../components/ui/Form";
import { TextInput } from "../../components/ui/Form";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Banner } from "../../components/ui/Banner";
import { api, ApiError } from "../../lib/api";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | null;
    return body?.error ?? `Request failed (${err.status})`;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

interface ProviderInfo {
  provider: "assemblyai" | "deepgram" | "whisper";
  isActive: boolean;
  hasKey: boolean;
  updatedAt: string;
}

const PROVIDER_LABELS: Record<ProviderInfo["provider"], string> = {
  assemblyai: "AssemblyAI",
  deepgram: "Deepgram",
  whisper: "Whisper (OpenAI)",
};

export function AdminProviderKeys() {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [openProvider, setOpenProvider] = useState<string | null>(null);
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setProviders(await api.get<ProviderInfo[]>("/admin/providers"));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveKey(provider: string) {
    const apiKey = keyDrafts[provider];
    if (!apiKey) return;
    setError(null);
    try {
      await api.put(`/admin/providers/${provider}/key`, { apiKey });
      setKeyDrafts((prev) => ({ ...prev, [provider]: "" }));
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function activate(provider: string) {
    setError(null);
    try {
      await api.post(`/admin/providers/${provider}/activate`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function deactivate(provider: string) {
    setError(null);
    try {
      await api.post(`/admin/providers/${provider}/deactivate`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="Provider API Keys" subtitle="Configure and activate speech-to-text providers" />
      {error && <Banner tone="danger">{error}</Banner>}

      <AccordionList>
        {providers?.map((p) => (
          <AccordionCard
            key={p.provider}
            name={PROVIDER_LABELS[p.provider]}
            sub={p.hasKey ? "Key configured" : "No key configured"}
            open={openProvider === p.provider}
            onToggle={() => setOpenProvider((cur) => (cur === p.provider ? null : p.provider))}
            headerRight={p.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
          >
            <Field label="API key">
              <TextInput
                type="password"
                placeholder={p.hasKey ? "••••••••••••••••" : "Enter API key"}
                value={keyDrafts[p.provider] ?? ""}
                onChange={(e) => setKeyDrafts((prev) => ({ ...prev, [p.provider]: e.target.value }))}
              />
            </Field>
            <AccordionFooter>
              <Button variant="outline" onClick={() => saveKey(p.provider)}>
                Save key
              </Button>
              {p.isActive ? (
                <Button variant="outline" onClick={() => deactivate(p.provider)}>
                  Deactivate
                </Button>
              ) : (
                <Button onClick={() => activate(p.provider)} disabled={!p.hasKey}>
                  Set as active provider
                </Button>
              )}
            </AccordionFooter>
          </AccordionCard>
        ))}
      </AccordionList>
    </div>
  );
}
