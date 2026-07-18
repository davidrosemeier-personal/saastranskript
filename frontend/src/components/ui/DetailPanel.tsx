import type { ReactNode } from "react";
import styles from "./DetailPanel.module.css";

export function DetailGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function DetailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className={styles.groupTitle}>{title}</div>
      {children}
    </div>
  );
}

export function DetailFieldPanel({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>{title}</span>
        {sub && <span className={styles.panelSub}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}

export function DetailEmpty({ children }: { children: ReactNode }) {
  return <div className={styles.empty}>{children}</div>;
}
