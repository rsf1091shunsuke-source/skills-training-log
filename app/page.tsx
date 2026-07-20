"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentYearId, listParticipants, listYears } from "@/lib/data";
import { Participant, YearDoc } from "@/lib/types";
import { CardLink } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";

function ChevronIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ParticipantRowSkeleton() {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/60 h-[68px] animate-pulse" />
  );
}

export default function Home() {
  const [years, setYears] = useState<YearDoc[]>([]);
  const [yearId, setYearId] = useState<string>("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [participantsLoading, setParticipantsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [ys, currentId] = await Promise.all([
          listYears(),
          getCurrentYearId(),
        ]);
        setYears(ys);
        setYearId(currentId || ys[0]?.id || "");
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
    setParticipantsLoading(true);
    listParticipants(yearId)
      .then(setParticipants)
      .catch(console.error)
      .finally(() => setParticipantsLoading(false));
  }, [yearId]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-5 pt-16 pb-10">
        {/* ── ヘッダー(コンテキスト) ───────────────────── */}
        <header className="mb-10">
          <p className="text-xs tracking-[0.2em] text-wood font-bold mb-2">
            SKILL TRAINING LOG
          </p>
          <h1 className="font-display text-[2.25rem] leading-[1.15] font-bold text-ink mb-3">
            作業時間記録
          </h1>
          <p className="text-ink-soft leading-relaxed">
            原寸図・削り・墨付け・加工・組立 ── 工程ごとの練習タイムと、
            日々の気づきを記録します。
          </p>
        </header>

        {/* ── Secondary: 年度(複数ある時だけ、控えめに提示) ── */}
        {years.length > 1 && (
          <div className="flex items-center gap-2 mb-6" role="group" aria-label="年度を選択">
            {years.map((y) => {
              const active = y.id === yearId;
              return (
                <button
                  key={y.id}
                  onClick={() => setYearId(y.id)}
                  aria-pressed={active}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "bg-ink text-paper border-ink"
                      : "border-ink/15 text-ink-soft hover:border-wood hover:text-ink"
                  }`}
                >
                  {y.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Primary: 選手一覧(今日やるべきこと) ───────── */}
        <section aria-label="選手一覧">
          {error && (
            <p className="text-chalk text-sm bg-chalk-soft/60 border border-chalk/20 rounded-xl px-4 py-3 mb-4">
              {error}
            </p>
          )}

          {!loading && !error && years.length > 0 && participants.length === 0 && !participantsLoading && (
            <p className="text-ink-soft text-sm py-6">
              まだ選手が登録されていません。管理者ページから登録してください。
            </p>
          )}

          {!loading && !error && years.length === 0 && (
            <p className="text-ink-soft text-sm py-6">
              まだ年度が作成されていません。管理者ページから作成してください。
            </p>
          )}

          <ul className="grid gap-2.5">
            {(loading || participantsLoading) &&
              Array.from({ length: 4 }).map((_, i) => (
                <li key={i}>
                  <ParticipantRowSkeleton />
                </li>
              ))}

            {!loading &&
              !participantsLoading &&
              participants.map((p) => (
                <li key={p.id}>
                  <CardLink
                    href={`/view/${p.id}?year=${yearId}`}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <Avatar name={p.name} />
                    <span className="font-medium text-ink flex-1 truncate">
                      {p.name}
                    </span>
                    <span className="text-ink-soft/60">
                      <ChevronIcon />
                    </span>
                  </CardLink>
                </li>
              ))}
          </ul>
        </section>

        {/* ── Supporting: 指導者ログイン(毎日は使わない導線) ── */}
        <div className="mt-16 pt-6 border-t border-ink/8">
          <Link
            href="/admin"
            className="text-sm text-ink-soft/70 hover:text-ink-soft transition-colors"
          >
            指導者としてログイン →
          </Link>
        </div>
      </div>
    </div>
  );
}
