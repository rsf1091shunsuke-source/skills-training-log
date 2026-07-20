type Tone = "neutral" | "active" | "pending" | "done";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-ink/10 text-ink-soft",
  active: "bg-wood text-paper",
  pending: "bg-amber-soft text-ink",
  done: "bg-ink text-paper",
};

export default function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
