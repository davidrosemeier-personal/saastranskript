import type { ReactNode } from "react";
import { Card } from "../../components/ui/Card";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
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
      <Card style={{ padding: 40, width: 360 }}>
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
        <h1 style={{ fontSize: 20, marginBottom: 8, textAlign: "center" }}>{title}</h1>
        <p style={{ fontSize: 13, color: "var(--color-ink-soft)", marginBottom: 24, textAlign: "center" }}>
          {subtitle}
        </p>
        {children}
      </Card>
    </div>
  );
}
