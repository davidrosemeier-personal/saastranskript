import type { ReactNode } from "react";
import { useState } from "react";
import styles from "./CompactList.module.css";
import { Card } from "./Card";
import { IconButton } from "./Controls";

const TILE_PALETTE: [string, string][] = [
  ["#2abfbf", "#21a1a1"],
  ["#4a5a72", "#1e2a3a"],
  ["#f0803c", "#d9691f"],
  ["#2f9e6b", "#237a52"],
  ["#d99524", "#b87a18"],
];

function paletteFor(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TILE_PALETTE[hash % TILE_PALETTE.length] ?? TILE_PALETTE[0]!;
}

export function CompactList({ children }: { children: ReactNode }) {
  return <Card className={styles.list}>{children}</Card>;
}

export function ListHeaderRow({ columns, template }: { columns: string[]; template: string }) {
  return (
    <div className={[styles.row, styles.headerRow].join(" ")} style={{ gridTemplateColumns: template }}>
      {columns.map((c) => (
        <div key={c}>{c}</div>
      ))}
    </div>
  );
}

export function ListRow({
  template,
  children,
  hoverable = true,
  open = false,
  onClick,
}: {
  template: string;
  children: ReactNode;
  hoverable?: boolean;
  open?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={[styles.row, hoverable ? styles.rowHoverable : "", open ? styles.rowOpen : ""].join(" ")}
      style={{ gridTemplateColumns: template }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function EntryCell({
  seed,
  initials,
  name,
  secondary,
  badge,
  chips,
}: {
  seed: string;
  initials: string;
  name: string;
  secondary?: string;
  badge?: ReactNode;
  chips?: ReactNode;
}) {
  const [a, b] = paletteFor(seed);
  return (
    <div className={styles.entryCell}>
      <div className={styles.tileIcon} style={{ ["--tile-a" as string]: a, ["--tile-b" as string]: b }}>
        {initials}
      </div>
      <div className={styles.entryText}>
        <div className={styles.entryPrimary}>
          <span className={styles.entryName}>{name}</span>
          {badge}
        </div>
        {secondary && <div className={styles.entrySecondary}>{secondary}</div>}
        {chips}
      </div>
    </div>
  );
}

export function ProgressCell({
  percent,
  target,
  tone = "accent",
}: {
  percent: number;
  target?: number;
  tone?: "accent" | "warning" | "danger";
}) {
  const fillClass = { accent: styles.fill, warning: styles.fillWarning, danger: styles.fillDanger }[tone];
  return (
    <div className={styles.progressCell}>
      <div className={styles.track}>
        <div className={fillClass} style={{ width: `${Math.min(100, percent)}%` }} />
        {target !== undefined && <div className={styles.targetMarker} style={{ left: `${target}%` }} />}
      </div>
      <div className={styles.progressValue}>{Math.round(percent)}%</div>
    </div>
  );
}

export function GaugeCell({ percent, value }: { percent: number; value: ReactNode }) {
  return (
    <div className={styles.gaugeCell}>
      <div className={styles.gaugeScale}>
        <div className={styles.gaugeDot} style={{ left: `${percent}%` }} />
      </div>
      <div className={styles.gaugeValue}>{value}</div>
    </div>
  );
}

export function NumberCell({ children, delta }: { children: ReactNode; delta?: ReactNode }) {
  return (
    <div className={styles.numberCell}>
      {children}
      {delta}
    </div>
  );
}

export function StatusCell({ children }: { children: ReactNode }) {
  return <div className={styles.statusCell}>{children}</div>;
}

export function ChevronCell({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className={styles.chevronCell}>
      <IconButton open={open} onClick={onToggle} label="Toggle details" />
    </div>
  );
}

export function DetailArea({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={[styles.detail, open ? styles.detailOpen : ""].join(" ")}>
      <div className={styles.detailInner}>{children}</div>
    </div>
  );
}

/** Convenience hook for the common expand/collapse-one-row-at-a-time pattern. */
export function useExpandableRow() {
  const [openId, setOpenId] = useState<string | null>(null);
  return {
    isOpen: (id: string) => openId === id,
    toggle: (id: string) => setOpenId((cur) => (cur === id ? null : id)),
  };
}
