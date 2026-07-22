"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getParticipant, getYear, listMemos, listRecords } from "@/lib/data";
import {
  Memo,
  Participant,
  PracticeRecord,
  ProcessDef,
  YearDoc,
  noteList,
} from "@/lib/types";
import { secondsToClock } from "@/lib/time";
import Header from "@/components/Header";
import SumiLine from "@/components/SumiLine";
import ProcessRadarChart from "@/components/ProcessRadarChart";
import Link from "next/link";

export default function ViewPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const yearId = searchParams.get("year") || "";

  const [year, setYear] = useState<YearDoc | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);

  const processDefs: ProcessDef[] = year?.processes ?? [];

  useEffect(() => {
    if (!yearId || !id) return;
    (async () => {
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
      setLoading(false);
    })();
  }, [yearId, id]);

  const latest = records[0];

  return (
    <div className="min-h-screen">
      <Header title={participant?.name ?? "選手ページ"} subtitle="閲覧専用" />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading && <p className="text-ink-soft text-sm">読み込み中…</p>}

        {!loading && records.length === 0 && (
          <p className="text-ink-soft text-sm">まだ記録がありません。</p>
        )}

        {latest && (
          <>
            <SumiLine
              label={`直近の記録(${latest.date}・${latest.day}日目)`}
            />
            <ProcessRadarChart
              processDefs={processDefs}
              processes={latest.processes}
              color={participant?.color}
            />
            <p className="text-sm text-ink-soft mt-2">
              合計{" "}
              <span className="tabular font-bold text-ink">
                {secondsToClock(latest.totalSeconds)}
              </span>
              {latest.deviationMm != null && (
                <>
                  {" ／ 採点誤差 "}
                  <span className="tabular font-bold text-ink">
                    {latest.deviationMm}mm
                  </span>
                </>
              )}
            </p>
            <Link
              href={`/ranking?year=${yearId}`}
              className="inline-block mt-3 text-xs text-wood underline decoration-2 underline-offset-4"
            >
              みんなのランキングを見る →
            </Link>
          </>
        )}

        {records.length > 0 && (
          <>
            <SumiLine label={`過去の記録(${records.length}件)`} />
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {memos.length > 0 && (
          <>
            <SumiLine label="指導者からのメモ" />
            <ul className="grid gap-2 mb-10">
              {memos.map((m) => (
                <li
                  key={m.id}
                  className="border border-ink/15 bg-white/50 rounded px-4 py-3"
                >
                  <p className="text-xs text-wood-dark mb-1">{m.date}</p>
                  <p className="text-sm">{m.text}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
