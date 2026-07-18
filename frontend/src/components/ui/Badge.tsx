import type { ReactNode } from "react";
import styles from "./Badge.module.css";

type Tone = "neutral" | "success" | "warning" | "danger";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={[styles.badge, styles[tone]].join(" ")}>{children}</span>;
}

export function StatusBadge({ tone = "warning", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={[styles.statusBadge, styles[tone]].join(" ")}>{children}</span>;
}

export function DeltaIndicator({ value, goodDirection = "up" }: { value: number; goodDirection?: "up" | "down" }) {
  const isUp = value >= 0;
  const isGood = goodDirection === "up" ? isUp : !isUp;
  return (
    <span className={[styles.delta, isGood ? styles.deltaGood : styles.deltaBad].join(" ")}>
      {isUp ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  );
}

export function DeltaPill({ value }: { value: number }) {
  const good = value >= 0;
  return (
    <span className={[styles.deltaPill, good ? styles.good : styles.bad].join(" ")}>
      {good ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className={styles.chipRow}>{children}</div>;
}

export function Chip({ label, value, tone = "good" }: { label: string; value: ReactNode; tone?: "good" | "medium" | "bad" }) {
  const toneClass = { good: styles.chipGood, medium: styles.chipMedium, bad: styles.chipBad }[tone];
  return (
    <span className={[styles.chip, toneClass].join(" ")}>
      <span className={styles.chipLabel}>{label}</span>
      {value}
    </span>
  );
}
