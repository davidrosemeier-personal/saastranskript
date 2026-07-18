import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { API_BASE } from "../../lib/config";

export function Login() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-canvas)",
      }}
    >
      <Card style={{ padding: 40, width: 360, textAlign: "center" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-tile)",
            background: "var(--color-primary)",
            margin: "0 auto 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "2.5px solid var(--color-accent)",
            }}
          />
        </div>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Meeting Transcripts</h1>
        <p style={{ fontSize: 13, color: "var(--color-ink-soft)", marginBottom: 24 }}>
          Sign in to upload recordings and manage your transcripts.
        </p>
        {error && (
          <p style={{ fontSize: 12, color: "var(--color-danger)", marginBottom: 16 }}>
            Sign-in failed. Please try again.
          </p>
        )}
        <Button
          style={{ width: "100%" }}
          onClick={() => (window.location.href = `${API_BASE}/auth/google/start`)}
        >
          Continue with Google
        </Button>
      </Card>
    </div>
  );
}
