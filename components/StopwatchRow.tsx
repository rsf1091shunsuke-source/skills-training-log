"use client";

import { KeyboardEvent } from "react";
import { Participant, ProcessDef } from "@/lib/types";
import { TimerState } from "@/lib/hooks/useStopwatchTimers";
import { secondsToClock } from "@/lib/time";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const STATUS_BAR_CLASS: Record<TimerState["status"], string> = {
  idle: "bg-ink/15",
  running: "bg-wood",
  saving: "bg-amber",
  done: "bg-ink",
};

export default function StopwatchRow({
  index,
  participant,
  timer,
  processDefs,
  remainingDefs,
  elapsed,
  mergedProcessSeconds,
  onStart,
  onLap,
  onUndo,
  onReset,
  onPause,
  onNoteChange,
  onEditSessionNote,
}: {
  index: number;
  participant: Participant;
  timer: TimerState;
  processDefs: ProcessDef[];
  remainingDefs: ProcessDef[];
  elapsed: number;
  mergedProcessSeconds: Record<string, number>;
  onStart: () => void;
  onLap: () => void;
  onUndo: () => void;
  onReset: () => void;
  onPause: () => void;
  onNoteChange: (note: string) => void;
  onEditSessionNote: (index: number, note: string) => void;
}) {
  const sessionDoneCount = timer.lapTimestamps.length;
  const currentDef = remainingDefs[sessionDoneCount];
  const isRunning = timer.status === "running";
  const isSaving = timer.status === "saving";
  const totalDoneCount = (timer.carried?.completedCount ?? 0) + sessionDoneCount;
  const isResumable = timer.status === "idle" && !!timer.carried;

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const isTextInput = target.tagName === "INPUT";

    if (e.key === "Enter") {
      e.preventDefault();
      if (timer.status === "idle") onStart();
      else if (isRunning) onLap();
    } else if (e.key === "Backspace" && !isTextInput) {
      e.preventDefault();
      onUndo();
    }
  }

  function handleReset() {
    if (
      window.confirm(
        `${participant.name}さんの未保存の計測を破棄します。よろしいですか?`
      )
    ) {
      onReset();
    }
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="group flex flex-wrap items-center gap-3 rounded-lg border border-ink/15 bg-white/50 pl-0 pr-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-wood"
    >
      <span className={`w-1.5 self-stretch rounded-full ${STATUS_BAR_CLASS[timer.status]}`} />

      <span className="w-6 text-xs tabular text-ink-soft text-right shrink-0">
        {index + 1}
      </span>

      <span className="w-24 md:w-28 font-bold shrink-0 truncate">
        {participant.name}
      </span>

      {timer.status === "idle" && (
        <div className="flex-1 flex items-center justify-end gap-2">
          {isResumable && (
            <span className="text-xs text-amber">
              {totalDoneCount}工程完了済み・続きから
            </span>
          )}
          <Button variant="secondary" onClick={onStart}>
            {isResumable ? "続きから開始" : "開始"}
          </Button>
        </div>
      )}

      {(isRunning || isSaving) && (
        <>
          <span className="w-20 shrink-0">
            <Badge tone={isSaving ? "pending" : "active"}>
              {isSaving ? "保存中" : currentDef?.label ?? "―"}
            </Badge>
          </span>

          <span className="tabular font-display text-2xl w-20 shrink-0 text-ink">
            {secondsToClock(elapsed)}
          </span>

          <input
            type="text"
            value={timer.currentNote}
            onChange={(e) => onNoteChange(e.target.value)}
            disabled={isSaving}
            placeholder={`${currentDef?.label ?? ""}のメモ`}
            aria-label={`${participant.name}・${currentDef?.label ?? ""}のメモ`}
            className="flex-1 min-w-[80px] border border-ink/20 rounded px-2 py-1 text-sm bg-white disabled:opacity-50"
          />

          <div className="flex gap-1.5 shrink-0">
            <Button
              onClick={onLap}
              disabled={isSaving}
              aria-label={`${participant.name}のラップ`}
            >
              ラップ
            </Button>
            <Button
              variant="ghost"
              onClick={onUndo}
              disabled={sessionDoneCount === 0 || isSaving}
              aria-label={`${participant.name}の直前のラップを取消`}
            >
              取消
            </Button>
            <Button
              variant="ghost"
              onClick={onPause}
              disabled={sessionDoneCount === 0 || isSaving}
              aria-label={`${participant.name}をここで一時中断`}
              title="ここまでで一時中断し、続きは別の日に計測する"
            >
              中断
            </Button>
          </div>
        </>
      )}

      {timer.status === "done" && (
        <div className="flex-1 flex items-center justify-end gap-3">
          <div className="hidden md:flex flex-wrap gap-1 justify-end">
            {processDefs.map((def) => (
              <span
                key={def.id}
                className="text-xs tabular bg-ink/5 rounded px-1.5 py-0.5 text-ink-soft"
              >
                {def.label} {secondsToClock(mergedProcessSeconds[def.id] || 0)}
              </span>
            ))}
          </div>
          <Badge tone="done">
            合計{" "}
            {secondsToClock(
              processDefs.reduce(
                (acc, def) => acc + (mergedProcessSeconds[def.id] || 0),
                0
              )
            )}
          </Badge>
        </div>
      )}

      {/* 今回のセッションで完了した工程:時間 + メモを後から編集可能 */}
      {sessionDoneCount > 0 && (isRunning || isSaving) && (
        <ul className="w-full grid gap-1 pl-9">
          {remainingDefs.slice(0, sessionDoneCount).map((def, i) => (
            <li key={def.id} className="flex items-center gap-2 text-xs">
              <span className="text-ink-soft w-20 shrink-0">{def.label}</span>
              <span className="tabular text-ink w-14 shrink-0">
                {secondsToClock(
                  mergedProcessSeconds[def.id] ?? 0
                )}
              </span>
              <input
                type="text"
                value={timer.lapNotes[i] ?? ""}
                onChange={(e) => onEditSessionNote(i, e.target.value)}
                placeholder="メモを追記"
                aria-label={`${participant.name}・${def.label}のメモを編集`}
                className="flex-1 border border-ink/15 rounded px-2 py-0.5 bg-white/70"
              />
            </li>
          ))}
        </ul>
      )}

      {timer.status !== "idle" && (
        <Button
          variant="danger"
          onClick={handleReset}
          aria-label={`${participant.name}の計測をリセット`}
        >
          リセット
        </Button>
      )}
    </div>
  );
}
