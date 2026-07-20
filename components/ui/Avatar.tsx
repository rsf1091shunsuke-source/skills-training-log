export default function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0) || "?";
  return (
    <span
      aria-hidden
      className="flex items-center justify-center w-10 h-10 rounded-full bg-wood-light text-wood-dark font-bold text-sm shrink-0"
    >
      {initial}
    </span>
  );
}
