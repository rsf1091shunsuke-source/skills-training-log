export default function SumiLine({ label }: { label?: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      {label && (
        <span className="font-display text-sm tracking-widest text-ink-soft whitespace-nowrap">
          {label}
        </span>
      )}
      <div className="sumi-line flex-1" />
    </div>
  );
}
