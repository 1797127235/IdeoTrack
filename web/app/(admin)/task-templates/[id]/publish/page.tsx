"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { getTaskTemplate } from "@/lib/task-templates";
import { createTaskFromTemplate, type TaskScopeType } from "@/lib/tasks";
import { listColleges, listClasses, type College, type Class } from "@/lib/users";
import { Button, Select, Input, Card, FormField } from "@/components/ui";

export default function PublishTaskFromTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [templateTitle, setTemplateTitle] = useState("");
  const [scopeType, setScopeType] = useState<TaskScopeType>("school");
  const [scopeId, setScopeId] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [colleges, setColleges] = useState<College[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    Promise.all([getTaskTemplate(id), listColleges(), listClasses()])
      .then(([template, collegesData, classesData]) => {
        setTemplateTitle(template.title);
        setColleges(collegesData ?? []);
        setClasses(classesData ?? []);

        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        setPublishedAt(
          template.start_time ? formatDateTimeLocal(new Date(template.start_time)) : formatDateTimeLocal(now)
        );
        setDeadlineAt(
          template.end_time ? formatDateTimeLocal(new Date(template.end_time)) : formatDateTimeLocal(tomorrow)
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  function formatDateTimeLocal(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError("");
    setSubmitting(true);

    try {
      const payload: {
        template_id: string;
        scope_type: TaskScopeType;
        scope_id?: string | null;
        target_class_ids?: string[];
        published_at: string;
        deadline_at: string;
      } = {
        template_id: id,
        scope_type: scopeType,
        published_at: new Date(publishedAt).toISOString(),
        deadline_at: new Date(deadlineAt).toISOString(),
      };

      if (scopeType === "school") {
        payload.scope_id = null;
      } else if (scopeType === "college") {
        if (!scopeId) throw new Error("请选择学院");
        payload.scope_id = scopeId;
      } else if (scopeType === "class") {
        if (!scopeId) throw new Error("请选择班级");
        payload.target_class_ids = [scopeId];
      }

      const tasks = await createTaskFromTemplate(payload);
      if (!tasks || tasks.length === 0) {
        throw new Error("发布失败");
      }
      router.push("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-[var(--color-ink-secondary)]">加载中…</div>;
  }

  return (
    <div className="max-w-2xl">
      {error ? (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField label="模板" htmlFor="template">
            <Input id="template" type="text" value={templateTitle} disabled readOnly />
          </FormField>

          <FormField label="发布范围" htmlFor="scopeType">
            <Select
              id="scopeType"
              value={scopeType}
              onChange={(e) => {
                setScopeType(e.target.value as TaskScopeType);
                setScopeId("");
              }}
            >
              <option value="school">全校</option>
              <option value="college">学院</option>
              <option value="class">班级</option>
            </Select>
          </FormField>

          {scopeType === "college" && (
            <FormField label="选择学院" htmlFor="scopeId" required>
              <Select id="scopeId" value={scopeId} onChange={(e) => setScopeId(e.target.value)} required>
                <option value="">请选择</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {scopeType === "class" && (
            <FormField label="选择班级" htmlFor="scopeId" required>
              <Select id="scopeId" value={scopeId} onChange={(e) => setScopeId(e.target.value)} required>
                <option value="">请选择</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.collegeName} - {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="发布时间" htmlFor="publishedAt" required>
              <Input
                id="publishedAt"
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                required
              />
            </FormField>
            <FormField label="截止时间" htmlFor="deadlineAt" required>
              <Input
                id="deadlineAt"
                type="datetime-local"
                value={deadlineAt}
                onChange={(e) => setDeadlineAt(e.target.value)}
                required
              />
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Link
              href="/task-templates"
              className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg)] flex items-center transition-colors"
            >
              取消
            </Link>
            <Button type="submit" isLoading={submitting}>
              {submitting ? "发布中…" : "确认发布"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
