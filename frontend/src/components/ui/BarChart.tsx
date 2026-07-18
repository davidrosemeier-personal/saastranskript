import styles from "./BarChart.module.css";

export interface BarChartPoint {
  label: string;
  primary: number;
  secondary?: number;
  isCurrent?: boolean;
  isForecast?: boolean;
  targetPercent?: number; // 0-100, position of the target tick within the column height
}

const TONE_COLOR: Record<"success" | "warning" | "danger", string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
};

export function BarChart({
  data,
  tone = "success",
  maxValue,
}: {
  data: BarChartPoint[];
  tone?: "success" | "warning" | "danger";
  maxValue?: number;
}) {
  const max = maxValue ?? Math.max(1, ...data.map((d) => Math.max(d.primary, d.secondary ?? 0)));
  const color = TONE_COLOR[tone];

  return (
    <>
      <div className={styles.container}>
        {data.map((d, i) => (
          <div key={i} className={styles.column}>
            <div className={styles.barGroup} style={{ height: "100%" }}>
              <div
                className={[styles.bar, d.isForecast ? styles.forecast : ""].join(" ")}
                style={{
                  height: `${(d.primary / max) * 100}%`,
                  background: `linear-gradient(180deg, color-mix(in srgb, ${color} 60%, white), ${color})`,
                  alignSelf: "flex-end",
                }}
              />
              {d.secondary !== undefined && (
                <div
                  className={[styles.bar, d.isForecast ? styles.forecast : ""].join(" ")}
                  style={{
                    height: `${(d.secondary / max) * 100}%`,
                    background:
                      "linear-gradient(180deg, color-mix(in srgb, var(--color-primary-400) 60%, white), var(--color-primary-400))",
                    alignSelf: "flex-end",
                  }}
                />
              )}
              {d.targetPercent !== undefined && (
                <div className={styles.targetTick} style={{ bottom: `${d.targetPercent}%` }} />
              )}
            </div>
            <div className={[styles.label, d.isCurrent ? styles.labelCurrent : ""].join(" ")}>
              {d.label}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: color }} />
          Aktuell
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: "var(--color-primary-400)" }} />
          Vergleich
        </span>
        <span className={styles.legendItem} style={{ opacity: 0.4 }}>
          <span className={styles.legendSwatch} style={{ background: color }} />
          Prognose
        </span>
      </div>
    </>
  );
}
