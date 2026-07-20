"use client";

import { useEffect, useRef, useState } from "react";
import {
  addRecord,
  clearInProgressRecord,
  getInProgressRecord,
  saveInProgressRecord,
} from "@/lib/data";
import { Participant, ProcessDef, ProcessSeconds } from "@/lib/types";

export type TimerStatus = "idle" | "running" | "saving" | "done";

export interface CarriedProgress {
  day: 1 | 2;
  date: string;
  processes: ProcessSeconds;
  notes: Record<string, string>;
  completedCount: number; // 前回までに完了した工程数(先頭からの連続分)
}

export interface TimerState {
  status: TimerStatus;
  startedAt: number | null;
  lapTimestamps: number[]; // 今回のセッションで完了した工程の時刻
  lapNotes: string[]; // 今回のセッション分のメモ(lapTimestampsと同じ長さ)
  currentNote: string;
  carried: CarriedProgress | null; // 前回(別の日)までの進行状況
}

function initialTimer(carried: CarriedProgress | null = null): TimerState {
  return {
    status: "idle",
    startedAt: null,
    lapTimestamps: [],
    lapNotes: [],
    currentNote: "",
    carried,
  };
}

function remainingDefs(t: TimerState, processDefs: ProcessDef[]): ProcessDef[] {
  return processDefs.slice(t.carried?.completedCount ?? 0);
}

// 今回のセッション分のみの工程別秒数
function sessionProcessSeconds(
  t: TimerState,
  processDefs: ProcessDef[]
): ProcessSeconds {
  const defs = remainingDefs(t, processDefs);
  const result: ProcessSeconds = {};
  if (!t.startedAt) return result;
  let prev = t.startedAt;
  t.lapTimestamps.forEach((ts, i) => {
    const def = defs[i];
    if (!def) return;
    result[def.id] = Math.round((ts - prev) / 1000);
    prev = ts;
  });
  return result;
}

function sessionProcessNotes(t: TimerState, processDefs: ProcessDef[]) {
  const defs = remainingDefs(t, processDefs);
  const result: Record<string, string> = {};
  t.lapNotes.forEach((note, i) => {
    const def = defs[i];
    if (!def || !note.trim()) return;
    result[def.id] = note.trim();
  });
  return result;
}

// 前回までの分 + 今回のセッション分を合算(表示・保存用)
function mergedProcessSeconds(
  t: TimerState,
  processDefs: ProcessDef[]
): ProcessSeconds {
  return { ...(t.carried?.processes ?? {}), ...sessionProcessSeconds(t, processDefs) };
}

function mergedProcessNotes(t: TimerState, processDefs: ProcessDef[]) {
  return { ...(t.carried?.notes ?? {}), ...sessionProcessNotes(t, processDefs) };
}

export function useStopwatchTimers({
  yearId,
  participants,
  processDefs,
  day,
  date,
}: {
  yearId: string;
  participants: Participant[];
  processDefs: ProcessDef[];
  day: 1 | 2;
  date: string;
}) {
  const [timers, setTimers] = useState<Record<string, TimerState>>({});
  const [, setTick] = useState(0);
  const savingRef = useRef<Set<string>>(new Set());

  // 選手が変わったらタイマーを初期化し、前回の進行中データを読み込む
  useEffect(() => {
    if (!yearId) return;
    let cancelled = false;
    (async () => {
      const init: Record<string, TimerState> = {};
      participants.forEach((p) => (init[p.id] = initialTimer()));
      setTimers(init);

      const results = await Promise.all(
        participants.map((p) => getInProgressRecord(yearId, p.id))
      );
      if (cancelled) return;
      setTimers((prev) => {
        const next = { ...prev };
        participants.forEach((p, i) => {
          const rec = results[i];
          if (rec) {
            next[p.id] = initialTimer({
              day: rec.day,
              date: rec.date,
              processes: rec.processes,
              notes: rec.processNotes ?? {},
              completedCount: rec.completedProcessIds.length,
            });
          }
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, yearId]);

  // 1秒ごとに再描画(実行中のタイマーがある時だけ)
  useEffect(() => {
    const hasRunning = Object.values(timers).some(
      (t) => t.status === "running"
    );
    if (!hasRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [timers]);

  function startAll() {
    const now = Date.now();
    setTimers((prev) => {
      const next = { ...prev };
      participants.forEach((p) => {
        const t = next[p.id];
        if (t && t.status === "idle") {
          next[p.id] = {
            ...t,
            status: "running",
            startedAt: now,
            lapTimestamps: [],
            lapNotes: [],
            currentNote: "",
          };
        }
      });
      return next;
    });
  }

  function startOne(id: string) {
    setTimers((prev) => {
      const t = prev[id];
      return {
        ...prev,
        [id]: {
          ...(t ?? initialTimer()),
          status: "running",
          startedAt: Date.now(),
          lapTimestamps: [],
          lapNotes: [],
          currentNote: "",
        },
      };
    });
  }

  function lap(id: string) {
    setTimers((prev) => {
      const t = prev[id];
      if (!t || t.status !== "running") return prev;
      const defs = remainingDefs(t, processDefs);
      const lapTimestamps = [...t.lapTimestamps, Date.now()];
      const lapNotes = [...t.lapNotes, t.currentNote];
      const done = lapTimestamps.length >= defs.length;
      return {
        ...prev,
        [id]: {
          ...t,
          lapTimestamps,
          lapNotes,
          currentNote: "",
          status: done ? "saving" : "running",
        },
      };
    });
  }

  function undoLap(id: string) {
    setTimers((prev) => {
      const t = prev[id];
      if (!t || t.lapTimestamps.length === 0) return prev;
      const restoredNote = t.lapNotes[t.lapNotes.length - 1] ?? "";
      return {
        ...prev,
        [id]: {
          ...t,
          lapTimestamps: t.lapTimestamps.slice(0, -1),
          lapNotes: t.lapNotes.slice(0, -1),
          currentNote: restoredNote,
          status: "running",
        },
      };
    });
  }

  function setCurrentNote(id: string, note: string) {
    setTimers((prev) => {
      const t = prev[id];
      if (!t) return prev;
      return { ...prev, [id]: { ...t, currentNote: note } };
    });
  }

  // 完了済み(今回のセッション分)のメモを後から編集する
  function editSessionNote(id: string, index: number, note: string) {
    setTimers((prev) => {
      const t = prev[id];
      if (!t || !t.lapNotes[index]) {
        if (!t) return prev;
      }
      const lapNotes = [...t.lapNotes];
      lapNotes[index] = note;
      return { ...prev, [id]: { ...t, lapNotes } };
    });
  }

  function resetOne(id: string) {
    setTimers((prev) => ({ ...prev, [id]: initialTimer(prev[id]?.carried ?? null) }));
  }

  // 実行中の選手だけ、まとめて計測を中止(未保存分は破棄)
  function resetAllRunning() {
    setTimers((prev) => {
      const next = { ...prev };
      Object.entries(prev).forEach(([id, t]) => {
        if (t.status === "running") {
          next[id] = initialTimer(t.carried);
        }
      });
      return next;
    });
  }

  // 途中まで(工程の切れ目)で一時中断し、続きは別の日に計測する
  async function pauseAndSave(id: string) {
    const t = timers[id];
    if (!t || t.lapTimestamps.length === 0) return;
    const processes = mergedProcessSeconds(t, processDefs);
    const notes = mergedProcessNotes(t, processDefs);
    const completedCount =
      (t.carried?.completedCount ?? 0) + t.lapTimestamps.length;
    const recordDay = t.carried?.day ?? day;
    const recordDate = t.carried?.date ?? date;

    await saveInProgressRecord(yearId, id, {
      day: recordDay,
      date: recordDate,
      processes,
      processNotes: notes,
      completedProcessIds: processDefs.slice(0, completedCount).map((d) => d.id),
    });

    setTimers((prev) => ({
      ...prev,
      [id]: initialTimer({
        day: recordDay,
        date: recordDate,
        processes,
        notes,
        completedCount,
      }),
    }));
  }

  // status が saving になった選手を自動保存(全工程完了)
  useEffect(() => {
    if (processDefs.length === 0) return;
    Object.entries(timers).forEach(([id, t]) => {
      if (t.status === "saving" && !savingRef.current.has(id)) {
        savingRef.current.add(id);
        const processes = mergedProcessSeconds(t, processDefs);
        const processNotes = mergedProcessNotes(t, processDefs);
        const recordDay = t.carried?.day ?? day;
        const recordDate = t.carried?.date ?? date;

        addRecord(yearId, id, {
          day: recordDay,
          date: recordDate,
          processes,
          ...(Object.keys(processNotes).length > 0 ? { processNotes } : {}),
        })
          .then(() => clearInProgressRecord(yearId, id).catch(() => {}))
          .then(() => {
            setTimers((prev) => ({
              ...prev,
              [id]: { ...prev[id], status: "done" },
            }));
          })
          .catch((e) => {
            console.error(e);
            alert(
              "記録の保存に失敗しました。通信環境を確認してもう一度お試しください。"
            );
            setTimers((prev) => ({
              ...prev,
              [id]: { ...prev[id], status: "running" },
            }));
          })
          .finally(() => {
            savingRef.current.delete(id);
          });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timers, processDefs.length, yearId, day, date]);

  function elapsedSeconds(t: TimerState): number {
    const doneCount = t.lapTimestamps.length;
    const lastMark =
      doneCount > 0 ? t.lapTimestamps[doneCount - 1] : t.startedAt;
    if (t.status !== "running" || !lastMark) return 0;
    return Math.max(0, Math.floor((Date.now() - lastMark) / 1000));
  }

  return {
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
    remainingDefs: (t: TimerState) => remainingDefs(t, processDefs),
    mergedProcessSeconds: (t: TimerState) => mergedProcessSeconds(t, processDefs),
  };
}
