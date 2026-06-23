"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { changePassword, getToken, logout } from "@/lib/api";
import { isTokenValid } from "@/lib/jwt";
import styles from "./page.module.css";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 守卫：无有效 token 跳登录（此页用于首次登录改密，但不应被无 token 访问）
  useEffect(() => {
    const token = getToken();
    if (!token || !isTokenValid(token)) {
      router.replace("/login");
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg("请填写所有字段");
      return;
    }
    // 与服务端一致：trim 后再校验长度，避免纯空格密码绕过
    const trimmedNew = newPassword.trim();
    if (trimmedNew.length < 6) {
      setErrorMsg("新密码至少 6 位（不能全为空格）");
      return;
    }
    if (trimmedNew === currentPassword.trim()) {
      setErrorMsg("新密码不能与原密码相同");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("两次输入的新密码不一致");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await changePassword(currentPassword, newPassword);
      router.replace("/");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "修改密码失败");
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>修改初始密码</h1>
        <p className={styles.subtitle}>首次登录需修改初始密码以保障账号安全</p>

        <label className={styles.field}>
          <span className={styles.label}>原密码</span>
          <input
            className={styles.input}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>新密码（至少 6 位）</span>
          <input
            className={styles.input}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>确认新密码</span>
          <input
            className={styles.input}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
        </label>

        {errorMsg && <p className={styles.error}>{errorMsg}</p>}

        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "提交中…" : "确认修改"}
        </button>

        <button
          type="button"
          className={styles.logoutLink}
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          退出登录
        </button>
      </form>
    </div>
  );
}
