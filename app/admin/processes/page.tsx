"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getYear, updateYearProcesses } from "@/lib/data";
import { ProcessDef, YearDoc, genProcessId } from "@/lib/types";
import SumiLine from "@/components/SumiLine";

export default function ProcessesAdminPage() {
  const searchParams = useSearchParams();
  const yearId = searchParams.get("year") || "";

  const [year, setYear] = useState<YearDoc | null>(null);
  const [processes, setProcesses] = useState<ProcessDef[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!yearId) return;
    getYear(yearId).then((y) => {
      setYear(y);
      setProcesses(y?.processes ?? []);
    });
  }, [yearId]);

  async function save(next: ProcessDef[]) {
    setProcesses(next);
    setBusy(true);
    try {
      await updateYearProcesses(yearId, next);
      setSavedAt(Date.now());
    } finally {
      setBusy(false);
    }
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...processes];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    save(next);
  }

  function moveDown(index: number) {
    if (index === processes.length - 1) return;
    const next = [...processes];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    save(next);
  }

  function rename(index: number) {
    const current = processes[index];
    const label = window.prompt("工程名を編集", current.label);
    if (!label || label === current.label) return;
    const next = [...processes];
    next[index] = { ...current, label };
    save(next);
  }

  function remove(index: number) {
    const current = processes[index];
    if (
      !window.confirm(
        `「${current.label}」を削除しますか?過去の記録に保存済みのこの工程の時間データは残りますが、今後の入力・計測からは無くなります。`
      )
    )
      return;
    const next = processes.filter((_, i) => i !== index);
    save(next);
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const id = genProcessId(newLabel.trim(), processes);
    const next = [...processes, { id, label: newLabel.trim() }];
    setNewLabel("");
    save(next);
  }

  if (!yearId) {
    return (
      <p className="text-chalk text-sm">
        年度が指定されていません。管理画面トップから開き直してください。
      </p>
    );
  }

  return (
    <div>
      <Link
        href="/admin"
        className="text-sm text-ink-soft hover:text-ink underline decoration-wood/50 underline-offset-4"
      >
        ← 管理画面トップに戻る
      </Link>

      <h2 className="font-display text-3xl mt-2 mb-1">工程の設定</h2>
      <p className="text-xs text-ink-soft mb-8">
        {year?.label ?? "…"} の記録入力・ストップウォッチで使う工程の並び順です。ラップの順番もこの並びに従います。
      </p>

      <SumiLine label={`工程一覧(${processes.length})`} />

      <ul className="grid gap-2 mb-8">
        {processes.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center gap-3 border border-ink/15 bg-white/50 rounded px-4 py-3"
          >
            <span className="text-xs text-ink-soft w-6 tabular">{i + 1}</span>
            <span className="font-medium flex-1">{p.label}</span>
            <div className="flex gap-1">
              <button
                onClick={() => moveUp(i)}
                disabled={i === 0 || busy}
                className="px-2 py-1 text-xs border border-ink/20 rounded disabled:opacity-30 hover:border-wood"
                aria-label="上に移動"
              >
                ↑
              </button>
              <button
                onClick={() => moveDown(i)}
                disabled={i === processes.length - 1 || busy}
                className="px-2 py-1 text-xs border border-ink/20 rounded disabled:opacity-30 hover:border-wood"
                aria-label="下に移動"
              >
                ↓
              </button>
              <button
                onClick={() => rename(i)}
                disabled={busy}
                className="px-2 py-1 text-xs text-ink-soft hover:text-ink underline decoration-wood/50 underline-offset-4"
              >
                名前変更
              </button>
              <button
                onClick={() => remove(i)}
                disabled={busy}
                className="px-2 py-1 text-xs text-chalk hover:text-chalk/70"
              >
                削除
              </button>
            </div>
          </li>
        ))}
        {processes.length === 0 && (
          <p className="text-ink-soft text-sm">工程がまだありません。</p>
        )}
      </ul>

      <form onSubmit={add} className="flex gap-2 mb-4">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="新しい工程名(例: 検査)"
          className="border border-ink/20 rounded px-3 py-1.5 text-sm bg-white flex-1 max-w-xs"
        />
        <button
          disabled={busy}
          className="px-4 py-1.5 rounded text-sm bg-wood-dark text-paper hover:bg-ink transition-colors"
        >
          工程を追加
        </button>
      </form>

      {savedAt && (
        <p className="text-xs text-wood-dark">保存しました。</p>
      )}
    </div>
  );
}
