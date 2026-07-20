"use client";

import { secondsToClock, clockToSeconds } from "@/lib/time";

export default function TimeInput({
  label,
  seconds,
  onChange,
}: {
  label: string;
  seconds: number;
  onChange: (seconds: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-ink-soft">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        placeholder="分:秒"
        defaultValue={seconds ? secondsToClock(seconds) : ""}
        onBlur={(e) => onChange(clockToSeconds(e.target.value))}
        className="border border-ink/20 rounded px-2 py-1.5 text-sm bg-white tabular w-full"
      />
    </label>
  );
}
