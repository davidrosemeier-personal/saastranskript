import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../layouts/AppShell";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { TextInput } from "../../components/ui/Form";
import { api, ApiError } from "../../lib/api";

interface SpeakerSummary {
  speakerLabel: string;
  suggestedName: string | null;
  sampleUrl: string | null;
  matchedProfileId: string | null;
  matchConfidence: number | null;
}

interface SpeakerDraft {
  displayName: string;
  remember: boolean;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | null;
    return body?.error ?? `Request failed (${err.status})`;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

export function NameSpeakers() {
  const { recordingId } = useParams<{ recordingId: string }>();
  const navigate = useNavigate();
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [speakers, setSpeakers] = useState<SpeakerSummary[]>([]);
  const [drafts, setDrafts] = useState<Record<string, SpeakerDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!recordingId) return;
      try {
        const transcript = await api.get<{ id: string }>(`/transcripts/by-recording/${recordingId}`);
        setTranscriptId(transcript.id);
        const list = await api.get<SpeakerSummary[]>(`/transcripts/${transcript.id}/speakers`);
        setSpeakers(list);
        setDrafts(
          Object.fromEntries(
            list.map((s) => [s.speakerLabel, { displayName: s.suggestedName ?? "", remember: false }])
          )
        );
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [recordingId]);

  function updateDraft(speakerLabel: string, fields: Partial<SpeakerDraft>) {
    setDrafts((prev) => ({ ...prev, [speakerLabel]: { ...prev[speakerLabel]!, ...fields } }));
  }

  async function handleContinue() {
    if (!transcriptId) return;
    setError(null);
    setSaving(true);
    try {
      const payload = {
        speakers: speakers.map((s) => ({
          speakerLabel: s.speakerLabel,
          displayName: drafts[s.speakerLabel]?.displayName?.trim() || s.speakerLabel,
          remember: drafts[s.speakerLabel]?.remember ?? false,
        })),
      };
      await api.post(`/transcripts/${transcriptId}/confirm-speakers`, payload);
      navigate(`/recordings/${recordingId}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, color: "var(--color-ink-faint)" }}>Loading speakers…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Name the speakers"
        subtitle="Play each sample and confirm who's speaking before viewing the transcript"
      />

      {error && <Banner tone="danger">{error}</Banner>}

      <Card style={{ padding: 20 }}>
        {speakers.map((s) => {
          const draft = drafts[s.speakerLabel];
          const isAutoSuggested = s.matchedProfileId !== null;
          return (
            <div
              key={s.speakerLabel}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "16px 0",
                borderBottom: "1px solid var(--color-line)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink-soft)" }}>
                {s.speakerLabel}
                {isAutoSuggested && s.matchConfidence !== null && (
                  <span style={{ fontWeight: 500, color: "var(--color-ink-faint)" }}>
                    {" "}
                    · suggested from a saved voice ({Math.round(s.matchConfidence * 100)}% match)
                  </span>
                )}
              </div>

              {s.sampleUrl && (
                <audio controls src={s.sampleUrl} style={{ width: "100%", maxWidth: 360 }} />
              )}

              <TextInput
                placeholder="Speaker name"
                value={draft?.displayName ?? ""}
                onChange={(e) => updateDraft(s.speakerLabel, { displayName: e.target.value })}
                style={{ maxWidth: 320 }}
              />

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={draft?.remember ?? false}
                  onChange={(e) => updateDraft(s.speakerLabel, { remember: e.target.checked })}
                />
                Remember this speaker's voice for future recordings
              </label>
            </div>
          );
        })}

        <div style={{ marginTop: 16 }}>
          <Button onClick={handleContinue} disabled={saving}>
            {saving ? "Saving…" : "Continue to transcript"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
