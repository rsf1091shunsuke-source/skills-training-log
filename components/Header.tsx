import Link from "next/link";

export default function Header({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="border-b border-ink/10 bg-paper/95 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="group">
          <p className="text-xs tracking-[0.3em] text-wood-dark font-bold">
            SKILL TRAINING LOG
          </p>
          <h1 className="font-display text-xl md:text-2xl leading-tight text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-ink-soft mt-0.5">{subtitle}</p>
          )}
        </Link>
        {right}
      </div>
    </header>
  );
}
