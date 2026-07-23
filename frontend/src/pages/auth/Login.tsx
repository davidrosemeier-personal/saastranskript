import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { TextInput } from "../../components/ui/Form";
import { AuthLayout } from "./AuthLayout";
import { API_BASE } from "../../lib/config";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Login failed. Please try again.");
        return;
      }
      window.location.href = "/upload";
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Meeting Transcripts" subtitle="Sign in to upload recordings and manage your transcripts.">
      {error && <Banner tone="danger">{error}</Banner>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <TextInput
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextInput
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" style={{ width: "100%" }} disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 12 }}>
        <Link to="/forgot-password" style={{ color: "var(--color-ink-soft)" }}>
          Forgot password?
        </Link>
        <Link to="/register" style={{ color: "var(--color-accent-600)" }}>
          Create an account
        </Link>
      </div>
    </AuthLayout>
  );
}
