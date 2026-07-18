import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../layouts/AppShell";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { API_BASE } from "../../lib/config";

export function Upload() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append("audio", file);

    try {
      await uploadWithProgress(formData, setProgress);
      navigate("/recordings");
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setError("You've reached your usage limit for this billing cycle.");
      } else {
        setError("Upload failed. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Upload" subtitle="Upload a meeting recording to get a diarized transcript" />

      {error && <Banner tone="danger">{error}</Banner>}

      <Card
        style={{
          padding: 48,
          textAlign: "center",
          border: dragging ? "2px dashed var(--color-accent)" : "2px dashed var(--color-line)",
          cursor: "pointer",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {uploading ? (
          <div>
            <p style={{ marginBottom: 12 }}>Uploading… {progress}%</p>
            <div
              style={{
                width: "100%",
                maxWidth: 320,
                margin: "0 auto",
                height: 6,
                borderRadius: 100,
                background: "var(--color-surface-muted)",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  borderRadius: 100,
                  background: "linear-gradient(90deg, var(--color-accent), var(--color-accent-600))",
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>Drop an audio or video file here</p>
            <p style={{ fontSize: 13, color: "var(--color-ink-soft)", marginBottom: 20 }}>
              or click to browse (up to 500MB)
            </p>
            <Button variant="outline">Choose file</Button>
          </>
        )}
      </Card>
    </div>
  );
}

function uploadWithProgress(formData: FormData, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/recordings`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new ApiError(xhr.status, xhr.responseText));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}
