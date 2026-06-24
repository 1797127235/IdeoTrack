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
  type College,
  type Class,
} from "@/lib/users";

export default function OrganizationsPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [collegeName, setCollegeName] = useState("");
  const [editingCollege, setEditingCollege] = useState<College | null>(null);

  const [className, setClassName] = useState("");
  const [classCollegeId, setClassCollegeId] = useState("");
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  const loadData = () => {
    Promise.all([listColleges(), listClasses()])
      .then(([c, cl]) => {
        setColleges(c);
        setClasses(cl);
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
      {error && (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

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
    </div>
  );
}
