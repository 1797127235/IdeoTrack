"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTask, updateTask, type TaskScopeType } from "@/lib/tasks";
import { listColleges, listClasses, type College, type Class } from "@/lib/users";
import GeofencePicker, { type GeofenceValue } from "@/components/GeofencePicker";
import {
  Button,
  Input,
  Textarea,
  Select,
  Card,
  Skeleton,
  FormField,
  Switch,
} from "@/components/ui";

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [guidingQuestions, setGuidingQuestions] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [scopeType, setScopeType] = useState<TaskScopeType>("school");
  const [scopeId, setScopeId] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [geofence, setGeofence] = useState<GeofenceValue | null>(null);
  const [requireFace, setRequireFace] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listColleges(), listClasses(), getTask(taskId)])
      .then(([collegesData, classesData, task]) => {
        if (cancelled) return;
        setColleges(collegesData);
        setClasses(classesData);
        setTitle(task.title);
        setContent(task.content);
        setGuidingQuestions(task.guiding_questions?.join("\n") || "");
        setSourceUrl(task.source_url || "");
        setVideoUrl(task.video_url || "");
        setScopeType(task.scope_type);
        setScopeId(task.scope_id || task.target_college_id || task.target_class_id || "");
        setPublishedAt(formatDateTimeLocal(task.published_at));
        setDeadlineAt(formatDateTimeLocal(task.deadline_at));
        if (task.geo_lat != null && task.geo_lng != null && task.geo_radius_meters != null) {
          setGeofence({
            lat: task.geo_lat,
            lng: task.geo_lng,
            radius: task.geo_radius_meters,
            address: task.geo_address || "",
          });
        } else {
          setGeofence(null);
        }
        setRequireFace(task.require_face ?? false);
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
  }, [taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const questions = guidingQuestions
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      await updateTask(taskId, {
        title: title.trim(),
        content: content.trim(),
        guiding_questions: questions.length > 0 ? questions : null,
        source_url: sourceUrl.trim() || null,
        video_url: videoUrl.trim() || null,
        scope_type: scopeType,
        scope_id: scopeType === "school" || scopeType === "pool" ? null : scopeId,
        published_at: new Date(publishedAt).toISOString(),
        deadline_at: new Date(deadlineAt).toISOString(),
        geo_lat: geofence?.lat ?? null,
        geo_lng: geofence?.lng ?? null,
        geo_radius_meters: geofence?.radius ?? null,
        geo_address: geofence?.address ?? null,
        require_face: requireFace,
      });
      router.push("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        {error ? (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}
        <Card className="p-6 space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    );
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
          <FormField label="任务名称" htmlFor="title" required>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </FormField>

          <FormField label="任务内容" htmlFor="content" required>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              required
            />
          </FormField>

          <FormField label="思考题（每行一个，可选）" htmlFor="guidingQuestions">
            <Textarea
              id="guidingQuestions"
              value={guidingQuestions}
              onChange={(e) => setGuidingQuestions(e.target.value)}
              rows={3}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="外部链接（可选）" htmlFor="sourceUrl">
              <Input
                id="sourceUrl"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </FormField>
            <FormField label="视频 URL（可选）" htmlFor="videoUrl">
              <Input
                id="videoUrl"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                <option value="pool">任务池</option>
              </Select>
            </FormField>

            {scopeType === "college" && (
              <FormField label="选择学院" htmlFor="scopeId" required>
                <Select
                  id="scopeId"
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  required
                >
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
                <Select
                  id="scopeId"
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  required
                >
                  <option value="">请选择</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.collegeName} - {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
          </div>

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

          <FormField label="签到范围（可选）">
            <GeofencePicker value={geofence} onChange={setGeofence} />
          </FormField>

          <FormField
            label="需人脸打卡"
            htmlFor="requireFace"
            hint="开启后，学生签到时必须用相机拍现场照，与注册照比对通过才能打卡"
          >
            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="requireFace"
                checked={requireFace}
                onCheckedChange={setRequireFace}
              />
              <span className="text-sm text-[var(--color-ink-secondary)]">
                {requireFace ? "已开启" : "未开启"}
              </span>
            </div>
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Link
              href="/tasks"
              className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg)] flex items-center transition-colors"
            >
              取消
            </Link>
            <Button type="submit" isLoading={saving}>
              {saving ? "保存中…" : "保存"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function formatDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
