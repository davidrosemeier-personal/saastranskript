import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Form.module.css";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={styles.input} {...props} />;
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className={styles.fieldGrid}>{children}</div>;
}

export function Field({
  label,
  span2,
  children,
}: {
  label: string;
  span2?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={[styles.field, span2 ? styles.fieldSpan2 : ""].join(" ")}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

export function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.optionsRow}>{children}</div>
    </fieldset>
  );
}

export function CheckboxOption({
  checked,
  onChange,
  lead,
  sub,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  lead: string;
  sub?: string;
}) {
  return (
    <label className={styles.option}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className={styles.optionLead}>{lead}</span>{" "}
        {sub && <span className={styles.optionSub}>{sub}</span>}
      </span>
    </label>
  );
}

export function AccordionList({ children }: { children: ReactNode }) {
  return <div className={styles.accordionList}>{children}</div>;
}

export function AccordionCard({
  name,
  sub,
  open,
  onToggle,
  headerRight,
  children,
}: {
  name: string;
  sub?: string;
  open: boolean;
  onToggle: () => void;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.accordionCard}>
      <div className={styles.accordionHead} onClick={onToggle}>
        <div>
          <div className={styles.accordionName}>{name}</div>
          {sub && <div className={styles.accordionSub}>{sub}</div>}
        </div>
        <div className={styles.accordionRight}>
          {headerRight}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      {open && <div className={styles.accordionBody}>{children}</div>}
    </div>
  );
}

export function AccordionFooter({ children }: { children: ReactNode }) {
  return <div className={styles.accordionFooter}>{children}</div>;
}
