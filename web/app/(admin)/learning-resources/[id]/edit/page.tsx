"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getLearningResource,
  updateLearningResource,
  typeLabel,
  type LearningResourceType,
  getCoverUrl,
} from "@/lib/learning-resources";
import { Button, Input, Textarea, Select, Card, FormField, Switch } from "@/components/ui";

const RESOURCE_TYPES: { value: LearningResourceType; label: string }[] = [
  { value: "article", label: "文章" },
  { value: "video", label: "视频" },
  { value: "document", label: "文档" },
  { value: "link", label: "链接" },
];

const RESOURCE_CATEGORIES = ["思政理论", "专题视频", "红色教育", "阅读材料"];

export default function EditLearningResourcePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<LearningResourceType>("article");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [hasExistingCover, setHasExistingCover] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLearningResource(id)
      .then((resource) => {
        setTitle(resource.title);
        setDescription(resource.description || "");
        setType(resource.type);
        setContent(resource.content || "");
        setUrl(resource.url || "");
        setCategory(resource.category || "");
        setTags(resource.tags?.join(",") || "");
        setStatus(resource.status);
        setHasExistingCover(!!resource.cover_url);
        if (resource.cover_url) {
          setCoverPreview(getCoverUrl(resource.id));
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/^image\/(jpe?g|png|webp)$/.test(file.type)) {
      setError("仅支持 jpg/png/webp 图片");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过 5MB");
      return;
    }

    setCover(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
    setError("");
  };

  const handleRemoveCover = () => {
    setCover(null);
    setCoverPreview(null);
    setHasExistingCover(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      if (!title.trim()) {
        throw new Error("标题不能为空");
      }

      if ((type === "link" || type === "video") && !url.trim()) {
        throw new Error(`${typeLabel(type)}类型必须填写 URL`);
      }

      await updateLearningResource(id, {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        content: content.trim() || undefined,
        url: url.trim() || undefined,
        category: category.trim() || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        status,
        cover: cover || undefined,
      });

      router.push("/learning-resources");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <Card className="p-6 space-y-4">
          <div className="h-6 w-32 bg-[var(--color-bg)] rounded animate-pulse" />
          <div className="h-10 w-full bg-[var(--color-bg)] rounded animate-pulse" />
          <div className="h-24 w-full bg-[var(--color-bg)] rounded animate-pulse" />
          <div className="h-10 w-full bg-[var(--color-bg)] rounded animate-pulse" />
        </Card>
      </div>
    );
  }

  const showUrlField = type === "link" || type === "video";
  const showContentField = type === "article" || type === "document";

  return (
    <div className="max-w-2xl">
      {error ? (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-6">编辑学习资料</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField label="标题" htmlFor="title" required>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入资料标题"
            />
          </FormField>

          <FormField label="简介" htmlFor="description">
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简短描述资料内容"
              rows={3}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="类型" htmlFor="type" required>
              <Select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as LearningResourceType)}
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="分类" htmlFor="category">
              <Select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">未分类</option>
                {RESOURCE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {showUrlField && (
            <FormField label="URL" htmlFor="url" required={showUrlField}>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={type === "video" ? "视频链接" : "外部链接"}
              />
            </FormField>
          )}

          {showContentField && (
            <FormField label="内容" htmlFor="content">
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="图文内容（支持纯文本）"
                rows={8}
              />
            </FormField>
          )}

          <FormField label="标签" htmlFor="tags">
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="用英文逗号分隔多个标签"
            />
          </FormField>

          <FormField label="封面图" htmlFor="cover">
            <div className="space-y-3">
              <input
                id="cover"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverChange}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {coverPreview ? "更换封面图" : "上传封面图"}
                </Button>
                {(coverPreview || hasExistingCover) && (
                  <Button type="button" variant="ghost" onClick={handleRemoveCover}>
                    移除封面
                  </Button>
                )}
              </div>
              {coverPreview && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-[var(--color-border)]">
                  <img
                    src={coverPreview}
                    alt="封面预览"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <p className="text-xs text-[var(--color-ink-muted)]">
                支持 jpg/png/webp，最大 5MB
              </p>
            </div>
          </FormField>

          <div className="flex items-center gap-3 py-2">
            <Switch
              id="status"
              checked={status === "published"}
              onCheckedChange={(checked) => setStatus(checked ? "published" : "draft")}
            />
            <label htmlFor="status" className="text-sm text-[var(--color-ink-secondary)]">
              {status === "published" ? "发布后立即可见" : "保存为草稿"}
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
            <Link href="/learning-resources">
              <Button type="button" variant="secondary">
                取消
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
