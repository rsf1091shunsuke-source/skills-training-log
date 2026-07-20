// 秒数 <-> "H:MM:SS" 表示の相互変換

export function secondsToClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// "mm:ss" または "h:mm:ss" の入力文字列を秒数に変換
export function clockToSeconds(input: string): number {
  if (!input) return 0;
  const parts = input
    .trim()
    .split(":")
    .map((p) => parseInt(p, 10))
    .filter((n) => !Number.isNaN(n));
  if (parts.length === 0) return 0;
  if (parts.length === 1) return parts[0] * 60; // 分のみ入力された場合
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}
