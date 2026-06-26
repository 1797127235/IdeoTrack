"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listUsers,
  listClasses,
  listColleges,
  createUser,
  updateUser,
  deleteUser,
  batchImportUsers,
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
import {
  Button,
  Input,
  Select,
  Badge,
  Card,
  EmptyState,
  Skeleton,
  FormField,
  Spinner,
} from "@/components/ui";
import { Download, Upload, X, Users } from "lucide-react";

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
  collegeId: string;
  classId: string;
}

const emptyForm: FormState = {
  schoolId: "",
  name: "",
  role: "student",
  collegeId: "",
  classId: "",
};

function parseUserImportCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^\uFEFF/, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

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
          <Button variant="ghost" size="sm" aria-label="关闭" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
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
  const [batchImportResult, setBatchImportResult] = useState<{ success: number; failed: number; errors: Array<{ row: number; message: string }> } | null>(null);
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
      collegeId: user.collegeId || "",
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
          collegeId: form.collegeId || null,
          classId: form.role === "student" ? form.classId || null : null,
        });
      } else {
        await createUser({
          schoolId: form.schoolId.trim(),
          name: form.name.trim(),
          role: form.role,
          collegeId: form.collegeId || undefined,
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

  const handleBatchImportUsers = async (file: File) => {
    setBatchImporting(true);
    setBatchImportResult(null);
    setError("");
    try {
      const text = await file.text();
      const rows = parseUserImportCsv(text);
      const users = rows
        .map((row, index): { row: number; schoolId: string; name: string; role: UserRole; collegeId?: string; classId?: string } | null => {
          const schoolId = row["学号"]?.trim() || row["schoolId"]?.trim() || row["工号"]?.trim();
          const name = row["姓名"]?.trim() || row["name"]?.trim() || "";
          const roleText = row["角色"]?.trim() || row["role"]?.trim() || "学生";
          const collegeName = row["学院"]?.trim() || row["college"]?.trim();
          const className = row["班级"]?.trim() || row["class"]?.trim();

          const role: UserRole | undefined =
            roleText === "学生" || roleText === "student"
              ? "student"
              : roleText === "辅导员" || roleText === "counselor"
              ? "counselor"
              : roleText === "管理员" || roleText === "admin"
              ? "admin"
              : undefined;

          if (!schoolId) {
            throw new Error(`第 ${index + 2} 行缺少学号/工号`);
          }
          if (!role) {
            throw new Error(`第 ${index + 2} 行角色无效：${roleText}`);
          }

          const college = collegeName ? colleges.find((c) => c.name === collegeName) : undefined;
          if (collegeName && !college) {
            throw new Error(`第 ${index + 2} 行学院不存在：${collegeName}`);
          }

          const cls = className ? classes.find((c) => c.name === className && (!college || c.collegeId === college.id)) : undefined;
          if (className && !cls) {
            throw new Error(`第 ${index + 2} 行班级不存在：${className}`);
          }

          return {
            row: index + 2,
            schoolId,
            name,
            role,
            collegeId: college?.id,
            classId: cls?.id,
          };
        })
        .filter(Boolean) as { row: number; schoolId: string; name: string; role: UserRole; collegeId?: string; classId?: string }[];

      if (users.length === 0) {
        throw new Error("CSV 中没有可导入的数据");
      }

      const result = await batchImportUsers({ users });
      setBatchImportResult(result);
      updateQuery({ page: query.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setBatchImporting(false);
    }
  };

  const downloadUserImportTemplate = () => {
    const headers = ["学号/工号", "姓名", "角色", "学院", "班级"];
    const samples = [
      ["2024001", "张三", "学生", "计算机学院", "计算机科学与技术1班"],
      ["2024002", "李四", "学生", "计算机学院", "计算机科学与技术2班"],
      ["T001", "王老师", "辅导员", "", ""],
    ];
    const csv = [headers.join(","), ...samples.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "用户导入模板.csv";
    a.click();
    URL.revokeObjectURL(url);
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">用户管理</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={downloadUserImportTemplate}>
            <Download className="w-4 h-4" />
            下载用户导入模板
          </Button>

          <Button
            variant="secondary"
            size="sm"
            asChild
            className={batchImporting ? "opacity-60 pointer-events-none" : ""}
          >
            <label>
              {batchImporting ? "导入中…" : "批量导入用户"}
              <Input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleBatchImportUsers(f);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            asChild
            className={batchImporting ? "opacity-60 pointer-events-none" : ""}
            title="上传 zip 包，文件名用学号（如 2024001.jpg），按学号匹配用户"
          >
            <label>
              {batchImporting ? "导入中…" : "批量导入照片"}
              <Input
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
          </Button>

          <Button variant="primary" size="sm" onClick={openCreate}>
            <Users className="w-4 h-4" />
            新增用户
          </Button>
        </div>
      </div>

      {batchImportResult && (
        <Card className="relative p-4 text-sm">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 top-2"
            aria-label="关闭"
            onClick={() => setBatchImportResult(null)}
          >
            <X className="w-4 h-4" />
          </Button>
          <p className="text-[var(--color-ink)] mb-2 pr-6">
            导入完成：成功 {batchImportResult.success}，失败 {batchImportResult.failed}
          </p>
          {batchImportResult.errors.length > 0 && (
            <div className="mt-2 max-h-32 overflow-auto text-xs space-y-0.5">
              {batchImportResult.errors.map((err, idx) => (
                <div key={`${err.row}-${idx}`} className="text-[var(--color-danger)]">
                  第 {err.row} 行：{err.message}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {faceJob && (
        <Card className="relative p-4 text-sm">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 top-2"
            aria-label="关闭"
            onClick={closeFaceJob}
          >
            <X className="w-4 h-4" />
          </Button>
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
        </Card>
      )}

      <Card className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateQuery({ page: 1 });
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <FormField label="关键词" htmlFor="user-keyword" className="min-w-[180px] flex-1">
            <Input
              id="user-keyword"
              type="text"
              placeholder="学号/姓名"
              value={query.keyword}
              onChange={(e) => updateQuery({ keyword: e.target.value, page: 1 })}
            />
          </FormField>

          <FormField label="角色" htmlFor="user-role" className="min-w-[120px] flex-1">
            <Select
              id="user-role"
              value={query.role}
              onChange={(e) => updateQuery({ role: e.target.value as UserRole | "", page: 1 })}
            >
              <option value="">全部</option>
              <option value="student">学生</option>
              <option value="counselor">辅导员</option>
              <option value="admin">管理员</option>
            </Select>
          </FormField>

          <FormField label="学院" htmlFor="user-college" className="min-w-[160px] flex-1">
            <Select
              id="user-college"
              value={query.collegeId}
              onChange={(e) => updateQuery({ collegeId: e.target.value, classId: "", page: 1 })}
            >
              <option value="">全部学院</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="班级" htmlFor="user-class" className="min-w-[200px] flex-1">
            <Select
              id="user-class"
              value={query.classId}
              onChange={(e) => updateQuery({ classId: e.target.value, page: 1 })}
            >
              <option value="">全部班级</option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.collegeName} - {c.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="账号状态" htmlFor="user-status" className="min-w-[120px] flex-1">
            <Select
              id="user-status"
              value={query.isEnabled}
              onChange={(e) =>
                updateQuery({ isEnabled: e.target.value as "" | "true" | "false", page: 1 })
              }
            >
              <option value="">全部</option>
              <option value="true">正常</option>
              <option value="false">禁用</option>
            </Select>
          </FormField>

          <FormField label="注册照" htmlFor="user-face" className="min-w-[120px] flex-1">
            <Select
              id="user-face"
              value={query.hasFace}
              onChange={(e) =>
                updateQuery({ hasFace: e.target.value as HasFaceFilter, page: 1 })
              }
            >
              <option value="">全部</option>
              <option value="true">已上传</option>
              <option value="false">未上传</option>
            </Select>
          </FormField>

          <Button type="submit" variant="primary" size="sm">
            查询
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
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
          >
            重置
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        {loading || metaLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
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
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)] last:border-0">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="暂无用户"
            description="当前筛选条件下没有找到用户，请调整条件或新增用户。"
            icon={<Users className="w-6 h-6 text-[var(--color-ink-muted)]" />}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
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
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-3 text-[var(--color-ink)]">{user.schoolId}</td>
                      <td className="py-3 text-[var(--color-ink)]">{user.name || "-"}</td>
                      <td className="py-3 text-[var(--color-ink-secondary)]">{roleLabel(user.role)}</td>
                      <td className="py-3 text-[var(--color-ink-secondary)]">{user.collegeName || "-"}</td>
                      <td className="py-3 text-[var(--color-ink-secondary)]">{user.className || "-"}</td>
                      <td className="py-3">
                        <Badge variant={user.isEnabled ? "success" : "danger"}>
                          {user.isEnabled ? "正常" : "禁用"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {uploadingId === user.id ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
                            <Spinner size={14} />
                            处理中…
                          </span>
                        ) : user.hasFace ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-9 w-9 rounded-full overflow-hidden border border-[var(--color-border)] p-0 hover:ring-2 hover:ring-[var(--color-accent)]"
                            >
                              <button
                                type="button"
                                onClick={() => setPreviewUser(user)}
                                aria-label="查看注册照"
                              >
                                <img
                                  src={userFacePhotoUrl(user.id)}
                                  alt="注册照"
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            </Button>
                            <div className="flex flex-col text-xs gap-0.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto px-0"
                                onClick={() => setPreviewUser(user)}
                              >
                                查看
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto px-0 text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                                onClick={() => handleDeleteFace(user)}
                              >
                                删除
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="secondary" size="sm" asChild>
                            <label className="cursor-pointer">
                              <Upload className="w-4 h-4" />
                              上传
                              <Input
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
                          </Button>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(user)}
                          >
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.isEnabled ? "禁用" : "启用"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                            onClick={() => handleDelete(user.id)}
                          >
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)] gap-3">
                <div className="text-sm text-[var(--color-ink-secondary)]">
                  共 {total} 条，第 {query.page} / {totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={query.page <= 1}
                    onClick={() => updateQuery({ page: query.page - 1 })}
                  >
                    上一页
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={query.page >= totalPages}
                    onClick={() => updateQuery({ page: query.page + 1 })}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {isModalOpen && (
        <Modal title={editingUser ? "编辑用户" : "新增用户"} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="学号/工号" htmlFor="user-schoolId" required>
              <Input
                id="user-schoolId"
                type="text"
                value={form.schoolId}
                onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))}
                placeholder="请输入学号/工号"
                disabled={!!editingUser}
              />
            </FormField>

            <FormField label="姓名" htmlFor="user-name">
              <Input
                id="user-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="请输入姓名"
              />
            </FormField>

            <FormField label="角色" htmlFor="user-form-role">
              <Select
                id="user-form-role"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    role: e.target.value as UserRole,
                    classId: e.target.value === "student" ? f.classId : "",
                  }))
                }
              >
                <option value="student">学生</option>
                <option value="counselor">辅导员</option>
                <option value="admin">管理员</option>
              </Select>
            </FormField>

            {form.role === "student" && (
              <>
                <FormField label="学院" htmlFor="user-form-college">
                  <Select
                    id="user-form-college"
                    value={form.collegeId}
                    onChange={(e) => setForm((f) => ({ ...f, collegeId: e.target.value, classId: "" }))}
                  >
                    <option value="">请选择学院</option>
                    {colleges.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="班级" htmlFor="user-form-class">
                  <Select
                    id="user-form-class"
                    value={form.classId}
                    onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                  >
                    <option value="">请选择班级</option>
                    {classes
                      .filter((c) => !form.collegeId || c.collegeId === form.collegeId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </Select>
                </FormField>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={saving}
                disabled={!form.schoolId.trim()}
              >
                保存
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
                取消
              </Button>
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
              <Button
                variant="ghost"
                size="sm"
                aria-label="关闭"
                onClick={() => setPreviewUser(null)}
              >
                <X className="w-4 h-4" />
              </Button>
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
