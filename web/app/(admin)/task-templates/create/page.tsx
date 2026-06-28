"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createTaskTemplate } from "@/lib/task-templates";
import GeofencePicker, { type GeofenceValue } from "@/components/GeofencePicker";
import { Button, Input, Textarea, Card, FormField, Switch } from "@/components/ui";

export default function CreateTaskTemplatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [guidingQuestions, setGuidingQuestions] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [geofence, setGeofence] = useState<GeofenceValue | null>(null);
  const [requireLocation, setRequireLocation] = useState(false);
  const [requireFace, setRequireFace] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const questions = guidingQuestions
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      if (requireLocation && !geofence) {
        throw new Error("开启定位签到后，请先选择签到范围");
      }

      await createTaskTemplate({
        title: title.trim(),
        content: content.trim(),
        guiding_questions: questions.length > 0 ? questions : undefined,
        source_url: sourceUrl.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
        require_face: requireFace,
        ...(requireLocation && geofence
          ? {
              geo_lat: geofence.lat,
              geo_lng: geofence.lng,
              geo_radius_meters: geofence.radius,
              geo_address: geofence.address,
            }
          : {}),
      });
      router.push("/task-templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {error ? (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField label="模板名称" htmlFor="title" required>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入模板名称"
              required
            />
          </FormField>

          <FormField label="模板内容" htmlFor="content" required>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="输入模板正文"
              required
            />
          </FormField>

          <FormField label="思考题（每行一个，可选）" htmlFor="guidingQuestions">
            <Textarea
              id="guidingQuestions"
              value={guidingQuestions}
              onChange={(e) => setGuidingQuestions(e.target.value)}
              rows={3}
              placeholder="输入思考题，引导学生撰写心得"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="外部链接" htmlFor="sourceUrl" hint="可选">
              <Input
                id="sourceUrl"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://"
              />
            </FormField>
            <FormField label="视频 URL" htmlFor="videoUrl" hint="可选">
              <Input
                id="videoUrl"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://"
              />
            </FormField>
          </div>

          <FormField label="需定位签到" htmlFor="requireLocation">
            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="requireLocation"
                checked={requireLocation}
                onCheckedChange={(checked) => {
                  setRequireLocation(checked);
                  if (!checked) setGeofence(null);
                }}
              />
              <span className="text-sm text-[var(--color-ink-secondary)]">
                {requireLocation ? "已开启" : "未开启"}
              </span>
            </div>
          </FormField>

          {requireLocation && (
            <FormField label="签到范围" required={requireLocation}>
              <GeofencePicker value={geofence} onChange={setGeofence} />
            </FormField>
          )}

          <FormField label="需人脸打卡" htmlFor="requireFace">
            <div className="flex items-center gap-3 pt-1">
              <Switch id="requireFace" checked={requireFace} onCheckedChange={setRequireFace} />
              <span className="text-sm text-[var(--color-ink-secondary)]">
                {requireFace ? "已开启" : "未开启"}
              </span>
            </div>
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Link
              href="/task-templates"
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
