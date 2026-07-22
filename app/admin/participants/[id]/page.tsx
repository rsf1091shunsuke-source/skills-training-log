"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  addMemo,
  addRecord,
  deleteMemo,
  deleteRecord,
  getParticipant,
  getYear,
  listMemos,
  listRecords,
} from "@/lib/data";
import {
  Memo,
  Participant,
  PracticeRecord,
  ProcessDef,
  ProcessSeconds,
  YearDoc,
  emptyProcessSeconds,
  sumProcessSeconds,
  noteList,
} from "@/lib/types";
import { secondsToClock } from "@/lib/time";
import TimeInput from "@/components/TimeInput";
import SumiLine from "@/components/SumiLine";

export default function ParticipantAdminPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const yearId = searchParams.get("year") || "";

  const [year, setYear] = useState<YearDoc | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [busy, setBusy] = useState(false);

  const processDefs: ProcessDef[] = year?.processes ?? [];

  // 記録入力フォームの状態
  const [day, setDay] = useState<number>(1);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [processes, setProcesses] = useState<ProcessSeconds>({});
  const [deviationMm, setDeviationMm] = useState("");
  const [note, setNote] = useState("");

  // メモ入力フォームの状態
  const [memoText, setMemoText] = useState("");
  const [memoDate, setMemoDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  async function reload() {
    if (!yearId || !id) return;
    const [y, p, r, m] = await Promise.all([
      getYear(yearId),
      getParticipant(yearId, id),
      listRecords(yearId, id),
      listMemos(yearId, id),
    ]);
    setYear(y);
    setParticipant(p);
    setRecords(r);
    setMemos(m);
    setProcesses(emptyProcessSeconds(y?.processes ?? []));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId, id]);

  async function handleAddRecord(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await addRecord(yearId, id, {
        day,
        date,
        processes,
        deviationMm: deviationMm ? Number(deviationMm) : null,
        note: note || undefined,
      });
      setProcesses(emptyProcessSeconds(processDefs));
      setDeviationMm("");
      setNote("");
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteRecord(recordId: string) {
    if (!window.confirm("この記録を削除しますか?")) return;
    await deleteRecord(yearId, id, recordId);
    await reload();
  }

  async function handleAddMemo(e: React.FormEvent) {
    e.preventDefault();
    if (!memoText.trim()) return;
    setBusy(true);
    try {
      await addMemo(yearId, id, memoDate, memoText.trim());
      setMemoText("");
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteMemo(memoId: string) {
    if (!window.confirm("このメモを削除しますか?")) return;
    await deleteMemo(yearId, id, memoId);
    await reload();
  }

  if (!yearId) {
    return (
      <p className="text-chalk text-sm">
        年度が指定されていません。管理画面トップから選手を選び直してください。
      </p>
    );
  }

  return (
    <div>
      <Link
        href="/admin"
        className="text-sm text-ink-soft hover:text-ink underline decoration-wood/50 underline-offset-4"
      >
        ← 選手一覧に戻る
      </Link>

      <h2 className="font-display text-3xl mt-2 mb-1">
        {participant?.name ?? "…"}
      </h2>
      <p className="text-xs text-ink-soft mb-8">
        <Link
          href={`/view/${id}?year=${yearId}`}
          className="underline decoration-wood decoration-2 underline-offset-4 hover:text-ink"
        >
          選手用の閲覧ページを見る →
        </Link>
      </p>

      <SumiLine label="本番形式の記録を追加" />
      <form
        onSubmit={handleAddRecord}
        className="border border-ink/15 bg-white/50 rounded-lg p-4 mb-10 grid gap-4"
      >
        <div className="flex flex-wrap gap-4 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">◯日目</span>
            <input
              type="number"
              min={1}
              value={day}
              onChange={(e) => setDay(Math.max(1, Number(e.target.value) || 1))}
              className="border border-ink/20 rounded px-2 py-1.5 text-sm bg-white w-16 tabular"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">実施日</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-ink/20 rounded px-2 py-1.5 text-sm bg-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">採点誤差(mm・任意)</span>
            <input
              type="number"
              step="0.1"
              value={deviationMm}
              onChange={(e) => setDeviationMm(e.target.value)}
              placeholder="例: 1.5"
              className="border border-ink/20 rounded px-2 py-1.5 text-sm bg-white w-32"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {processDefs.map((def) => (
            <TimeInput
              key={def.id}
              label={def.label}
              seconds={processes[def.id] || 0}
              onChange={(sec) =>
                setProcesses((prev) => ({ ...prev, [def.id]: sec }))
              }
            />
          ))}
          {processDefs.length === 0 && (
            <p className="text-ink-soft text-sm col-span-full">
              工程が設定されていません。
              <Link
                href={`/admin/processes?year=${yearId}`}
                className="underline decoration-wood decoration-2 underline-offset-4"
              >
                工程を設定する →
              </Link>
            </p>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-soft">この記録へのメモ(任意)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="border border-ink/20 rounded px-2 py-1.5 text-sm bg-white"
          />
        </label>

        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-soft">
            合計:{" "}
            <span className="tabular font-bold text-ink">
              {secondsToClock(sumProcessSeconds(processes))}
            </span>
          </p>
          <button
            disabled={busy || processDefs.length === 0}
            className="px-5 py-2 rounded text-sm bg-wood-dark text-paper hover:bg-ink transition-colors disabled:opacity-50"
          >
            記録を保存
          </button>
        </div>
      </form>

      <SumiLine label={`記録一覧(${records.length}件)`} />
      <div className="overflow-x-auto mb-10">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-ink-soft border-b border-ink/15">
              <th className="py-2 pr-3">日付</th>
              <th className="py-2 pr-3">区分</th>
              {processDefs.map((def) => (
                <th key={def.id} className="py-2 pr-3 text-right">
                  {def.label}
                </th>
              ))}
              <th className="py-2 pr-3 text-right">合計</th>
              <th className="py-2 pr-3 text-right">誤差</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-ink/10">
                <td className="py-2 pr-3 whitespace-nowrap">{r.date}</td>
                <td className="py-2 pr-3">{r.day}日目</td>
                {processDefs.map((def) => (
                  <td key={def.id} className="py-2 pr-3 text-right tabular">
                    {secondsToClock(r.processes[def.id] || 0)}
                    {noteList(r.processNotes?.[def.id]).length > 0 && (
                      <span className="block text-xs text-ink-soft text-right font-normal">
                        {noteList(r.processNotes?.[def.id]).join(" / ")}
                      </span>
                    )}
                  </td>
                ))}
                <td className="py-2 pr-3 text-right tabular font-bold">
                  {secondsToClock(r.totalSeconds)}
                </td>
                <td className="py-2 pr-3 text-right tabular">
                  {r.deviationMm != null ? `${r.deviationMm}mm` : "―"}
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleDeleteRecord(r.id)}
                    className="text-chalk hover:text-chalk/70 text-xs"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={processDefs.length + 5} className="py-4 text-ink-soft">
                  まだ記録がありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SumiLine label="気づき・良い点メモ" />
      <form onSubmit={handleAddMemo} className="flex flex-wrap gap-2 mb-4">
        <input
          type="date"
          value={memoDate}
          onChange={(e) => setMemoDate(e.target.value)}
          className="border border-ink/20 rounded px-2 py-1.5 text-sm bg-white"
        />
        <input
          type="text"
          value={memoText}
          onChange={(e) => setMemoText(e.target.value)}
          placeholder="練習を見て感じたこと・良い点など"
          className="border border-ink/20 rounded px-3 py-1.5 text-sm bg-white flex-1 min-w-[200px]"
        />
        <button
          disabled={busy}
          className="px-4 py-1.5 rounded text-sm bg-wood-dark text-paper hover:bg-ink transition-colors"
        >
          追加
        </button>
      </form>

      <ul className="grid gap-2 mb-16">
        {memos.map((m) => (
          <li
            key={m.id}
            className="border border-ink/15 bg-white/50 rounded px-4 py-3 flex justify-between gap-4"
          >
            <div>
              <p className="text-xs text-wood-dark mb-1">{m.date}</p>
              <p className="text-sm">{m.text}</p>
            </div>
            <button
              onClick={() => handleDeleteMemo(m.id)}
              className="text-chalk hover:text-chalk/70 text-xs self-start"
            >
              削除
            </button>
          </li>
        ))}
        {memos.length === 0 && (
          <p className="text-ink-soft text-sm">まだメモがありません。</p>
        )}
      </ul>
    </div>
  );
}
