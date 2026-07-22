export default function Avatar({
  name,
  color,
}: {
  name: string;
  color?: string;
}) {
  const initial = name.trim().charAt(0) || "?";
  return (
    <span
      aria-hidden
      className={
        color
          ? "flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm shrink-0"
          : "flex items-center justify-center w-10 h-10 rounded-full bg-wood-light text-wood-dark font-bold text-sm shrink-0"
      }
      style={color ? { background: `${color}26`, color } : undefined}
    >
      {initial}
    </span>
  );
}
