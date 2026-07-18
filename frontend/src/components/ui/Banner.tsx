import type { ReactNode } from "react";

const toneStyles = {
  warning: { bg: "var(--color-warning-soft)", text: "var(--color-warning-text)", border: "var(--color-warning)" },
  danger: { bg: "var(--color-danger-soft)", text: "var(--color-danger-text)", border: "var(--color-danger)" },
};

export function Banner({ tone, children }: { tone: "warning" | "danger"; children: ReactNode }) {
  const t = toneStyles[tone];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 16px",
        borderRadius: "var(--radius-control)",
        fontSize: 13,
        lineHeight: 1.5,
        marginBottom: 12,
        background: t.bg,
        color: t.text,
        border: `1px solid color-mix(in srgb, ${t.border} 35%, transparent)`,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          marginTop: 6,
          borderRadius: "50%",
          background: t.border,
          flexShrink: 0,
        }}
      />
      <div>{children}</div>
    </div>
  );
}
