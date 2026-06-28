"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listTaskTemplates,
  delistTaskTemplate,
  deleteTaskTemplate,
  type TaskTemplate,
  type TaskTemplateStatus,
} from "@/lib/task-templates";
import { Button, Select, Card, EmptyState, Skeleton, FormField, Badge } from "@/components/ui";
import { Inbox } from "lucide-react";

const PAGE_SIZE = 20;

interface TemplateQuery {
  page: number;
  status: TaskTemplateStatus | "";
}

export default function TaskTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState<TemplateQuery>({ page: 1, status: "" });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listTaskTemplates({
      status: query.status || undefined,
      page: query.page,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setTemplates(result.items);
        setTotal(result.total);
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
  }, [query]);

  const updateQuery = (patch: Partial<TemplateQuery>) => {
    setQuery((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  };

  const handleDelist = async (id: string) => {
    if (!confirm("确定下架该模板？")) return;
    try {
      await delistTaskTemplate(id);
      updateQuery({ page: query.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : "下架失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该模板？已派发的任务不会受影响。")) return;
    try {
      await deleteTaskTemplate(id);
      updateQuery({ page: query.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {error ? (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">任务模板库</h1>
        <Button variant="primary" onClick={() => router.push("/task-templates/create")}>
          新建模板
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="状态" htmlFor="status" className="min-w-[140px]">
            <Select
              id="status"
              value={query.status}
              onChange={(e) => updateQuery({ status: e.target.value as TaskTemplateStatus | "", page: 1 })}
            >
              <option value="">全部</option>
              <option value="published">已上架</option>
              <option value="delisted">已下架</option>
            </Select>
          </FormField>
        </div>
      </Card>

      <Card className="p-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        ) : templates.length === 0 ? (
          <EmptyState icon={<Inbox className="w-6 h-6 text-[var(--color-ink-muted)]" />} title="暂无模板" description="点击右上角新建模板" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">模板名称</th>
                    <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">状态</th>
                    <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">创建时间</th>
                    <th className="text-right py-2 text-[var(--color-ink-muted)] font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]">
                      <td className="py-3">{template.title}</td>
                      <td className="py-3">
                        <Badge variant={template.status === "published" ? "success" : "neutral"}>
                          {template.status === "published" ? "已上架" : "已下架"}
                        </Badge>
                      </td>
                      <td className="py-3 text-[var(--color-ink-secondary)]">
                        {new Date(template.created_at).toLocaleString("zh-CN")}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/task-templates/${template.id}/publish`)}
                          >
                            发布
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/task-templates/${template.id}/edit`)}
                          >
                            编辑
                          </Button>
                          {template.status === "published" && (
                            <Button variant="ghost" size="sm" onClick={() => handleDelist(template.id)}>
                              下架
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
                <span className="text-sm text-[var(--color-ink-secondary)]">
                  第 {query.page} / {totalPages} 页，共 {total} 条
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={query.page <= 1}
                    onClick={() => updateQuery({ page: query.page - 1 })}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={query.page >= totalPages}
                    onClick={() => updateQuery({ page: query.page + 1 })}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
