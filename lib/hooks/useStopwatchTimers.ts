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
  day: number;
  date: string;
  processes: ProcessSeconds;
  notes: Record<string, string[]>;
  completedCount: number; // 前回までに完了した工程数(先頭からの連続分)
}

export interface TimerState {
  status: TimerStatus;
  startedAt: number | null;
  lapTimestamps: number[]; // 今回のセッションで完了した工程の時刻
  lapNotes: string[][]; // 今回のセッション分のメモ(工程ごとに複数)。lapTimestampsと同じ長さ
  currentNotes: string[]; // 計測中の工程について、これまでに追加したメモ
  currentNoteDraft: string; // 入力中(まだ追加していない)のメモ
  carried: CarriedProgress | null; // 前回(別の日)までの進行状況
}

function initialTimer(carried: CarriedProgress | null = null): TimerState {
  return {
    status: "idle",
    startedAt: null,
    lapTimestamps: [],
    lapNotes: [],
    currentNotes: [],
    currentNoteDraft: "",
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

function sessionProcessNotes(
  t: TimerState,
  processDefs: ProcessDef[]
): Record<string, string[]> {
  const defs = remainingDefs(t, processDefs);
  const result: Record<string, string[]> = {};
  t.lapNotes.forEach((notes, i) => {
    const def = defs[i];
    const cleaned = notes.map((n) => n.trim()).filter(Boolean);
    if (!def || cleaned.length === 0) return;
    result[def.id] = cleaned;
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

function mergedProcessNotes(
  t: TimerState,
  processDefs: ProcessDef[]
): Record<string, string[]> {
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
  day: number;
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
            currentNotes: [],
            currentNoteDraft: "",
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
          currentNotes: [],
          currentNoteDraft: "",
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
      const finalNotes = t.currentNoteDraft.trim()
        ? [...t.currentNotes, t.currentNoteDraft.trim()]
        : t.currentNotes;
      const lapNotes = [...t.lapNotes, finalNotes];
      const done = lapTimestamps.length >= defs.length;
      return {
        ...prev,
        [id]: {
          ...t,
          lapTimestamps,
          lapNotes,
          currentNotes: [],
          currentNoteDraft: "",
          status: done ? "saving" : "running",
        },
      };
    });
  }

  function undoLap(id: string) {
    setTimers((prev) => {
      const t = prev[id];
      if (!t || t.lapTimestamps.length === 0) return prev;
      const restoredNotes = t.lapNotes[t.lapNotes.length - 1] ?? [];
      return {
        ...prev,
        [id]: {
          ...t,
          lapTimestamps: t.lapTimestamps.slice(0, -1),
          lapNotes: t.lapNotes.slice(0, -1),
          currentNotes: restoredNotes,
          currentNoteDraft: "",
          status: "running",
        },
      };
    });
  }

  function setCurrentNoteDraft(id: string, draft: string) {
    setTimers((prev) => {
      const t = prev[id];
      if (!t) return prev;
      return { ...prev, [id]: { ...t, currentNoteDraft: draft } };
    });
  }

  // 計測中の工程に、メモをもう1件追加する
  function addCurrentNote(id: string) {
    setTimers((prev) => {
      const t = prev[id];
      if (!t || !t.currentNoteDraft.trim()) return prev;
      return {
        ...prev,
        [id]: {
          ...t,
          currentNotes: [...t.currentNotes, t.currentNoteDraft.trim()],
          currentNoteDraft: "",
        },
      };
    });
  }

  function removeCurrentNote(id: string, index: number) {
    setTimers((prev) => {
      const t = prev[id];
      if (!t) return prev;
      return {
        ...prev,
        [id]: {
          ...t,
          currentNotes: t.currentNotes.filter((_, i) => i !== index),
        },
      };
    });
  }

  // 今回のセッションで完了した工程に、メモを後から追加/削除する
  function addSessionNote(id: string, processIndex: number, note: string) {
    if (!note.trim()) return;
    setTimers((prev) => {
      const t = prev[id];
      if (!t) return prev;
      const lapNotes = t.lapNotes.map((notes, i) =>
        i === processIndex ? [...notes, note.trim()] : notes
      );
      return { ...prev, [id]: { ...t, lapNotes } };
    });
  }

  function removeSessionNote(
    id: string,
    processIndex: number,
    noteIndex: number
  ) {
    setTimers((prev) => {
      const t = prev[id];
      if (!t) return prev;
      const lapNotes = t.lapNotes.map((notes, i) =>
        i === processIndex ? notes.filter((_, ni) => ni !== noteIndex) : notes
      );
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
    setCurrentNoteDraft,
    addCurrentNote,
    removeCurrentNote,
    addSessionNote,
    removeSessionNote,
    resetOne,
    resetAllRunning,
    pauseAndSave,
    elapsedSeconds,
    remainingDefs: (t: TimerState) => remainingDefs(t, processDefs),
    mergedProcessSeconds: (t: TimerState) => mergedProcessSeconds(t, processDefs),
  };
}
