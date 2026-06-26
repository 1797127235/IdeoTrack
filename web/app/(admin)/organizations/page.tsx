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
  type College,
  type Class,
  type Counselor,
  type ManagedClass,
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
} from "lucide-react";

export default function OrganizationsPage() {
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

  const handleCounselorChange = async (counselorId: string) => {
    setSelectedCounselorId(counselorId);
    setAssignmentCollegeId("");
    setAssignmentError("");
    setAssignmentSuccess(false);
    if (!counselorId) {
      setManagedClasses([]);
      setSelectedClassIds(new Set());
      return;
    }
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colleges */}
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
              icon={Building2}
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

        {/* Classes */}
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
              icon={Users}
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
      </div>

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
                  {c.name || c.schoolId}（{c.schoolId}）
                </option>
              ))}
            </Select>
          </FormField>

          {selectedCounselorId && (
            <>
              <FormField
                label="筛选学院"
                htmlFor="filterCollegeId"
                className="w-full sm:min-w-[240px] sm:w-60"
              >
                <Select
                  id="filterCollegeId"
                  value={assignmentCollegeId}
                  onChange={(e) => setAssignmentCollegeId(e.target.value)}
                >
                  <option value="">全部学院</option>
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
                    icon={GraduationCap}
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
    </div>
  );
}
