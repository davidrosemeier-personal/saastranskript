import type { InputHTMLAttributes } from "react";
import styles from "./Controls.module.css";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.segmented}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={[styles.segment, opt.value === value ? styles.segmentActive : ""].join(" ")}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function SearchField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="search" className={styles.searchField} {...props} />;
}

export function IconButton({
  open,
  onClick,
  label,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button type="button" className={styles.iconButton} onClick={onClick} aria-label={label}>
      <svg
        className={[styles.chevron, open ? styles.chevronOpen : ""].join(" ")}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}
