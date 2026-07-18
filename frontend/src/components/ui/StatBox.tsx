import type { ReactNode } from "react";
import styles from "./StatBox.module.css";
import { DeltaPill } from "./Badge";

export function StatBoxGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function StatBox({
  heading,
  sub,
  children,
}: {
  heading: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.box}>
      <div className={styles.heading}>{heading}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
      {children}
    </div>
  );
}

export function StatValueRow({
  label,
  values,
  delta,
}: {
  label: string;
  values: ReactNode[];
  delta?: number;
}) {
  return (
    <div className={styles.valueRow}>
      <span className={styles.valueLabel}>{label}</span>
      <span className={styles.valueCluster}>
        {values.map((v, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {i > 0 && <span className={styles.valueSep}>→</span>}
            {v}
          </span>
        ))}
        {delta !== undefined && <DeltaPill value={delta} />}
      </span>
    </div>
  );
}

export function StatBoxBar({
  label,
  value,
  currentPercent,
  referencePercent,
  tone = "var(--color-accent-600)",
  deltaText,
}: {
  label: string;
  value: ReactNode;
  currentPercent: number;
  referencePercent: number;
  tone?: string;
  deltaText?: string;
}) {
  return (
    <div>
      <div className={styles.barHead}>
        <span className={styles.barLabel}>{label}</span>
        <span className={styles.barValue}>{value}</span>
      </div>
      <div className={styles.barTrack}>
        <div className={styles.barReference} style={{ width: `${referencePercent}%` }} />
        <div
          className={styles.barCurrent}
          style={{
            width: `${currentPercent}%`,
            background: `linear-gradient(90deg, color-mix(in srgb, ${tone} 60%, white), ${tone})`,
          }}
        />
      </div>
      {deltaText && <div className={styles.deltaLine}>{deltaText}</div>}
    </div>
  );
}
