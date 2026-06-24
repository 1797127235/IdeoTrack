"use client";

import { useEffect, useState } from "react";
import {
  listUsers,
  listClasses,
  createUser,
  updateUser,
  deleteUser,
  type User,
  type Class,
  roleLabel,
  type UserRole,
} from "@/lib/users";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [schoolId, setSchoolId] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [classId, setClassId] = useState("");

  const loadData = () => {
    Promise.all([listUsers(), listClasses()])
      .then(([u, c]) => {
        setUsers(u);
        setClasses(c);
        setError("");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setSchoolId("");
    setName("");
    setRole("student");
    setClassId("");
    setEditingUser(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId.trim()) return;

    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: name.trim(),
          role,
          classId: role === "student" ? classId || null : null,
        });
      } else {
        await createUser({
          schoolId: schoolId.trim(),
          name: name.trim(),
          role,
          classId: role === "student" ? classId : undefined,
        });
      }
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await updateUser(user.id, { isEnabled: !user.isEnabled });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该用户？")) return;
    try {
      await deleteUser(id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  if (loading) {
    return <div className="text-sm text-[var(--color-ink-secondary)]">加载中…</div>;
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">用户管理</h2>
        <button
          onClick={() => setIsFormOpen(true)}
          className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium"
        >
          新增用户
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
          <h3 className="text-base font-medium text-[var(--color-ink)] mb-4">
            {editingUser ? "编辑用户" : "新增用户"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
            <input
              type="text"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              placeholder="学号/工号"
              disabled={!!editingUser}
              className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:bg-[var(--color-bg)]"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="姓名"
              className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="student">学生</option>
              <option value="counselor">辅导员</option>
              <option value="admin">管理员</option>
            </select>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              disabled={role !== "student"}
              className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:bg-[var(--color-bg)]"
            >
              <option value="">{role === "student" ? "选择班级" : "不适用"}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.collegeName} - {c.name}
                </option>
              ))}
            </select>
            <div className="col-span-4 flex gap-3">
              <button
                type="submit"
                className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium"
              >
                保存
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">学号/工号</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">姓名</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">角色</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">学院</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">班级</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">状态</th>
              <th className="text-right py-2 text-[var(--color-ink-muted)] font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="py-3 text-[var(--color-ink)]">{user.schoolId}</td>
                <td className="py-3 text-[var(--color-ink)]">{user.name || "-"}</td>
                <td className="py-3 text-[var(--color-ink-secondary)]">{roleLabel(user.role)}</td>
                <td className="py-3 text-[var(--color-ink-secondary)]">{user.collegeName || "-"}</td>
                <td className="py-3 text-[var(--color-ink-secondary)]">{user.className || "-"}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.isEnabled
                        ? "bg-[var(--color-success-subtle)] text-[var(--color-success)]"
                        : "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]"
                    }`}
                  >
                    {user.isEnabled ? "正常" : "禁用"}
                  </span>
                </td>
                <td className="py-3 text-right space-x-3">
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setSchoolId(user.schoolId);
                      setName(user.name || "");
                      setRole(user.role);
                      setClassId(user.classId || "");
                      setIsFormOpen(true);
                    }}
                    className="text-[var(--color-accent)] hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleToggleStatus(user)}
                    className="text-[var(--color-ink-secondary)] hover:underline"
                  >
                    {user.isEnabled ? "禁用" : "启用"}
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-[var(--color-danger)] hover:underline"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
