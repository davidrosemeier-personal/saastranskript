import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../layouts/AppShell";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { api, ApiError } from "../../lib/api";
import { API_BASE } from "../../lib/config";

interface TranscriptSegment {
  id: string;
  speaker_label: string;
  speaker_name: string | null;
  text: string;
  start_ms: number;
  sort_order: number;
}

interface TranscriptDetail {
  id: string;
  speakers_confirmed_at: string | null;
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function TranscriptEditor() {
  const { recordingId } = useParams<{ recordingId: string }>();
  const navigate = useNavigate();
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [driveRevoked, setDriveRevoked] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      if (!recordingId) return;
      const transcript = await api.get<TranscriptDetail>(`/transcripts/by-recording/${recordingId}`);
      if (!transcript.speakers_confirmed_at) {
        navigate(`/recordings/${recordingId}/name-speakers`, { replace: true });
        return;
      }
      setTranscriptId(transcript.id);
      const detail = await api.get<{ segments: TranscriptSegment[] }>(`/transcripts/${transcript.id}`);
      setSegments(detail.segments);
      setLoading(false);
    })();
  }, [recordingId, navigate]);

  async function updateText(segmentId: string, text: string) {
    setSegments((prev) => prev.map((s) => (s.id === segmentId ? { ...s, text } : s)));
    if (!transcriptId) return;
    await api.patch(`/transcripts/${transcriptId}/segments/${segmentId}`, { text });
  }

  async function renameSpeaker(speakerLabel: string, displayName: string) {
    if (!transcriptId) return;
    setSegments((prev) =>
      prev.map((s) => (s.speaker_label === speakerLabel ? { ...s, speaker_name: displayName } : s))
    );
    await api.patch(`/transcripts/${transcriptId}/speakers/${encodeURIComponent(speakerLabel)}`, {
      displayName,
    });
  }

  async function deleteSegment(segmentId: string) {
    if (!transcriptId) return;
    setSegments((prev) => prev.filter((s) => s.id !== segmentId));
    await api.delete(`/transcripts/${transcriptId}/segments/${segmentId}`);
  }

  async function mergeWithPrevious(index: number) {
    if (!transcriptId || index === 0) return;
    const target = segments[index - 1];
    const source = segments[index];
    if (!target || !source) return;
    await api.post(`/transcripts/${transcriptId}/segments/merge`, {
      targetId: target.id,
      sourceId: source.id,
    });
    setSegments((prev) => {
      const next = [...prev];
      next[index - 1] = { ...target, text: `${target.text} ${source.text}`.trim() };
      next.splice(index, 1);
      return next;
    });
  }

  async function handleCopy() {
    if (!transcriptId) return;
    const markdown = await api.get<string>(`/transcripts/${transcriptId}/markdown`);
    await navigator.clipboard.writeText(markdown);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  async function handleDownload() {
    if (!transcriptId) return;
    const markdown = await api.get<string>(`/transcripts/${transcriptId}/markdown?download=true`);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${transcriptId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSaveToDrive() {
    if (!transcriptId) return;
    try {
      await api.post(`/transcripts/${transcriptId}/save-to-drive`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDriveRevoked(true);
      }
    }
  }

  if (loading) {
    return <div style={{ padding: 40, color: "var(--color-ink-faint)" }}>Loading transcript…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Transcript"
        subtitle="Edit segments, rename speakers, then copy or save to Drive"
        actions={
          <>
            <Button variant="outline" onClick={handleCopy}>
              {copySuccess ? "Copied!" : "Copy transcript"}
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              Download as MD
            </Button>
            <Button onClick={handleSaveToDrive}>{saveSuccess ? "Saved!" : "Save to Drive"}</Button>
          </>
        }
      />

      {driveRevoked && (
        <Banner tone="warning">
          <strong>Google Drive access was revoked.</strong> Reconnect your account to save transcripts.{" "}
          <a href={`${API_BASE}/auth/google/start`}>Reconnect Google Drive</a>
        </Banner>
      )}

      <Card>
        {segments.map((segment, i) => (
          <div
            key={segment.id}
            style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-line)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <input
                // Keying on the current name forces React to remount (not reuse) this
                // uncontrolled input when a sibling segment's rename cascades a new
                // speaker_name into this segment's state — otherwise defaultValue is
                // only honored on first mount and the displayed text goes stale.
                key={`${segment.id}-${segment.speaker_name ?? segment.speaker_label}`}
                defaultValue={segment.speaker_name ?? segment.speaker_label}
                onBlur={(e) => {
                  if (e.target.value !== (segment.speaker_name ?? segment.speaker_label)) {
                    renameSpeaker(segment.speaker_label, e.target.value);
                  }
                }}
                style={{
                  fontWeight: 700,
                  fontSize: 13.5,
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  width: 160,
                }}
              />
              <span style={{ fontSize: 11, color: "var(--color-ink-faint)" }}>
                {formatTimestamp(segment.start_ms)}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                {i > 0 && (
                  <button
                    onClick={() => mergeWithPrevious(i)}
                    style={{ fontSize: 11, border: "none", background: "none", color: "var(--color-ink-soft)", cursor: "pointer" }}
                  >
                    Merge up
                  </button>
                )}
                <button
                  onClick={() => deleteSegment(segment.id)}
                  style={{ fontSize: 11, border: "none", background: "none", color: "var(--color-danger)", cursor: "pointer" }}
                >
                  Delete
                </button>
              </div>
            </div>
            <textarea
              defaultValue={segment.text}
              onBlur={(e) => {
                if (e.target.value !== segment.text) updateText(segment.id, e.target.value);
              }}
              style={{
                width: "100%",
                fontSize: 13,
                lineHeight: 1.5,
                border: "1px solid transparent",
                borderRadius: "var(--radius-input)",
                padding: 8,
                resize: "vertical",
                minHeight: 40,
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.border = "1px solid var(--color-line)")}
            />
          </div>
        ))}
      </Card>
    </div>
  );
}
