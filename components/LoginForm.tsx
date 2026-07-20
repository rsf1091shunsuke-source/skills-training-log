"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError("ログインできませんでした。メールアドレスとパスワードを確認してください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-ink/15 bg-white/60 rounded-lg p-6"
      >
        <p className="text-xs tracking-[0.3em] text-wood-dark font-bold mb-1">
          SKILL TRAINING LOG
        </p>
        <h1 className="font-display text-2xl mb-6">管理者ログイン</h1>

        <label className="block text-sm text-ink-soft mb-1">メールアドレス</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-ink/20 rounded px-3 py-2 mb-4 bg-white"
        />

        <label className="block text-sm text-ink-soft mb-1">パスワード</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-ink/20 rounded px-3 py-2 mb-4 bg-white"
        />

        {error && <p className="text-chalk text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-ink text-paper rounded py-2 font-medium hover:bg-wood-dark transition-colors disabled:opacity-50"
        >
          {submitting ? "ログイン中…" : "ログイン"}
        </button>
      </form>
    </div>
  );
}
