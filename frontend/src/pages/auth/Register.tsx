import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { TextInput } from "../../components/ui/Form";
import { AuthLayout } from "./AuthLayout";
import { API_BASE } from "../../lib/config";

export function Register() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, displayName: displayName || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Registration failed. Please try again.");
        return;
      }
      window.location.href = "/upload";
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start transcribing your meetings in a few seconds.">
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
          type="text"
          placeholder="Name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <TextInput
          type="password"
          placeholder="Password (min. 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <TextInput
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" style={{ width: "100%" }} disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <div style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>
        <Link to="/login" style={{ color: "var(--color-accent-600)" }}>
          Already have an account? Sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
