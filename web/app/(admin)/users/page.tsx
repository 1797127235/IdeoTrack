"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listUsers,
  listClasses,
  listColleges,
  createUser,
  updateUser,
  deleteUser,
  uploadUserFace,
  deleteUserFace,
  createFaceImportJob,
  fetchFaceImportJob,
  userFacePhotoUrl,
  type User,
  type Class,
  type College,
  roleLabel,
  type UserRole,
  type FaceImportJob,
} from "@/lib/users";

const PAGE_SIZE = 20;

type HasFaceFilter = "" | "true" | "false";

interface UserQuery {
  page: number;
  keyword: string;
  role: UserRole | "";
  collegeId: string;
  classId: string;
  isEnabled: "" | "true" | "false";
  hasFace: HasFaceFilter;
}

interface FormState {
  schoolId: string;
  name: string;
  role: UserRole;
  classId: string;
}

const emptyForm: FormState = {
  schoolId: "",
  name: "",
  role: "student",
  classId: "",
};

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] w-full max-w-md p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-[var(--color-ink)]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] text-lg leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [classes, setClasses] = useState<Class[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [batchImporting, setBatchImporting] = useState(false);
  const [faceJob, setFaceJob] = useState<FaceImportJob | null>(null);
  const [previewUser, setPreviewUser] = useState<User | null>(null);

  const [query, setQuery] = useState<UserQuery>({
    page: 1,
    keyword: "",
    role: "",
    collegeId: "",
    classId: "",
    isEnabled: "",
    hasFace: "",
  });

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

  useEffect(() => {
    let cancelled = false;
    listUsers({
      keyword: query.keyword || undefined,
      role: query.role || undefined,
      collegeId: query.collegeId || undefined,
      classId: query.classId || undefined,
      isEnabled: query.isEnabled === "" ? undefined : query.isEnabled === "true",
      hasFace: query.hasFace === "" ? undefined : query.hasFace === "true",
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

  const filteredClasses = useMemo(
    () => (query.collegeId ? classes.filter((c) => c.collegeId === query.collegeId) : classes),
    [classes, query.collegeId]
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateQuery = (patch: Partial<UserQuery>) => {
    setLoading(true);
    setQuery((prev) => ({
      ...prev,
      ...patch,
      page: patch.page ?? 1,
    }));
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      schoolId: user.schoolId,
      name: user.name || "",
      role: user.role,
      classId: user.classId || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.schoolId.trim()) return;

    setSaving(true);
    setError("");
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: form.name.trim(),
          role: form.role,
          classId: form.role === "student" ? form.classId || null : null,
        });
      } else {
        await createUser({
          schoolId: form.schoolId.trim(),
          name: form.name.trim(),
          role: form.role,
          classId: form.role === "student" ? form.classId : undefined,
        });
      }
      closeModal();
      updateQuery({ page: query.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    setError("");
    try {
      await updateUser(user.id, { isEnabled: !user.isEnabled });
      updateQuery({ page: query.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该用户？")) return;
    setError("");
    try {
      await deleteUser(id);
      updateQuery({ page: query.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleUploadFace = async (userId: string, file: File) => {
    setUploadingId(userId);
    setError("");
    try {
      await uploadUserFace(userId, file);
      updateQuery({ page: query.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteFace = async (user: User) => {
    if (!confirm(`确认删除 ${user.name || user.schoolId} 的注册照？`)) return;
    setUploadingId(user.id);
    setError("");
    try {
      await deleteUserFace(user.id);
      updateQuery({ page: query.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setUploadingId(null);
    }
  };

  const handleBatchImport = async (file: File) => {
    setBatchImporting(true);
    setFaceJob(null);
    setError("");
    try {
      const jobId = await createFaceImportJob(file);
      await new Promise<void>((resolve, reject) => {
        const poll = () => {
          fetchFaceImportJob(jobId)
            .then((job) => {
              setFaceJob(job);
              if (job.status === "done") {
                resolve();
              } else {
                setTimeout(poll, 1200);
              }
            })
            .catch(reject);
        };
        setTimeout(poll, 800);
      });
      updateQuery({ page: query.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setBatchImporting(false);
    }
  };

  const closeFaceJob = () => setFaceJob(null);

  return (
    <div className="space-y-5">
      {error ? (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">用户管理</h2>
        <div className="flex items-center gap-3">
          <label
            className={`h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg)] flex items-center cursor-pointer transition-colors ${
              batchImporting ? "opacity-60 pointer-events-none" : ""
            }`}
            title="上传 zip 包，文件名用学号（如 2024001.jpg），按学号匹配用户"
          >
            {batchImporting ? "导入中…" : "批量导入照片"}
            <input
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleBatchImport(f);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={openCreate}
            className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium"
          >
            新增用户
          </button>
        </div>
      </div>

      {faceJob && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 text-sm relative">
          <button
            onClick={closeFaceJob}
            className="absolute right-3 top-2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            ×
          </button>
          {faceJob.status === "done" ? (
            <p className="text-[var(--color-ink)] mb-1 pr-6">
              导入完成：成功 {faceJob.success}，跳过 {faceJob.skipped}，失败 {faceJob.failed}
            </p>
          ) : (
            <p className="text-[var(--color-ink-secondary)] mb-2">
              导入中… {faceJob.processed} / {faceJob.total}
            </p>
          )}
          {faceJob.total > 0 && (
            <div className="h-1.5 rounded-full bg-[var(--color-bg)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] transition-all"
                style={{ width: `${Math.round((faceJob.processed / faceJob.total) * 100)}%` }}
              />
            </div>
          )}
          {faceJob.status === "done" && faceJob.items.some((i) => i.status !== "success") && (
            <div className="mt-2 max-h-32 overflow-auto text-xs space-y-0.5">
              {faceJob.items
                .filter((i) => i.status !== "success")
                .map((i, idx) => (
                  <div key={`${i.schoolId}-${idx}`} className="text-[var(--color-ink-secondary)]">
                    <span
                      className={
                        i.status === "failed"
                          ? "text-[var(--color-danger)]"
                          : "text-[var(--color-warning)]"
                      }
                    >
                      {i.schoolId}
                    </span>
                    ：{i.message}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateQuery({ page: 1 });
        }}
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
            onChange={(e) => updateQuery({ collegeId: e.target.value, classId: "", page: 1 })}
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

        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-1">注册照</label>
          <select
            value={query.hasFace}
            onChange={(e) =>
              updateQuery({ hasFace: e.target.value as HasFaceFilter, page: 1 })
            }
            className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="">全部</option>
            <option value="true">已上传</option>
            <option value="false">未上传</option>
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
          onClick={() =>
            updateQuery({
              keyword: "",
              role: "",
              collegeId: "",
              classId: "",
              isEnabled: "",
              hasFace: "",
              page: 1,
            })
          }
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
                  <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">注册照</th>
                  <th className="text-right py-2 text-[var(--color-ink-muted)] font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
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
                      <td className="py-3">
                        {uploadingId === user.id ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
                            <span className="w-3.5 h-3.5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                            处理中…
                          </span>
                        ) : user.hasFace ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewUser(user)}
                              className="h-9 w-9 rounded-full overflow-hidden border border-[var(--color-border)] hover:ring-2 hover:ring-[var(--color-accent)]"
                            >
                              <img
                                src={userFacePhotoUrl(user.id)}
                                alt="注册照"
                                className="h-full w-full object-cover"
                              />
                            </button>
                            <div className="flex flex-col text-xs gap-0.5">
                              <button
                                onClick={() => setPreviewUser(user)}
                                className="text-[var(--color-accent)] hover:underline text-left"
                              >
                                查看
                              </button>
                              <button
                                onClick={() => handleDeleteFace(user)}
                                className="text-[var(--color-danger)] hover:underline text-left"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--color-accent)] text-[var(--color-accent)] text-xs font-medium hover:bg-[var(--color-accent-subtle)] cursor-pointer transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            上传
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadFace(user.id, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </td>
                      <td className="py-3 text-right space-x-3">
                        <button
                          onClick={() => openEdit(user)}
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

      {isModalOpen && (
        <Modal title={editingUser ? "编辑用户" : "新增用户"} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--color-ink-secondary)] mb-1.5">
                学号/工号
              </label>
              <input
                type="text"
                value={form.schoolId}
                onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))}
                placeholder="请输入学号/工号"
                disabled={!!editingUser}
                className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:bg-[var(--color-bg)]"
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--color-ink-secondary)] mb-1.5">姓名</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="请输入姓名"
                className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--color-ink-secondary)] mb-1.5">角色</label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    role: e.target.value as UserRole,
                    classId: e.target.value === "student" ? f.classId : "",
                  }))
                }
                className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                <option value="student">学生</option>
                <option value="counselor">辅导员</option>
                <option value="admin">管理员</option>
              </select>
            </div>

            {form.role === "student" && (
              <div>
                <label className="block text-sm text-[var(--color-ink-secondary)] mb-1.5">班级</label>
                <select
                  value={form.classId}
                  onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                >
                  <option value="">请选择班级</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.collegeName} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || !form.schoolId.trim()}
                className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-60 text-white text-sm font-medium"
              >
                {saving ? "保存中…" : "保存"}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm"
              >
                取消
              </button>
            </div>
          </form>
        </Modal>
      )}

      {previewUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setPreviewUser(null)}
        >
          <div
            className="bg-[var(--color-surface)] rounded-xl p-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[var(--color-ink)]">
                {previewUser.name || previewUser.schoolId} 的注册照
              </span>
              <button
                onClick={() => setPreviewUser(null)}
                className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] text-sm"
              >
                关闭
              </button>
            </div>
            <img
              src={userFacePhotoUrl(previewUser.id)}
              alt="注册照"
              className="w-full rounded-lg object-contain max-h-[60vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
