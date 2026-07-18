import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  actions?: ReactNode;
}

export function Card({ title, actions, children, className, ...props }: CardProps) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(" ")} {...props}>
      {(title || actions) && (
        <div className={styles.header}>
          {title && <div className={styles.title}>{title}</div>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
