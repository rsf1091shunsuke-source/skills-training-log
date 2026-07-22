"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  getCurrentYearId,
  getYear,
  listParticipants,
  listRecords,
  listYears,
} from "@/lib/data";
import { Participant, ProcessDef, YearDoc } from "@/lib/types";
import { secondsToClock } from "@/lib/time";
import Header from "@/components/Header";
import SumiLine from "@/components/SumiLine";

interface BestEntry {
  participant: Participant;
  seconds: number;
}

export default function RankingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <Header title="工程別ランキング" subtitle="みんなの自己ベストで比較" />
          <p className="text-ink-soft text-sm px-5 py-8">読み込み中…</p>
        </div>
      }
    >
      <RankingContent />
    </Suspense>
  );
}

function RankingContent() {
  const searchParams = useSearchParams();
  const paramYear = searchParams.get("year") || "";

  const [years, setYears] = useState<YearDoc[]>([]);
  const [yearId, setYearId] = useState(paramYear);
  const [year, setYear] = useState<YearDoc | null>(null);
  const [ranking, setRanking] = useState<Record<string, BestEntry[]>>({});
  const [loading, setLoading] = useState(true);

  const processDefs: ProcessDef[] = year?.processes ?? [];

  useEffect(() => {
    (async () => {
      const [ys, currentId] = await Promise.all([listYears(), getCurrentYearId()]);
      setYears(ys);
      if (!yearId) setYearId(paramYear || currentId || ys[0]?.id || "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!yearId) return;
    setLoading(true);
    (async () => {
      const y = await getYear(yearId);
      setYear(y);
      const participants = await listParticipants(yearId);
      const allRecords = await Promise.all(
        participants.map((p) => listRecords(yearId, p.id))
      );

      const best: Record<string, BestEntry[]> = {};
      (y?.processes ?? []).forEach((def) => {
        const entries: BestEntry[] = [];
        participants.forEach((p, i) => {
          const records = allRecords[i];
          const times = records
            .map((r) => r.processes[def.id])
            .filter((s): s is number => !!s && s > 0);
          if (times.length > 0) {
            entries.push({ participant: p, seconds: Math.min(...times) });
          }
        });
        entries.sort((a, b) => a.seconds - b.seconds);
        best[def.id] = entries;
      });
      setRanking(best);
      setLoading(false);
    })();
  }, [yearId]);

  return (
    <div className="min-h-screen">
      <Header title="工程別ランキング" subtitle="みんなの自己ベストで比較" />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {years.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {years.map((y) => (
              <button
                key={y.id}
                onClick={() => setYearId(y.id)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  y.id === yearId
                    ? "bg-ink text-paper border-ink"
                    : "border-ink/15 text-ink-soft hover:border-wood hover:text-ink"
                }`}
              >
                {y.label}
              </button>
            ))}
          </div>
        )}

        {loading && <p className="text-ink-soft text-sm">読み込み中…</p>}

        {!loading && processDefs.length === 0 && (
          <p className="text-ink-soft text-sm">データがありません。</p>
        )}

        {!loading &&
          processDefs.map((def) => (
            <section key={def.id} className="mb-10">
              <SumiLine label={def.label} />
              {def.targetSeconds && (
                <p className="text-xs text-chalk mb-2">
                  目標タイム: {secondsToClock(def.targetSeconds)}
                </p>
              )}
              <ol className="grid gap-1.5">
                {(ranking[def.id] ?? []).map((entry, i) => (
                  <li
                    key={entry.participant.id}
                    className="flex items-center gap-3 border border-ink/10 bg-white/60 rounded-lg px-3 py-2"
                  >
                    <span className="w-6 text-sm font-bold text-ink-soft tabular text-right">
                      {i + 1}
                    </span>
                    <span
                      aria-hidden
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        background: entry.participant.color || "#0071e3",
                      }}
                    />
                    <Link
                      href={`/view/${entry.participant.id}?year=${yearId}`}
                      className="flex-1 font-medium hover:text-wood truncate"
                    >
                      {entry.participant.name}
                    </Link>
                    <span className="tabular font-bold text-ink">
                      {secondsToClock(entry.seconds)}
                    </span>
                  </li>
                ))}
                {(ranking[def.id] ?? []).length === 0 && (
                  <p className="text-ink-soft text-sm py-2">まだ記録がありません。</p>
                )}
              </ol>
            </section>
          ))}
      </main>
    </div>
  );
}
