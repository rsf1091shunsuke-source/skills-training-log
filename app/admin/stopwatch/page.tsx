"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getYear, listParticipants } from "@/lib/data";
import { Participant, ProcessDef, YearDoc } from "@/lib/types";
import SumiLine from "@/components/SumiLine";
import StopwatchRow from "@/components/StopwatchRow";
import Button from "@/components/ui/Button";
import { useStopwatchTimers } from "@/lib/hooks/useStopwatchTimers";

export default function StopwatchPage() {
  const searchParams = useSearchParams();
  const yearId = searchParams.get("year") || "";

  const [year, setYear] = useState<YearDoc | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [day, setDay] = useState<1 | 2>(1);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const processDefs: ProcessDef[] = year?.processes ?? [];

  useEffect(() => {
    if (!yearId) return;
    Promise.all([getYear(yearId), listParticipants(yearId)]).then(
      ([y, ps]) => {
        setYear(y);
        setParticipants(ps);
      }
    );
  }, [yearId]);

  const {
    timers,
    startAll,
    startOne,
    lap,
    undoLap,
    setCurrentNote,
    editSessionNote,
    resetOne,
    resetAllRunning,
    pauseAndSave,
    elapsedSeconds,
    remainingDefs,
    mergedProcessSeconds,
  } = useStopwatchTimers({ yearId, participants, processDefs, day, date });

  const doneCount = Object.values(timers).filter(
    (t) => t.status === "done"
  ).length;
  const runningCount = Object.values(timers).filter(
    (t) => t.status === "running"
  ).length;

  function handleStopAll() {
    if (runningCount === 0) return;
    if (
      window.confirm(
        `計測中の${runningCount}人分の未保存の計測を中止します。よろしいですか?(一時中断ではなく破棄です)`
      )
    ) {
      resetAllRunning();
    }
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

      <div className="flex items-baseline justify-between mt-2 mb-6 flex-wrap gap-2">
        <h2 className="font-display text-3xl">一括ストップウォッチ計測</h2>
        {participants.length > 0 && (
          <span className="text-sm text-ink-soft tabular">
            完了 {doneCount} / {participants.length}
          </span>
        )}
      </div>

      {processDefs.length === 0 ? (
        <p className="text-chalk text-sm bg-chalk-soft/60 border border-chalk/30 rounded px-3 py-2 mb-6">
          工程が設定されていません。
          <Link
            href={`/admin/processes?year=${yearId}`}
            className="underline decoration-2 underline-offset-4 ml-1"
          >
            工程を設定してください →
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-4 mb-6 border border-ink/15 bg-white/50 rounded-lg p-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">区分</span>
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value) as 1 | 2)}
              className="border border-ink/20 rounded px-2 py-1.5 text-sm bg-white"
            >
              <option value={1}>1日目</option>
              <option value={2}>2日目</option>
            </select>
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
          <Button variant="primary" onClick={startAll} className="font-bold">
            全員を一括スタート
          </Button>
          <Button
            variant="ghost"
            onClick={handleStopAll}
            disabled={runningCount === 0}
          >
            全員一括ストップ
          </Button>
          <p className="text-xs text-ink-soft max-w-xs">
            ラップ順:「{processDefs.map((d) => d.label).join("→")}」
            <Link
              href={`/admin/processes?year=${yearId}`}
              className="underline decoration-wood decoration-2 underline-offset-4 ml-1"
            >
              変更
            </Link>
            <br />
            行にカーソルを合わせて <kbd className="border border-ink/30 rounded px-1">Enter</kbd> でラップ、
            <kbd className="border border-ink/30 rounded px-1">Backspace</kbd> で取消。
            「中断」で続きを別の日に計測できます。
          </p>
        </div>
      )}

      <SumiLine label={`計測(${participants.length}名)`} />

      <div className="grid gap-2">
        {participants.map((p, i) => {
          const t = timers[p.id];
          if (!t) return null;
          return (
            <StopwatchRow
              key={p.id}
              index={i}
              participant={p}
              timer={t}
              processDefs={processDefs}
              remainingDefs={remainingDefs(t)}
              elapsed={elapsedSeconds(t)}
              mergedProcessSeconds={mergedProcessSeconds(t)}
              onStart={() => startOne(p.id)}
              onLap={() => lap(p.id)}
              onUndo={() => undoLap(p.id)}
              onReset={() => resetOne(p.id)}
              onPause={() => pauseAndSave(p.id)}
              onNoteChange={(note) => setCurrentNote(p.id, note)}
              onEditSessionNote={(idx, note) => editSessionNote(p.id, idx, note)}
            />
          );
        })}
      </div>

      <p className="text-xs text-ink-soft mt-8 mb-16">
        ※このページを閉じたり再読み込みすると、保存前(中断もしていない)の計測中データは失われます。全工程分のラップを押し終えると自動的に保存されます。
      </p>
    </div>
  );
}
