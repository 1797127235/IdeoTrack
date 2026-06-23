"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, getToken } from "@/lib/api";
import { decodeJwtPayload, isTokenValid } from "@/lib/jwt";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 仅当已有「有效的 admin token」时直接跳后台，避免非 admin 死循环
  useEffect(() => {
    const token = getToken();
    if (token && isTokenValid(token)) {
      const payload = decodeJwtPayload(token);
      if (payload?.role === "admin") {
        router.replace("/");
      }
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!schoolId.trim() || !password) {
      setErrorMsg("请输入账号和密码");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const result = await login(schoolId, password);
      // 首次登录强制改密
      if (result.user.isInitialPassword) {
        router.replace("/change-password");
        return;
      }
      router.replace("/");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "登录失败");
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.logo}>📚</div>
        <h1 className={styles.title}>思政打卡</h1>
        <p className={styles.subtitle}>管理员登录</p>

        <label className={styles.field}>
          <span className={styles.label}>账号 / 工号</span>
          <input
            className={styles.input}
            type="text"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            placeholder="请输入账号或工号"
            autoComplete="username"
            disabled={loading}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>密码</span>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            autoComplete="current-password"
            disabled={loading}
          />
        </label>

        {errorMsg && <p className={styles.error}>{errorMsg}</p>}

        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "登录中…" : "登录"}
        </button>
      </form>
    </div>
  );
}
