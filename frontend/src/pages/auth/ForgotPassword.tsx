import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { TextInput } from "../../components/ui/Form";
import { AuthLayout } from "./AuthLayout";
import { API_BASE } from "../../lib/config";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always show the same confirmation, whether or not the email is registered —
      // avoids leaking which accounts exist.
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      {submitted ? (
        <Banner tone="warning">
          If an account exists for that email, a password reset link is on its way.
        </Banner>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <TextInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" style={{ width: "100%" }} disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <div style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>
        <Link to="/login" style={{ color: "var(--color-accent-600)" }}>
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
