"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listTasks,
  delistTask,
  type Task,
  type TaskStatus,
  type TaskScopeType,
  scopeLabel,
  statusLabel,
} from "@/lib/tasks";
import {
  Button,
  Input,
  Select,
  Badge,
  Card,
  EmptyState,
  Skeleton,
  FormField,
} from "@/components/ui";
import { Inbox } from "lucide-react";

const PAGE_SIZE = 20;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface TaskQuery {
  page: number;
  status: TaskStatus | "";
  scopeType: TaskScopeType | "";
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState<TaskQuery>({
    page: 1,
    status: "",
    scopeType: "",
  });

  useEffect(() => {
    let cancelled = false;
    listTasks({
      status: query.status || undefined,
      scopeType: query.scopeType || undefined,
      page: query.page,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setTasks(result.items);
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

  const updateQuery = (patch: Partial<TaskQuery>) => {
    setLoading(true);
    setQuery((prev) => ({
      ...prev,
      ...patch,
      page: patch.page ?? 1,
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery({ page: 1 });
  };

  const handleReset = () => {
    setKeyword("");
    updateQuery({ status: "", scopeType: "", page: 1 });
  };

  const handleDelist = (id: string) => {
    if (!confirm("确定下架该任务？")) return;
    delistTask(id)
      .then(() => {
        updateQuery({ page: query.page });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "下架失败"));
  };

  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(normalizedKeyword)
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {error ? (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">任务管理</h1>
        <Button variant="primary" onClick={() => router.push("/tasks/create")}>
          新建任务
        </Button>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
          <FormField label="关键词" htmlFor="keyword" className="min-w-[200px]">
            <Input
              id="keyword"
              type="text"
              placeholder="搜索任务名称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </FormField>

          <FormField label="状态" htmlFor="status" className="min-w-[140px]">
            <Select
              id="status"
              value={query.status}
              onChange={(e) => updateQuery({ status: e.target.value as TaskStatus | "", page: 1 })}
            >
              <option value="">全部</option>
              <option value="published">进行中</option>
              <option value="delisted">已下架</option>
            </Select>
          </FormField>

          <FormField label="范围" htmlFor="scopeType" className="min-w-[140px]">
            <Select
              id="scopeType"
              value={query.scopeType}
              onChange={(e) => updateQuery({ scopeType: e.target.value as TaskScopeType | "", page: 1 })}
            >
              <option value="">全部</option>
              <option value="school">全校</option>
              <option value="college">学院</option>
              <option value="class">班级</option>
              <option value="pool">任务池</option>
            </Select>
          </FormField>

          <Button type="submit">查询</Button>
          <Button type="button" variant="secondary" onClick={handleReset}>
            重置
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">任务名称</th>
                    <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">范围</th>
                    <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">发布时间</th>
                    <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">截止时间</th>
                    <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">状态</th>
                    <th
                      className="text-left py-2 text-[var(--color-ink-muted)] font-medium"
                      title="完成率 = 人工终审通过(approved)人数 / 应打卡人数。与首页「累计完成打卡」(含 AI 通过)口径不同。"
                    >
                      完成率
                    </th>
                    <th className="text-right py-2 text-[var(--color-ink-muted)] font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          title="暂无任务"
                          icon={<Inbox className="w-6 h-6 text-[var(--color-ink-muted)]" />}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr key={task.id} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="py-3 text-[var(--color-ink)]">
                          <span className="inline-flex items-center gap-2">
                            {task.title}
                            {task.require_face && (
                              <Badge variant="warning">需人脸</Badge>
                            )}
                          </span>
                        </td>
                        <td className="py-3 text-[var(--color-ink-secondary)]">{scopeLabel(task)}</td>
                        <td className="py-3 text-[var(--color-ink-secondary)]">{formatDate(task.published_at)}</td>
                        <td className="py-3 text-[var(--color-ink-secondary)]">{formatDate(task.deadline_at)}</td>
                        <td className="py-3">
                          <Badge variant={task.status === "published" ? "info" : "neutral"}>
                            {statusLabel(task.status)}
                          </Badge>
                        </td>
                        <td className="py-3 text-[var(--color-ink-secondary)]">
                          {task.completion_rate !== undefined ? `${Math.round(task.completion_rate)}%` : "-"}
                        </td>
                        <td className="py-3 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/tasks/${task.id}/edit`)}
                          >
                            编辑
                          </Button>
                          {task.status === "published" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelist(task.id)}
                              className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                            >
                              下架
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
                <div className="text-sm text-[var(--color-ink-secondary)]">
                  共 {total} 条，第 {query.page} / {totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={query.page <= 1}
                    onClick={() => updateQuery({ page: query.page - 1 })}
                  >
                    上一页
                  </Button>
                  <Button
                    type="button"
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
