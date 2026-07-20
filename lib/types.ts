// 工程は年度ごとに定義・並び替え可能(id は内部キー、label は表示名)
export interface ProcessDef {
  id: string;
  label: string;
  targetSeconds?: number; // 目標タイム(任意、管理者が設定)
}

export const DEFAULT_PROCESSES: ProcessDef[] = [
  { id: "genzu", label: "原寸図" },
  { id: "kezuri", label: "削り" },
  { id: "sumitsuke", label: "墨付け" },
  { id: "kakou", label: "加工" },
  { id: "kumitate", label: "組立" },
];

export interface YearDoc {
  id: string;
  label: string;
  processes: ProcessDef[];
  createdAt: number;
}

export interface Participant {
  id: string;
  name: string;
  order: number;
  createdAt: number;
}

// キーは ProcessDef.id
export type ProcessSeconds = Record<string, number>;

export interface PracticeRecord {
  id: string;
  day: 1 | 2;
  date: string; // YYYY-MM-DD
  processes: ProcessSeconds;
  processNotes?: Record<string, string>; // 工程ごとのメモ(ストップウォッチのラップ時に記入)
  totalSeconds: number;
  deviationMm?: number | null; // 採点時の誤差(mm) 任意入力
  note?: string;
  createdAt: number;
}

// 1日目に途中まで計測し、2日目に続きから計測するための一時保存データ
export interface InProgressRecord {
  day: 1 | 2;
  date: string; // 開始した日付
  processes: ProcessSeconds; // ここまでに完了した工程の時間
  processNotes?: Record<string, string>;
  completedProcessIds: string[]; // 完了済み工程idの順序(再開時にどこからか判定するため)
  updatedAt: number;
}

export interface Memo {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  createdAt: number;
}

export function emptyProcessSeconds(processes: ProcessDef[]): ProcessSeconds {
  const result: ProcessSeconds = {};
  processes.forEach((p) => (result[p.id] = 0));
  return result;
}

export function sumProcessSeconds(p: ProcessSeconds): number {
  return Object.values(p).reduce((acc, v) => acc + (v || 0), 0);
}

export function genProcessId(label: string, existing: ProcessDef[]): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9ぁ-んァ-ヶ一-龠]+/g, "") || "process";
  let id = base;
  let i = 2;
  const ids = new Set(existing.map((e) => e.id));
  while (ids.has(id)) {
    id = `${base}${i}`;
    i += 1;
  }
  return id;
}
