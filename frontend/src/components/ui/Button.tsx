import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const variantClass = { primary: styles.primary, outline: styles.outline, ghost: styles.ghost }[
    variant
  ];
  return <button className={[styles.button, variantClass, className].filter(Boolean).join(" ")} {...props} />;
}
