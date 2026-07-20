"use client";

import { useEffect, useRef, useState } from "react";
import { addRecord } from "@/lib/data";
import { Participant, ProcessDef, ProcessSeconds } from "@/lib/types";

export type TimerStatus = "idle" | "running" | "saving" | "done";

export interface TimerState {
  status: TimerStatus;
  startedAt: number | null;
  lapTimestamps: number[];
  lapNotes: string[];
  currentNote: string;
}

function initialTimer(): TimerState {
  return {
    status: "idle",
    startedAt: null,
    lapTimestamps: [],
    lapNotes: [],
    currentNote: "",
  };
}

function processSecondsFromTimer(
  t: TimerState,
  processDefs: ProcessDef[]
): ProcessSeconds {
  const result: ProcessSeconds = {};
  processDefs.forEach((d) => (result[d.id] = 0));
  if (!t.startedAt) return result;
  let prev = t.startedAt;
  t.lapTimestamps.forEach((ts, i) => {
    const def = processDefs[i];
    if (!def) return;
    result[def.id] = Math.round((ts - prev) / 1000);
    prev = ts;
  });
  return result;
}

function processNotesFromTimer(
  t: TimerState,
  processDefs: ProcessDef[]
): Record<string, string> {
  const result: Record<string, string> = {};
  t.lapNotes.forEach((note, i) => {
    const def = processDefs[i];
    if (!def || !note.trim()) return;
    result[def.id] = note.trim();
  });
  return result;
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

  // 選手が変わったらタイマーを初期化
  useEffect(() => {
    const init: Record<string, TimerState> = {};
    participants.forEach((p) => (init[p.id] = initialTimer()));
    setTimers(init);
  }, [participants]);

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
        if (next[p.id]?.status === "idle") {
          next[p.id] = {
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
    setTimers((prev) => ({
      ...prev,
      [id]: {
        status: "running",
        startedAt: Date.now(),
        lapTimestamps: [],
        lapNotes: [],
        currentNote: "",
      },
    }));
  }

  function lap(id: string) {
    setTimers((prev) => {
      const t = prev[id];
      if (!t || t.status !== "running") return prev;
      const lapTimestamps = [...t.lapTimestamps, Date.now()];
      const lapNotes = [...t.lapNotes, t.currentNote];
      const done = lapTimestamps.length >= processDefs.length;
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

  function resetOne(id: string) {
    setTimers((prev) => ({ ...prev, [id]: initialTimer() }));
  }

  // status が saving になった選手を自動保存
  useEffect(() => {
    if (processDefs.length === 0) return;
    Object.entries(timers).forEach(([id, t]) => {
      if (t.status === "saving" && !savingRef.current.has(id)) {
        savingRef.current.add(id);
        const processes = processSecondsFromTimer(t, processDefs);
        const processNotes = processNotesFromTimer(t, processDefs);
        addRecord(yearId, id, {
          day,
          date,
          processes,
          ...(Object.keys(processNotes).length > 0 ? { processNotes } : {}),
        })
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
    resetOne,
    elapsedSeconds,
    processSecondsFromTimer,
  };
}
