"use client";

import { useRouter } from "next/navigation";
import { logout, getToken } from "@/lib/api";
import { decodeJwtPayload } from "@/lib/jwt";
import { useState, useEffect } from "react";
import styles from "./page.module.css";

/**
 * 管理后台首页（Story 14.1 占位）。
 * 完整侧边栏导航 + 各模块入口在 Story 14.2 实现。
 * 守卫由父级 (admin)/layout.tsx 的 AuthGuard 提供，此处无需再包。
 */
export default function AdminHome() {
  const router = useRouter();
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const token = getToken();
    const payload = token ? decodeJwtPayload(token) : null;
    setUserId(payload?.userId || "");
  }, []);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>思政打卡 · 管理后台</h1>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          退出登录
        </button>
      </header>
      <main className={styles.content}>
        <p className={styles.greeting}>欢迎，管理员（{userId.slice(0, 8)}…）</p>
        <p className={styles.placeholder}>
          后台各模块（任务 / 名言 / 组织 / 用户 / 报表 / 运维）将在后续 Story 接入。
        </p>
      </main>
    </div>
  );
}
