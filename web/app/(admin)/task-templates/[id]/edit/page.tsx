"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { getTaskTemplate, updateTaskTemplate } from "@/lib/task-templates";
import GeofencePicker, { type GeofenceValue } from "@/components/GeofencePicker";
import { Button, Input, Textarea, Card, FormField, Switch } from "@/components/ui";

export default function EditTaskTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [guidingQuestions, setGuidingQuestions] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [geofence, setGeofence] = useState<GeofenceValue | null>(null);
  const [requireLocation, setRequireLocation] = useState(false);
  const [requireFace, setRequireFace] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getTaskTemplate(id)
      .then((template) => {
        setTitle(template.title);
        setContent(template.content);
        setGuidingQuestions((template.guiding_questions ?? []).join("\n"));
        setSourceUrl(template.source_url ?? "");
        setVideoUrl(template.video_url ?? "");
        setRequireFace(template.require_face);
        if (template.geo_lat !== null && template.geo_lng !== null && template.geo_radius_meters !== null) {
          setGeofence({
            lat: template.geo_lat,
            lng: template.geo_lng,
            radius: template.geo_radius_meters,
            address: template.geo_address ?? '',
          });
          setRequireLocation(true);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
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

      await updateTaskTemplate(id, {
        title: title.trim(),
        content: content.trim(),
        guiding_questions: questions.length > 0 ? questions : null,
        source_url: sourceUrl.trim() || null,
        video_url: videoUrl.trim() || null,
        require_face: requireFace,
        ...(requireLocation && geofence
          ? {
              geo_lat: geofence.lat,
              geo_lng: geofence.lng,
              geo_radius_meters: geofence.radius,
              geo_address: geofence.address,
            }
          : { geo_lat: null, geo_lng: null, geo_radius_meters: null, geo_address: null }),
      });
      router.push("/task-templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
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
          <FormField label="模板名称" htmlFor="title" required>
            <Input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </FormField>

          <FormField label="模板内容" htmlFor="content" required>
            <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={5} required />
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
            <FormField label="外部链接" htmlFor="sourceUrl" hint="可选">
              <Input id="sourceUrl" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
            </FormField>
            <FormField label="视频 URL" htmlFor="videoUrl" hint="可选">
              <Input id="videoUrl" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
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
