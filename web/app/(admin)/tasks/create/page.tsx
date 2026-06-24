"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createTask, type TaskScopeType } from "@/lib/tasks";
import { listColleges, listClasses, type College, type Class } from "@/lib/users";

export default function CreateTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [guidingQuestions, setGuidingQuestions] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [scopeType, setScopeType] = useState<TaskScopeType>("school");
  const [scopeId, setScopeId] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [colleges, setColleges] = useState<College[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // 加载学院/班级下拉数据
  useEffect(() => {
    Promise.all([listColleges(), listClasses()])
      .then(([c, cl]) => {
        setColleges(c);
        setClasses(cl);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const questions = guidingQuestions
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      await createTask({
        title: title.trim(),
        content: content.trim(),
        guiding_questions: questions.length > 0 ? questions : undefined,
        source_url: sourceUrl.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
        scope_type: scopeType,
        scope_id: scopeType === "school" || scopeType === "pool" ? undefined : scopeId,
        published_at: new Date(publishedAt).toISOString(),
        deadline_at: new Date(deadlineAt).toISOString(),
      });
      router.push("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-6"
      >
        <div>
          <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5">
            任务名称
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            placeholder="输入任务名称"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5">
            任务内容
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            placeholder="输入任务正文"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5">
            思考题（每行一个，可选）
          </label>
          <textarea
            value={guidingQuestions}
            onChange={(e) => setGuidingQuestions(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            placeholder="输入思考题，引导学生撰写心得"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5">
              外部链接（可选）
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              placeholder="https://"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5">
              视频 URL（可选）
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              placeholder="https://"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5">
              发布范围
            </label>
            <select
              value={scopeType}
              onChange={(e) => {
                setScopeType(e.target.value as TaskScopeType);
                setScopeId("");
              }}
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="school">全校</option>
              <option value="college">学院</option>
              <option value="class">班级</option>
              <option value="pool">任务池</option>
            </select>
          </div>

          {scopeType === "college" && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5">
                选择学院
              </label>
              <select
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                <option value="">请选择</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scopeType === "class" && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5">
                选择班级
              </label>
              <select
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                <option value="">请选择</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.collegeName} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5">
              发布时间
            </label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5">
              截止时间
            </label>
            <input
              type="datetime-local"
              value={deadlineAt}
              onChange={(e) => setDeadlineAt(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Link
            href="/tasks"
            className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg)] flex items-center transition-colors"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
