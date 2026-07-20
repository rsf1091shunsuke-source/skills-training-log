import { AnchorHTMLAttributes, HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & { interactive?: boolean };

export function Card({ interactive, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-ink/10 bg-white/80 shadow-sm ${
        interactive
          ? "transition-all duration-150 ease-out hover:shadow-md hover:border-wood/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm"
          : ""
      } ${className}`}
      {...props}
    />
  );
}

export function CardLink({
  className = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={`block rounded-2xl border border-ink/10 bg-white/80 shadow-sm transition-all duration-150 ease-out hover:shadow-md hover:border-wood/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm focus-visible:outline-2 focus-visible:outline-wood ${className}`}
      {...props}
    />
  );
}
