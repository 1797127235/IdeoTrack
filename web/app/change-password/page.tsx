"use client";

import { useState } from "react";
import { changePassword } from "@/lib/auth";
import { withBasePath } from "@/lib/paths";

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPassword || !newPassword || !confirm) {
      setError("请填写所有字段");
      return;
    }
    if (newPassword.length < 8) {
      setError("新密码长度不能少于 8 位");
      return;
    }
    if (newPassword.length > 64) {
      setError("新密码长度不能超过 64 位");
      return;
    }
    if (newPassword !== confirm) {
      setError("两次输入的新密码不一致");
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword: oldPassword, newPassword });
      window.location.href = withBasePath("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "修改密码失败，请重试";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-[var(--color-ink)] mb-2">
            修改默认密码
          </h1>
          <p className="text-sm text-[var(--color-ink-secondary)]">
            为了账号安全，首次登录请修改密码
          </p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5">
              原密码
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              disabled={loading}
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5">
              新密码
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5">
              确认新密码
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "修改中..." : "确认修改"}
          </button>
        </form>
      </div>
    </div>
  );
}
