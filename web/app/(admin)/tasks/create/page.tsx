"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createTask, type TaskScopeType, type TaskCategory, type CheckinType } from "@/lib/tasks";
import { listColleges, listClasses, type College, type Class } from "@/lib/users";
import GeofencePicker, { type GeofenceValue } from "@/components/GeofencePicker";
import { Button, Input, Textarea, Select, Card, FormField, Switch } from "@/components/ui";

const categories: TaskCategory[] = ["学习", "实践", "活动", "会议", "阅读"];
const checkinTypes: { value: CheckinType; label: string }[] = [
  { value: "text", label: "文字心得" },
  { value: "image", label: "图片上传" },
  { value: "video", label: "视频上传" },
  { value: "mixed", label: "图文混合" },
];

export default function CreateTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [category, setCategory] = useState<TaskCategory | "">("");
  const [tags, setTags] = useState("");
  const [guidingQuestions, setGuidingQuestions] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [checkinType, setCheckinType] = useState<CheckinType>("text");
  const [requireText, setRequireText] = useState(false);
  const [requireImage, setRequireImage] = useState(false);
  const [requireVideo, setRequireVideo] = useState(false);
  const [minTextLength, setMinTextLength] = useState("");
  const [maxImages, setMaxImages] = useState("");
  const [scopeType, setScopeType] = useState<TaskScopeType>("school");
  const [scopeId, setScopeId] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [geofence, setGeofence] = useState<GeofenceValue | null>(null);
  const [requireLocation, setRequireLocation] = useState(false);
  const [requireFace, setRequireFace] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (requireLocation && !geofence) {
        throw new Error("开启定位签到后，请先选择签到范围");
      }

      await createTask({
        title: title.trim(),
        description: description.trim() || null,
        content: content.trim(),
        cover_image: coverImage.trim() || null,
        category: category || null,
        tags: tagList.length > 0 ? tagList : null,
        guiding_questions: questions.length > 0 ? questions : null,
        source_url: sourceUrl.trim() || null,
        video_url: videoUrl.trim() || null,
        checkin_type: checkinType,
        require_text: requireText,
        require_image: requireImage,
        require_video: requireVideo,
        min_text_length: minTextLength ? parseInt(minTextLength, 10) : null,
        max_images: maxImages ? parseInt(maxImages, 10) : null,
        require_location: requireLocation,
        scope_type: scopeType,
        scope_id: scopeType === "school" ? null : scopeId,
        published_at: new Date(publishedAt).toISOString(),
        deadline_at: new Date(deadlineAt).toISOString(),
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
      router.push("/tasks");
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
          <FormField label="任务名称" htmlFor="title" required>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入任务名称"
              required
            />
          </FormField>

          <FormField label="任务说明" htmlFor="description" hint="可选">
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="输入简短说明"
            />
          </FormField>

          <FormField label="任务内容" htmlFor="content" required>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="输入任务正文"
              required
            />
          </FormField>

          <FormField label="封面图 URL" htmlFor="coverImage" hint="可选">
            <Input
              id="coverImage"
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="任务类型" htmlFor="category">
              <Select id="category" value={category} onChange={(e) => setCategory(e.target.value as TaskCategory | "")}>
                <option value="">未分类</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="标签" htmlFor="tags" hint="用英文逗号分隔">
              <Input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="红色教育, 党史学习"
              />
            </FormField>
          </div>

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

          <FormField label="打卡类型" htmlFor="checkinType">
            <Select
              id="checkinType"
              value={checkinType}
              onChange={(e) => {
                const value = e.target.value as CheckinType;
                setCheckinType(value);
                if (value === "text") {
                  setRequireImage(false);
                  setRequireVideo(false);
                } else if (value === "image") {
                  setRequireText(false);
                  setRequireVideo(false);
                } else if (value === "video") {
                  setRequireText(false);
                  setRequireImage(false);
                }
              }}
            >
              {checkinTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="最少字数" htmlFor="minTextLength" hint="可选">
              <Input
                id="minTextLength"
                type="number"
                min={0}
                value={minTextLength}
                onChange={(e) => setMinTextLength(e.target.value)}
              />
            </FormField>
            <FormField label="最多图片数" htmlFor="maxImages" hint="可选，1-9">
              <Input
                id="maxImages"
                type="number"
                min={1}
                max={9}
                value={maxImages}
                onChange={(e) => setMaxImages(e.target.value)}
              />
            </FormField>
          </div>

          <div className="space-y-4">
            <FormField label="必填内容" htmlFor="requireText">
              <div className="flex items-center gap-3 pt-1">
                <Switch id="requireText" checked={requireText} onCheckedChange={setRequireText} />
                <span className="text-sm text-[var(--color-ink-secondary)]">必须写心得</span>
              </div>
            </FormField>
            {checkinType === "mixed" && (
              <>
                <FormField label="" htmlFor="requireImage">
                  <div className="flex items-center gap-3 pt-1">
                    <Switch id="requireImage" checked={requireImage} onCheckedChange={setRequireImage} />
                    <span className="text-sm text-[var(--color-ink-secondary)]">必须上传图片</span>
                  </div>
                </FormField>
                <FormField label="" htmlFor="requireVideo">
                  <div className="flex items-center gap-3 pt-1">
                    <Switch id="requireVideo" checked={requireVideo} onCheckedChange={setRequireVideo} />
                    <span className="text-sm text-[var(--color-ink-secondary)]">必须上传视频</span>
                  </div>
                </FormField>
              </>
            )}
          </div>

          <FormField
            label="需定位签到"
            htmlFor="requireLocation"
            hint="开启后，学生打卡时必须获取当前位置，并在指定范围内才能完成签到"
          >
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

          <FormField
            label="需人脸打卡"
            htmlFor="requireFace"
            hint="开启后，学生签到时必须用相机拍现场照，与注册照比对通过才能打卡"
          >
            <div className="flex items-center gap-3 pt-1">
              <Switch id="requireFace" checked={requireFace} onCheckedChange={setRequireFace} />
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
