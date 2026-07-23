import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../layouts/AppShell";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";

interface Recording {
  id: string;
  original_filename: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  duration_seconds: number | null;
  created_at: string;
  speakers_confirmed_at: string | null;
  last_exported_at: string | null;
}

type DisplayStatus = "uploaded" | "processing" | "failed" | "needs_review" | "ready" | "exported";

const STATUS_LABEL: Record<DisplayStatus, string> = {
  uploaded: "Uploaded",
  processing: "Transcribing…",
  failed: "Failed",
  needs_review: "Needs speaker review",
  ready: "Ready",
  exported: "Exported",
};

const STATUS_TONE: Record<DisplayStatus, "neutral" | "warning" | "success" | "danger"> = {
  uploaded: "neutral",
  processing: "warning",
  failed: "danger",
  needs_review: "warning",
  ready: "success",
  exported: "success",
};

/**
 * recordings.status only tracks the transcription pipeline; whether speakers were
 * reviewed and whether the transcript was ever exported live on the transcript row
 * instead (independent facts, not a strict sequence — see conversation with the user).
 * This derives the single badge the list shows from all of them.
 */
function displayStatus(r: Recording): DisplayStatus {
  if (r.status !== "completed") return r.status;
  if (!r.speakers_confirmed_at) return "needs_review";
  if (r.last_exported_at) return "exported";
  return "ready";
}

export function Recordings() {
  const [recordings, setRecordings] = useState<Recording[] | null>(null);
  const navigate = useNavigate();

  async function load() {
    setRecordings(await api.get<Recording[]>("/recordings"));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this recording and its transcript?")) return;
    await api.delete(`/recordings/${id}`);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Recordings"
        subtitle="Your uploaded meetings and their transcription status"
        actions={<Button onClick={() => navigate("/upload")}>Upload new</Button>}
      />

      <Card>
        {recordings === null ? (
          <div style={{ padding: 20, color: "var(--color-ink-faint)" }}>Loading…</div>
        ) : recordings.length === 0 ? (
          <div style={{ padding: 20, color: "var(--color-ink-faint)" }}>
            No recordings yet. Upload your first meeting.
          </div>
        ) : (
          recordings.map((r) => (
            <RecordingRow key={r.id} recording={r} onDelete={handleDelete} />
          ))
        )}
      </Card>
    </div>
  );
}

function RecordingRow({
  recording,
  onDelete,
}: {
  recording: Recording;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  const navigate = useNavigate();
  const clickable = recording.status === "completed";
  const status = displayStatus(recording);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 100px",
        alignItems: "center",
        gap: 14,
        padding: "14px 20px",
        borderBottom: "1px solid var(--color-line)",
        cursor: clickable ? "pointer" : "default",
      }}
      onClick={() => clickable && navigate(`/recordings/${recording.id}`)}
    >
      <div style={{ fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis" }}>
        {recording.original_filename}
      </div>
      <div style={{ fontSize: 12, color: "var(--color-ink-soft)" }}>
        {recording.duration_seconds ? `${Math.round(recording.duration_seconds / 60)} min` : "—"}
      </div>
      <div>
        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {clickable && (
          <Link
            to={`/recordings/${recording.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{ fontSize: 12, color: "var(--color-accent-600)" }}
          >
            Open
          </Link>
        )}
        <button
          onClick={(e) => onDelete(recording.id, e)}
          style={{
            border: "none",
            background: "none",
            color: "var(--color-danger)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
