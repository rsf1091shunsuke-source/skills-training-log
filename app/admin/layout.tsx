"use client";

import { useAuth } from "@/lib/auth-context";
import LoginForm from "@/components/LoginForm";
import Header from "@/components/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-soft text-sm">
        読み込み中…
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen">
      <Header
        title="管理画面"
        subtitle={user.email ?? undefined}
        right={
          <button
            onClick={() => logout()}
            className="text-sm text-ink-soft underline decoration-wood decoration-2 underline-offset-4 hover:text-ink"
          >
            ログアウト
          </button>
        }
      />
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
