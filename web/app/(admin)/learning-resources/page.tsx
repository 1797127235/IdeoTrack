"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  listLearningResources,
  deleteLearningResource,
  updateLearningResourceStatus,
  type LearningResource,
  type LearningResourceFilters,
  type LearningResourceStatus,
  type LearningResourceType,
  typeLabel,
  statusLabel,
  getCoverUrl,
} from "@/lib/learning-resources";
import { Button, Badge, Card, EmptyState, Skeleton, Select } from "@/components/ui";

const RESOURCE_TYPES = [
  { value: "", label: "全部类型" },
  { value: "article", label: "文章" },
  { value: "video", label: "视频" },
  { value: "document", label: "文档" },
  { value: "link", label: "链接" },
];

const RESOURCE_STATUSES = [
  { value: "", label: "全部状态" },
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
];

export default function LearningResourcesPage() {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<LearningResourceFilters>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const loadData = () => {
    setLoading(true);
    listLearningResources({ ...filters, page, limit })
      .then((result) => {
        setResources(result.items);
        setTotal(result.total);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const handleDelete = (id: string) => {
    if (!confirm("确定删除该学习资料？")) return;
    deleteLearningResource(id)
      .then(() => loadData())
      .catch((err) => setError(err instanceof Error ? err.message : "删除失败"));
  };

  const handleToggleStatus = (resource: LearningResource) => {
    const nextStatus = resource.status === "published" ? "draft" : "published";
    updateLearningResourceStatus(resource.id, nextStatus)
      .then(() => loadData())
      .catch((err) => setError(err instanceof Error ? err.message : "状态更新失败"));
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      {error ? (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">学习资料</h2>
        <Link href="/learning-resources/create">
          <Button>新增资料</Button>
        </Link>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            value={filters.type || ""}
            onChange={(e) => {
              const value = e.target.value;
              setFilters((prev) => ({
                ...prev,
                type: value === "" ? undefined : (value as LearningResourceType),
              }));
              setPage(1);
            }}
            className="sm:w-40"
          >
            {RESOURCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select
            value={filters.status || ""}
            onChange={(e) => {
              const value = e.target.value;
              setFilters((prev) => ({
                ...prev,
                status: value === "" ? undefined : (value as LearningResourceStatus),
              }));
              setPage(1);
            }}
            className="sm:w-40"
          >
            {RESOURCE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : resources.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="暂无学习资料"
            description="点击右上角按钮添加第一条学习资料。"
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <Card key={resource.id} className="overflow-hidden flex flex-col">
                <div className="relative h-36 bg-[var(--color-bg)]">
                  {resource.cover_url ? (
                    <Image
                      src={getCoverUrl(resource.id)}
                      alt={resource.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[var(--color-ink-muted)] text-sm">
                      暂无封面
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-[var(--color-ink)] line-clamp-1 flex-1">
                      {resource.title}
                    </h3>
                    <Badge variant={resource.status === "published" ? "success" : "neutral"}>
                      {statusLabel(resource.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--color-ink-secondary)] line-clamp-2 mb-3 flex-1">
                    {resource.description || "暂无简介"}
                  </p>
                  <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)] mb-3">
                    <span>{typeLabel(resource.type)}</span>
                    <span>{resource.category || "未分类"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleStatus(resource)}
                    >
                      {resource.status === "published" ? "下架" : "发布"}
                    </Button>
                    <Link href={`/learning-resources/${resource.id}/edit`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">
                        编辑
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(resource.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-[var(--color-ink-secondary)]">
                共 {total} 条，第 {page}/{totalPages} 页
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  上一页
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
