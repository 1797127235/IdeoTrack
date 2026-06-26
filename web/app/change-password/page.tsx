"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { changePassword } from "@/lib/auth";
import { withBasePath } from "@/lib/paths";
import { Button, Card, FormField, Input } from "@/components/ui";

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
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[var(--color-accent-subtle)] text-[var(--color-accent)] mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)] mb-2">
            修改默认密码
          </h1>
          <p className="text-sm text-[var(--color-ink-secondary)]">
            为了账号安全，首次登录请修改密码
          </p>
        </div>

        {error ? (
          <div className="mb-4 px-3 py-2 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="原密码" htmlFor="oldPassword">
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              disabled={loading}
            />
          </FormField>

          <FormField label="新密码" htmlFor="newPassword">
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
          </FormField>

          <FormField label="确认新密码" htmlFor="confirm">
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            className="w-full"
          >
            确认修改
          </Button>
        </form>
      </Card>
    </div>
  );
}
