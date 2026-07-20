"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addParticipant,
  copyParticipantsFromYear,
  createYear,
  deleteParticipant,
  getCurrentYearId,
  listParticipants,
  listYears,
  setCurrentYearId,
  updateParticipant,
} from "@/lib/data";
import { Participant, YearDoc } from "@/lib/types";
import SumiLine from "@/components/SumiLine";

export default function AdminHome() {
  const [years, setYears] = useState<YearDoc[]>([]);
  const [currentYearId, setCurrentYearIdState] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newName, setNewName] = useState("");
  const [newYearLabel, setNewYearLabel] = useState("");
  const [copySourceYearId, setCopySourceYearId] = useState("");
  const [busy, setBusy] = useState(false);

  async function reloadYears() {
    const [ys, cur] = await Promise.all([listYears(), getCurrentYearId()]);
    setYears(ys);
    const active = cur || ys[0]?.id || "";
    setCurrentYearIdState(active);
  }

  async function reloadParticipants(yearId: string) {
    if (!yearId) return setParticipants([]);
    setParticipants(await listParticipants(yearId));
  }

  useEffect(() => {
    reloadYears();
  }, []);

  useEffect(() => {
    reloadParticipants(currentYearId);
  }, [currentYearId]);

  async function handleCreateYear(e: React.FormEvent) {
    e.preventDefault();
    if (!newYearLabel.trim()) return;
    setBusy(true);
    try {
      const id = await createYear(newYearLabel.trim());
      if (copySourceYearId) {
        await copyParticipantsFromYear(copySourceYearId, id);
      }
      await setCurrentYearId(id);
      setNewYearLabel("");
      await reloadYears();
    } finally {
      setBusy(false);
    }
  }

  async function handleSwitchYear(id: string) {
    setBusy(true);
    try {
      await setCurrentYearId(id);
      setCurrentYearIdState(id);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddParticipant(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !currentYearId) return;
    setBusy(true);
    try {
      await addParticipant(currentYearId, newName.trim(), participants.length);
      setNewName("");
      await reloadParticipants(currentYearId);
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(p: Participant) {
    const name = window.prompt("選手名を編集", p.name);
    if (!name || name === p.name) return;
    await updateParticipant(currentYearId, p.id, { name });
    await reloadParticipants(currentYearId);
  }

  async function handleDelete(p: Participant) {
    if (!window.confirm(`「${p.name}」を削除しますか?記録も全て削除されます。`))
      return;
    await deleteParticipant(currentYearId, p.id);
    await reloadParticipants(currentYearId);
  }

  async function handleCopyParticipants() {
    if (!copySourceYearId || !currentYearId) return;
    const sourceLabel = years.find((y) => y.id === copySourceYearId)?.label;
    if (
      !window.confirm(
        `「${sourceLabel}」の選手一覧を、この年度にコピーします。同じ名前が既にいても重複して追加されます。よろしいですか?`
      )
    )
      return;
    setBusy(true);
    try {
      await copyParticipantsFromYear(copySourceYearId, currentYearId);
      await reloadParticipants(currentYearId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SumiLine label="年度" />
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {years.map((y) => (
          <button
            key={y.id}
            onClick={() => handleSwitchYear(y.id)}
            disabled={busy}
            className={`px-3 py-1.5 rounded text-sm border transition-colors ${
              y.id === currentYearId
                ? "bg-ink text-paper border-ink"
                : "border-ink/20 text-ink-soft hover:border-wood"
            }`}
          >
            {y.label}
          </button>
        ))}
      </div>
      <form onSubmit={handleCreateYear} className="flex flex-wrap gap-2 mb-10 items-center">
        <input
          value={newYearLabel}
          onChange={(e) => setNewYearLabel(e.target.value)}
          placeholder="例: 2027年度"
          className="border border-ink/20 rounded px-3 py-1.5 text-sm bg-white flex-1 max-w-xs"
        />
        {years.length > 0 && (
          <select
            value={copySourceYearId}
            onChange={(e) => setCopySourceYearId(e.target.value)}
            className="border border-ink/20 rounded px-2 py-1.5 text-sm bg-white"
          >
            <option value="">選手はコピーしない</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                「{y.label}」の選手をコピー
              </option>
            ))}
          </select>
        )}
        <button
          disabled={busy}
          className="px-4 py-1.5 rounded text-sm bg-wood-dark text-paper hover:bg-ink transition-colors"
        >
          新しい年度を作成
        </button>
      </form>

      {currentYearId && (
        <div className="flex flex-wrap gap-3 mb-8">
          <Link
            href={`/admin/stopwatch?year=${currentYearId}`}
            className="inline-block px-4 py-2 rounded text-sm bg-wood text-paper hover:bg-wood-dark transition-colors font-bold"
          >
            ⏱ 一括ストップウォッチ計測を開く
          </Link>
          <Link
            href={`/admin/processes?year=${currentYearId}`}
            className="inline-block px-4 py-2 rounded text-sm border border-ink/20 text-ink-soft hover:border-wood hover:text-ink transition-colors"
          >
            工程の並び順・追加を編集
          </Link>
        </div>
      )}

      <SumiLine label={`選手一覧(${participants.length}名)`} />

      {years.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
          <span className="text-ink-soft">他の年度から選手をコピー:</span>
          <select
            value={copySourceYearId}
            onChange={(e) => setCopySourceYearId(e.target.value)}
            className="border border-ink/20 rounded px-2 py-1 bg-white"
          >
            <option value="">年度を選択</option>
            {years
              .filter((y) => y.id !== currentYearId)
              .map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
          </select>
          <button
            onClick={handleCopyParticipants}
            disabled={!copySourceYearId || busy}
            className="px-3 py-1 rounded border border-ink/20 text-ink-soft hover:border-wood hover:text-ink transition-colors disabled:opacity-40"
          >
            コピー
          </button>
        </div>
      )}

      <form onSubmit={handleAddParticipant} className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="選手名を入力"
          className="border border-ink/20 rounded px-3 py-1.5 text-sm bg-white flex-1 max-w-xs"
        />
        <button
          disabled={busy || !currentYearId}
          className="px-4 py-1.5 rounded text-sm bg-wood-dark text-paper hover:bg-ink transition-colors"
        >
          追加
        </button>
      </form>

      <ul className="grid gap-2">
        {participants.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between border border-ink/15 bg-white/50 rounded px-4 py-3"
          >
            <Link
              href={`/admin/participants/${p.id}?year=${currentYearId}`}
              className="font-medium hover:text-wood-dark flex-1"
            >
              {p.name}
            </Link>
            <div className="flex gap-3 text-sm">
              <button
                onClick={() => handleRename(p)}
                className="text-ink-soft hover:text-ink underline decoration-wood/50 underline-offset-4"
              >
                名前変更
              </button>
              <button
                onClick={() => handleDelete(p)}
                className="text-chalk hover:text-chalk/70"
              >
                削除
              </button>
            </div>
          </li>
        ))}
        {participants.length === 0 && (
          <p className="text-ink-soft text-sm">
            まだ選手がいません。上のフォームから追加してください。
          </p>
        )}
      </ul>
    </div>
  );
}
