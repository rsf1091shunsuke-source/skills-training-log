"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentYearId, listParticipants, listYears } from "@/lib/data";
import { Participant, YearDoc } from "@/lib/types";
import SumiLine from "@/components/SumiLine";

export default function Home() {
  const [years, setYears] = useState<YearDoc[]>([]);
  const [yearId, setYearId] = useState<string>("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [ys, currentId] = await Promise.all([
          listYears(),
          getCurrentYearId(),
        ]);
        setYears(ys);
        const initial = currentId || ys[0]?.id || "";
        setYearId(initial);
      } catch (e) {
        console.error(e);
        setError(
          "データを読み込めませんでした。Firebaseの設定(.env.local)を確認してください。"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!yearId) return;
    listParticipants(yearId).then(setParticipants).catch(console.error);
  }, [yearId]);

  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-3xl px-4 pt-14 pb-8">
        <p className="text-xs tracking-[0.35em] text-wood-dark font-bold">
          SKILL TRAINING LOG
        </p>
        <h1 className="font-display text-4xl md:text-5xl mt-2 text-ink">
          作業時間記録
        </h1>
        <p className="mt-3 text-ink-soft leading-relaxed">
          原寸図・削り・墨付け・加工・組立 ── 工程ごとの練習タイムと、
          日々の気づきを記録する。
        </p>
      </header>

      <div className="mx-auto max-w-3xl px-4">
        <SumiLine label="選手として見る" />

        {years.length > 1 && (
          <div className="mb-4">
            <label className="text-sm text-ink-soft mr-2">年度</label>
            <select
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
              className="border border-ink/20 bg-white/60 rounded px-2 py-1 text-sm"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && <p className="text-ink-soft text-sm">読み込み中…</p>}
        {error && (
          <p className="text-chalk text-sm bg-chalk-soft/60 border border-chalk/30 rounded px-3 py-2">
            {error}
          </p>
        )}

        {!loading && !error && participants.length === 0 && (
          <p className="text-ink-soft text-sm">
            まだ選手が登録されていません。管理者ページから登録してください。
          </p>
        )}

        <ul className="grid gap-2 mb-12">
          {participants.map((p) => (
            <li key={p.id}>
              <Link
                href={`/view/${p.id}?year=${yearId}`}
                className="flex items-center justify-between border border-ink/15 bg-white/50 hover:bg-white/80 hover:border-wood transition-colors rounded px-4 py-3"
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-wood-dark text-sm">記録を見る →</span>
              </Link>
            </li>
          ))}
        </ul>

        <SumiLine label="指導者の方へ" />
        <Link
          href="/admin"
          className="inline-block text-sm text-ink-soft underline decoration-wood decoration-2 underline-offset-4 hover:text-ink mb-16"
        >
          管理者としてログイン
        </Link>
      </div>
    </div>
  );
}
