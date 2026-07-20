import { useEffect, useRef, useState } from "react";
import { PageHeader } from "../../layouts/AppShell";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { api, ApiError } from "../../lib/api";

const RECORD_SECONDS = 15;

interface VoiceProfileStatus {
  enrolled: boolean;
  displayName?: string;
  updatedAt?: string;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | null;
    return body?.error ?? `Request failed (${err.status})`;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

export function VoiceSettings() {
  const [status, setStatus] = useState<VoiceProfileStatus | null>(null);
  const [recording, setRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RECORD_SECONDS);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      setStatus(await api.get<VoiceProfileStatus>("/me/voice-profile"));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    load();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startRecording() {
    setError(null);
    setRecordedBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        setRecordedBlob(new Blob(chunksRef.current, { type: recorder.mimeType }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSecondsLeft(RECORD_SECONDS);

      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setError("Microphone access was denied or is unavailable in this browser.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function saveRecording() {
    if (!recordedBlob) return;
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", recordedBlob, "self-voice.webm");
      await api.upload("/me/voice-profile", form);
      setRecordedBlob(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeProfile() {
    setError(null);
    try {
      await api.delete("/me/voice-profile");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Enroll your own voice so it's auto-recognized in future transcripts"
      />

      {error && <Banner tone="danger">{error}</Banner>}

      <Card style={{ padding: 20, maxWidth: 480 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Your voice profile</div>
        <div style={{ fontSize: 12, color: "var(--color-ink-soft)", marginBottom: 16 }}>
          {status === null
            ? "Loading…"
            : status.enrolled
              ? `Enrolled as "${status.displayName}"`
              : "Not enrolled yet — record about 15 seconds of yourself speaking."}
        </div>

        {recording && (
          <div style={{ fontSize: 13, marginBottom: 12 }}>Recording… {secondsLeft}s left</div>
        )}

        {recordedBlob && !recording && (
          <div style={{ marginBottom: 12 }}>
            <audio controls src={URL.createObjectURL(recordedBlob)} style={{ width: "100%" }} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {!recording && (
            <Button variant="outline" onClick={startRecording}>
              {recordedBlob ? "Re-record" : "Record my voice"}
            </Button>
          )}
          {recording && (
            <Button variant="outline" onClick={stopRecording}>
              Stop recording
            </Button>
          )}
          {recordedBlob && !recording && (
            <Button onClick={saveRecording} disabled={saving}>
              {saving ? "Saving…" : "Save voice profile"}
            </Button>
          )}
          {status?.enrolled && !recording && !recordedBlob && (
            <Button variant="outline" onClick={removeProfile}>
              Remove voice profile
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
