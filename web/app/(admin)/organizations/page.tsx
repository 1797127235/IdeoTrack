"use client";

import { useEffect, useState } from "react";
import {
  listColleges,
  listClasses,
  createCollege,
  updateCollege,
  deleteCollege,
  createClass,
  updateClass,
  deleteClass,
  listCounselors,
  getManagedClasses,
  setManagedClasses as saveManagedClasses,
  batchImportOrganizations,
  type College,
  type Class,
  type Counselor,
  type ManagedClass,
  type BatchImportOrgResult,
} from "@/lib/users";
import {
  Button,
  Input,
  Select,
  Card,
  EmptyState,
  Skeleton,
  FormField,
} from "@/components/ui";
import {
  Building2,
  Users,
  GraduationCap,
  Pencil,
  Trash2,
  Check,
  Download,
  X,
} from "lucide-react";

type OrganizationTab = "colleges" | "classes" | "counselors";

/** 解析组织导入 CSV，返回 {学院, 班级} 行（班级可为空）。表头中英文均支持。 */
function parseOrgImportCsv(text: string): Array<{ collegeName: string; className: string }> {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^\uFEFF/, ""));
  const collegeIdx = headers.findIndex((h) => h === "学院" || h === "college" || h === "学院名称");
  const classIdx = headers.findIndex((h) => h === "班级" || h === "class" || h === "班级名称");

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    return {
      collegeName: (collegeIdx >= 0 ? values[collegeIdx] : values[0]) ?? "",
      className: (classIdx >= 0 ? values[classIdx] : values[1]) ?? "",
    };
  });
}

export default function OrganizationsPage() {
  const [activeTab, setActiveTab] = useState<OrganizationTab>("colleges");
  const [colleges, setColleges] = useState<College[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [managedClasses, setManagedClasses] = useState<ManagedClass[]>([]);
  const managedClassCount = managedClasses.length;
  const [selectedCounselorId, setSelectedCounselorId] = useState<string>("");
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);

  const [collegeName, setCollegeName] = useState("");
  const [editingCollege, setEditingCollege] = useState<College | null>(null);

  const [className, setClassName] = useState("");
  const [classCollegeId, setClassCollegeId] = useState("");
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  const [assignmentCollegeId, setAssignmentCollegeId] = useState<string>("");

  const [batchImporting, setBatchImporting] = useState(false);
  const [batchImportResult, setBatchImportResult] = useState<BatchImportOrgResult | null>(null);
  const organizationTabs: Array<{ id: OrganizationTab; label: string; count: number }> = [
    { id: "colleges", label: "学院管理", count: colleges.length },
    { id: "classes", label: "班级管理", count: classes.length },
    { id: "counselors", label: "辅导员设置", count: counselors.length },
  ];

  const loadData = () => {
    Promise.all([listColleges(), listClasses(), listCounselors()])
      .then(([c, cl, counselorsData]) => {
        setColleges(c);
        setClasses(cl);
        setCounselors(counselorsData);
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

  const handleBatchImportOrganizations = async (file: File) => {
    setBatchImporting(true);
    setBatchImportResult(null);
    setError("");
    try {
      const text = await file.text();
      const rows = parseOrgImportCsv(text);
      const valid = rows.filter((r) => r.collegeName.trim());
      if (valid.length === 0) {
        throw new Error("CSV 中没有可导入的数据（缺少学院名称）");
      }
      const result = await batchImportOrganizations(
        valid.map((r) => ({ collegeName: r.collegeName.trim(), className: r.className.trim() || undefined }))
      );
      setBatchImportResult(result);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setBatchImporting(false);
    }
  };

  const downloadOrgImportTemplate = () => {
    const headers = ["学院", "班级"];
    const samples = [
      ["计算机学院", "计算机科学与技术1班"],
      ["计算机学院", "计算机科学与技术2班"],
      ["土木工程学院", ""],
    ];
    const csv = [headers.join(","), ...samples.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "组织导入模板.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCounselorChange = async (counselorId: string) => {
    setSelectedCounselorId(counselorId);
    setAssignmentError("");
    setAssignmentSuccess(false);
    if (!counselorId) {
      setAssignmentCollegeId("");
      setManagedClasses([]);
      setSelectedClassIds(new Set());
      return;
    }
    // 选中辅导员后锁定为其所属学院（一所一属），只能勾选本院班级
    const counselor = counselors.find((c) => c.id === counselorId);
    setAssignmentCollegeId(counselor?.collegeId || "");
    try {
      const data = await getManagedClasses(counselorId);
      setManagedClasses(data);
      setSelectedClassIds(new Set(data.map((c) => c.id)));
    } catch (err) {
      setAssignmentError(err instanceof Error ? err.message : "加载失败");
      setManagedClasses([]);
      setSelectedClassIds(new Set());
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedCounselorId) return;
    setSavingAssignments(true);
    setAssignmentError("");
    setAssignmentSuccess(false);
    try {
      const data = await saveManagedClasses(
        selectedCounselorId,
        Array.from(selectedClassIds)
      );
      setManagedClasses(data);
      setAssignmentSuccess(true);
    } catch (err) {
      setAssignmentError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSavingAssignments(false);
    }
  };

  const toggleClass = (classId: string) => {
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeName.trim()) return;
    try {
      await createCollege({ name: collegeName.trim() });
      setCollegeName("");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    }
  };

  const handleUpdateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollege || !collegeName.trim()) return;
    try {
      await updateCollege(editingCollege.id, { name: collegeName.trim() });
      setEditingCollege(null);
      setCollegeName("");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    }
  };

  const handleDeleteCollege = async (id: string) => {
    if (!confirm("确定删除该学院？")) return;
    try {
      await deleteCollege(id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !classCollegeId) return;
    try {
      await createClass({ collegeId: classCollegeId, name: className.trim() });
      setClassName("");
      setClassCollegeId("");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !className.trim()) return;
    try {
      await updateClass(editingClass.id, {
        name: className.trim(),
        collegeId: classCollegeId || editingClass.collegeId,
      });
      setEditingClass(null);
      setClassName("");
      setClassCollegeId("");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("确定删除该班级？")) return;
    try {
      await deleteClass(id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>
        </div>
        <Card className="p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full sm:w-72" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">组织架构</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={downloadOrgImportTemplate}>
            <Download className="w-4 h-4" />
            下载组织导入模板
          </Button>

          <Button
            variant="secondary"
            size="sm"
            asChild
            className={batchImporting ? "opacity-60 pointer-events-none" : ""}
          >
            <label>
              {batchImporting ? "导入中…" : "批量导入组织"}
              <Input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleBatchImportOrganizations(f);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="组织架构管理分类"
        className="flex w-full flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1 sm:inline-flex sm:w-auto sm:flex-row"
      >
        {organizationTabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={`flex h-10 items-center justify-between gap-3 rounded-md px-4 text-sm font-medium transition-colors sm:justify-center ${
                selected
                  ? "bg-[var(--color-accent)] text-white shadow-sm"
                  : "text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-ink)]"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  selected
                    ? "bg-white/20 text-white"
                    : "bg-[var(--color-bg)] text-[var(--color-ink-muted)]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
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
            导入完成：新增 {batchImportResult.created}，已存在跳过 {batchImportResult.skipped}
            {batchImportResult.failed > 0 ? `，失败 ${batchImportResult.failed}` : ""}
          </p>
          {batchImportResult.items.some((i) => i.status !== "created") && (
            <div className="mt-2 max-h-40 overflow-auto text-xs space-y-0.5">
              {batchImportResult.items
                .filter((i) => i.status !== "created")
                .map((i, idx) => (
                  <div key={`${i.row}-${idx}`} className="text-[var(--color-ink-secondary)]">
                    <span
                      className={
                        i.status === "failed"
                          ? "text-[var(--color-danger)]"
                          : "text-[var(--color-warning)]"
                      }
                    >
                      第 {i.row} 行
                      {i.className ? ` ${i.collegeName} / ${i.className}` : ` ${i.collegeName}`}
                    </span>
                    ：{i.message || (i.status === "skipped" ? "已存在，跳过" : "失败")}
                  </div>
                ))}
            </div>
          )}
        </Card>
      )}

      <div className="space-y-6">
        {activeTab === "colleges" ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-4">
            学院管理
          </h2>

          <form
            onSubmit={editingCollege ? handleUpdateCollege : handleCreateCollege}
            className="flex flex-col sm:flex-row gap-3 items-end mb-4"
          >
            <FormField
              label="学院名称"
              htmlFor="collegeName"
              className="flex-1"
            >
              <Input
                id="collegeName"
                type="text"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="学院名称"
              />
            </FormField>
            <Button type="submit">
              {editingCollege ? "更新" : "新增"}
            </Button>
            {editingCollege && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingCollege(null);
                  setCollegeName("");
                }}
              >
                取消
              </Button>
            )}
          </form>

          {colleges.length === 0 ? (
            <EmptyState
              title="暂无学院"
              description="添加学院后即可创建班级"
              icon={<Building2 className="w-6 h-6 text-[var(--color-ink-muted)]" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                      名称
                    </th>
                    <th className="text-right py-2 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {colleges.map((college) => (
                    <tr
                      key={college.id}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="py-3 text-[var(--color-ink)]">
                        {college.name}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCollege(college);
                              setCollegeName(college.name);
                            }}
                            className="text-[var(--color-accent)]"
                          >
                            <Pencil className="w-4 h-4" />
                            编辑
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCollege(college.id)}
                            className="text-[var(--color-danger)]"
                          >
                            <Trash2 className="w-4 h-4" />
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        ) : null}

        {activeTab === "classes" ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-4">
            班级管理
          </h2>

          <form
            onSubmit={editingClass ? handleUpdateClass : handleCreateClass}
            className="flex flex-col sm:flex-row gap-3 items-end mb-4"
          >
            <FormField
              label="所属学院"
              htmlFor="classCollegeId"
              className="w-full sm:w-44"
            >
              <Select
                id="classCollegeId"
                value={classCollegeId || (editingClass?.collegeId ?? "")}
                onChange={(e) => setClassCollegeId(e.target.value)}
              >
                <option value="">选择学院</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="班级名称"
              htmlFor="className"
              className="flex-1"
            >
              <Input
                id="className"
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="班级名称"
              />
            </FormField>
            <Button type="submit">
              {editingClass ? "更新" : "新增"}
            </Button>
            {editingClass && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingClass(null);
                  setClassName("");
                  setClassCollegeId("");
                }}
              >
                取消
              </Button>
            )}
          </form>

          {classes.length === 0 ? (
            <EmptyState
              title="暂无班级"
              description="添加班级并关联到学院"
              icon={<Users className="w-6 h-6 text-[var(--color-ink-muted)]" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                      班级
                    </th>
                    <th className="text-left py-2 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                      学院
                    </th>
                    <th className="text-right py-2 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr
                      key={cls.id}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="py-3 text-[var(--color-ink)]">{cls.name}</td>
                      <td className="py-3 text-[var(--color-ink-secondary)]">
                        {cls.collegeName}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingClass(cls);
                              setClassName(cls.name);
                              setClassCollegeId(cls.collegeId);
                            }}
                            className="text-[var(--color-accent)]"
                          >
                            <Pencil className="w-4 h-4" />
                            编辑
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClass(cls.id)}
                            className="text-[var(--color-danger)]"
                          >
                            <Trash2 className="w-4 h-4" />
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        ) : null}
      </div>

      {activeTab === "counselors" ? (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-4">
          辅导员班级分配
        </h2>

        {assignmentError ? (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
            {assignmentError}
          </div>
        ) : null}
        {assignmentSuccess ? (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--color-success-subtle)] text-sm text-[var(--color-success)]">
            保存成功
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          <FormField
            label="选择辅导员"
            htmlFor="counselorId"
            className="w-full sm:min-w-[240px] sm:w-60"
          >
            <Select
              id="counselorId"
              value={selectedCounselorId}
              onChange={(e) => handleCounselorChange(e.target.value)}
            >
              <option value="">请选择</option>
              {counselors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.schoolId}（{c.schoolId}）{c.collegeName ? `· ${c.collegeName}` : ""}
                </option>
              ))}
            </Select>
          </FormField>

          {selectedCounselorId && (
            <>
              <FormField
                label="所属学院"
                htmlFor="filterCollegeId"
                className="w-full sm:min-w-[240px] sm:w-60"
              >
                <Select
                  id="filterCollegeId"
                  value={assignmentCollegeId}
                  disabled
                  title="辅导员只能管理所属学院的班级，如需更改请修改辅导员归属学院"
                >
                  <option value="">未分配学院</option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-2">
                  所带班级
                </label>
                {classes.length === 0 ? (
                  <EmptyState
                    title="暂无班级"
                    description="请先创建班级"
                    icon={<GraduationCap className="w-6 h-6 text-[var(--color-ink-muted)]" />}
                    className="py-8"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {classes
                      .filter(
                        (cls) =>
                          !assignmentCollegeId ||
                          cls.collegeId === assignmentCollegeId
                      )
                      .map((cls) => {
                        const selected = selectedClassIds.has(cls.id);
                        return (
                          <label
                            key={cls.id}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                              selected
                                ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                                : "border-[var(--color-border)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg)]"
                            }`}
                          >
                            <Input
                              type="checkbox"
                              className="hidden"
                              checked={selected}
                              onChange={() => toggleClass(cls.id)}
                            />
                            {selected && <Check className="w-4 h-4" />}
                            <span>
                              {cls.collegeName} - {cls.name}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleSaveAssignments}
                  isLoading={savingAssignments}
                >
                  {savingAssignments ? "保存中…" : "保存分配"}
                </Button>
                {managedClassCount > 0 && (
                  <span className="text-sm text-[var(--color-ink-secondary)]">
                    当前已分配 {managedClassCount} 个班级
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </Card>
      ) : null}
    </div>
  );
}
