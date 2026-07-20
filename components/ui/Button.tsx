import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-wood-dark disabled:opacity-40",
  secondary:
    "bg-wood-dark text-paper hover:bg-ink disabled:opacity-40",
  ghost:
    "border border-ink/20 text-ink-soft hover:text-ink hover:border-wood disabled:opacity-30",
  danger: "text-chalk hover:text-chalk/70 disabled:opacity-30",
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    variant === "danger"
      ? "text-xs px-2 py-1"
      : "text-sm px-4 py-2 rounded transition-colors font-medium";
  return (
    <button
      className={`${base} ${VARIANT_CLASS[variant]} ${className}`}
      {...props}
    />
  );
}
