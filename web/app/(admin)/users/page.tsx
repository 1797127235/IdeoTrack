"use client";

import { useEffect, useState } from "react";
import {
  listUsers,
  listClasses,
  listColleges,
  createUser,
  updateUser,
  deleteUser,
  type User,
  type Class,
  type College,
  roleLabel,
  type UserRole,
} from "@/lib/users";

const PAGE_SIZE = 20;

interface UserQuery {
  page: number;
  keyword: string;
  role: UserRole | "";
  collegeId: string;
  classId: string;
  isEnabled: "" | "true" | "false";
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [classes, setClasses] = useState<Class[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [schoolId, setSchoolId] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [classId, setClassId] = useState("");

  const [query, setQuery] = useState<UserQuery>({
    page: 1,
    keyword: "",
    role: "",
    collegeId: "",
    classId: "",
    isEnabled: "",
  });

  // Load classes/colleges once on mount (independent of user list queries)
  useEffect(() => {
    let cancelled = false;
    Promise.all([listClasses(), listColleges()])
      .then(([classesData, collegesData]) => {
        if (cancelled) return;
        setClasses(classesData);
        setColleges(collegesData);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setMetaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load users whenever query changes
  useEffect(() => {
    let cancelled = false;
    listUsers({
      keyword: query.keyword || undefined,
      role: query.role || undefined,
      collegeId: query.collegeId || undefined,
      classId: query.classId || undefined,
      isEnabled: query.isEnabled === "" ? undefined : query.isEnabled === "true",
      page: query.page,
      limit: PAGE_SIZE,
    })
      .then((usersData) => {
        if (cancelled) return;
        setUsers(usersData.items);
        setTotal(usersData.total);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const updateQuery = (patch: Partial<UserQuery>) => {
    setLoading(true);
    setQuery((prev) => ({
      ...prev,
      ...patch,
      page: patch.page ?? 1,
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery({ page: 1 });
  };

  const handleReset = () => {
    updateQuery({
      keyword: "",
      role: "",
      collegeId: "",
      classId: "",
      isEnabled: "",
      page: 1,
    });
  };

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
      updateQuery({ page: query.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await updateUser(user.id, { isEnabled: !user.isEnabled });
      updateQuery({ page: query.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该用户？")) return;
    try {
      await deleteUser(id);
      updateQuery({ page: query.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const filteredClasses = query.collegeId
    ? classes.filter((c) => c.collegeId === query.collegeId)
    : classes;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {error ? (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

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

      <form
        onSubmit={handleSearch}
        className="flex flex-wrap items-end gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4"
      >
        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-1">关键词</label>
          <input
            type="text"
            placeholder="学号/姓名"
            value={query.keyword}
            onChange={(e) => updateQuery({ keyword: e.target.value, page: 1 })}
            className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-1">角色</label>
          <select
            value={query.role}
            onChange={(e) => updateQuery({ role: e.target.value as UserRole | "", page: 1 })}
            className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="">全部</option>
            <option value="student">学生</option>
            <option value="counselor">辅导员</option>
            <option value="admin">管理员</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-1">学院</label>
          <select
            value={query.collegeId}
            onChange={(e) =>
              updateQuery({ collegeId: e.target.value, classId: "", page: 1 })
            }
            className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="">全部学院</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-1">班级</label>
          <select
            value={query.classId}
            onChange={(e) => updateQuery({ classId: e.target.value, page: 1 })}
            className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="">全部班级</option>
            {filteredClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.collegeName} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-1">账号状态</label>
          <select
            value={query.isEnabled}
            onChange={(e) =>
              updateQuery({ isEnabled: e.target.value as "" | "true" | "false", page: 1 })
            }
            className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="">全部</option>
            <option value="true">正常</option>
            <option value="false">禁用</option>
          </select>
        </div>

        <button
          type="submit"
          className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium"
        >
          查询
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm"
        >
          重置
        </button>
      </form>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        {loading || metaLoading ? (
          <div className="text-sm text-[var(--color-ink-secondary)]">加载中…</div>
        ) : (
          <>
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
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-sm text-[var(--color-ink-secondary)]"
                    >
                      暂无用户
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
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
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
                <div className="text-sm text-[var(--color-ink-secondary)]">
                  共 {total} 条，第 {query.page} / {totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={query.page <= 1}
                    onClick={() => updateQuery({ page: query.page - 1 })}
                    className="h-9 px-3 rounded-lg border border-[var(--color-border)] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    disabled={query.page >= totalPages}
                    onClick={() => updateQuery({ page: query.page + 1 })}
                    className="h-9 px-3 rounded-lg border border-[var(--color-border)] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
