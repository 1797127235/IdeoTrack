"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { login } from "@/lib/auth";
import { Button, Card, FormField, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!schoolId || !password) {
      setError("请输入用户名和密码");
      return;
    }

    setLoading(true);
    try {
      const user = await login({ schoolId, password });
      if (user.role !== "admin") {
        setError("当前账号不是管理员，无法登录后台");
        return;
      }
      if (user.isInitialPassword) {
        router.push("/change-password");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
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
            IdeoTrack
          </h1>
          <p className="text-sm text-[var(--color-ink-secondary)]">
            管理员后台登录
          </p>
        </div>

        {error ? (
          <div className="mb-4 px-3 py-2 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="用户名" htmlFor="schoolId">
            <Input
              id="schoolId"
              type="text"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              placeholder="admin"
              disabled={loading}
            />
          </FormField>

          <FormField label="密码" htmlFor="password">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            className="w-full"
          >
            登录
          </Button>
        </form>

        <p className="mt-6 text-xs text-center text-[var(--color-ink-muted)]">
          首次登录需修改默认密码
        </p>
      </Card>
    </div>
  );
}
