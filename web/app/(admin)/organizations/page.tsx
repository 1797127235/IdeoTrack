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
    return <div className="text-sm text-[var(--color-ink-secondary)]">加载中…</div>;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-6">
        {/* Colleges */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-4">学院管理</h2>

          <form
            onSubmit={editingCollege ? handleUpdateCollege : handleCreateCollege}
            className="flex gap-3 mb-4"
          >
            <input
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="学院名称"
              className="flex-1 h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium"
            >
              {editingCollege ? "更新" : "新增"}
            </button>
            {editingCollege && (
              <button
                type="button"
                onClick={() => {
                  setEditingCollege(null);
                  setCollegeName("");
                }}
                className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm"
              >
                取消
              </button>
            )}
          </form>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">名称</th>
                <th className="text-right py-2 text-[var(--color-ink-muted)] font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {colleges.map((college) => (
                <tr key={college.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-3 text-[var(--color-ink)]">{college.name}</td>
                  <td className="py-3 text-right space-x-3">
                    <button
                      onClick={() => {
                        setEditingCollege(college);
                        setCollegeName(college.name);
                      }}
                      className="text-[var(--color-accent)] hover:underline"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteCollege(college.id)}
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

        {/* Classes */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-4">班级管理</h2>

          <form
            onSubmit={editingClass ? handleUpdateClass : handleCreateClass}
            className="flex gap-3 mb-4"
          >
            <select
              value={classCollegeId || (editingClass?.collegeId ?? "")}
              onChange={(e) => setClassCollegeId(e.target.value)}
              className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">选择学院</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="班级名称"
              className="flex-1 h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium"
            >
              {editingClass ? "更新" : "新增"}
            </button>
            {editingClass && (
              <button
                type="button"
                onClick={() => {
                  setEditingClass(null);
                  setClassName("");
                  setClassCollegeId("");
                }}
                className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm"
              >
                取消
              </button>
            )}
          </form>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">班级</th>
                <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">学院</th>
                <th className="text-right py-2 text-[var(--color-ink-muted)] font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr key={cls.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-3 text-[var(--color-ink)]">{cls.name}</td>
                  <td className="py-3 text-[var(--color-ink-secondary)]">{cls.collegeName}</td>
                  <td className="py-3 text-right space-x-3">
                    <button
                      onClick={() => {
                        setEditingClass(cls);
                        setClassName(cls.name);
                        setClassCollegeId(cls.collegeId);
                      }}
                      className="text-[var(--color-accent)] hover:underline"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls.id)}
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

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-4">辅导员班级分配</h2>

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
          <div>
            <label className="block text-xs text-[var(--color-ink-muted)] mb-1.5">选择辅导员</label>
            <select
              value={selectedCounselorId}
              onChange={(e) => handleCounselorChange(e.target.value)}
              className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] min-w-[240px]"
            >
              <option value="">请选择</option>
              {counselors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.schoolId}（{c.schoolId}）
                </option>
              ))}
            </select>
          </div>

          {selectedCounselorId && (
            <>
              <div>
                <label className="block text-xs text-[var(--color-ink-muted)] mb-1.5">筛选学院</label>
                <select
                  value={assignmentCollegeId}
                  onChange={(e) => setAssignmentCollegeId(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] min-w-[240px]"
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
                <label className="block text-xs text-[var(--color-ink-muted)] mb-2">所带班级</label>
                {classes.length === 0 ? (
                  <p className="text-sm text-[var(--color-ink-secondary)]">暂无班级</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {classes
                      .filter((cls) => !assignmentCollegeId || cls.collegeId === assignmentCollegeId)
                      .map((cls) => (
                        <label
                          key={cls.id}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                            selectedClassIds.has(cls.id)
                              ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                              : "border-[var(--color-border)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selectedClassIds.has(cls.id)}
                            onChange={() => toggleClass(cls.id)}
                          />
                          <span>{cls.collegeName} - {cls.name}</span>
                        </label>
                      ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveAssignments}
                  disabled={savingAssignments}
                  className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-60 text-white text-sm font-medium transition-colors"
                >
                  {savingAssignments ? "保存中…" : "保存分配"}
                </button>
                {managedClassCount > 0 && (
                  <span className="text-sm text-[var(--color-ink-secondary)]">
                    当前已分配 {managedClassCount} 个班级
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
