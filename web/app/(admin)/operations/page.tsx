"use client";

import { useEffect, useState } from "react";
import { fetchServerLogs } from "@/lib/admin";
import { Card, Button, Input, Select, EmptyState, Spinner } from "@/components/ui";

export default function OperationsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [level, setLevel] = useState("all");

  useEffect(() => {
    fetchServerLogs()
      .then((data) => {
        setLogs(data);
        setError("");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "获取日志失败");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter((line) => {
    const matchesFilter = filter ? line.toLowerCase().includes(filter.toLowerCase()) : true;
    const matchesLevel =
      level === "all"
        ? true
        : level === "error"
        ? line.includes('"level":50') || line.includes("ERROR") || line.includes('"status":5')
        : level === "warn"
        ? line.includes('"level":40') || line.includes("WARN")
        : level === "info"
        ? line.includes('"level":30') || line.includes("INFO")
        : true;
    return matchesFilter && matchesLevel;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">服务器日志</h2>
        <Button onClick={() => window.location.reload()} size="sm">
          刷新
        </Button>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="text"
            placeholder="搜索日志内容"
            className="w-72"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Select
            className="w-40"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="all">全部级别</option>
            <option value="error">错误</option>
            <option value="warn">警告</option>
            <option value="info">信息</option>
          </Select>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : error ? (
          <EmptyState title="加载失败" description={error} />
        ) : filteredLogs.length === 0 ? (
          <EmptyState title="暂无日志" description="当前筛选条件下没有匹配日志" />
        ) : (
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-xs font-mono">
              <tbody>
                {filteredLogs.map((line, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)]"
                  >
                    <td className="py-2 px-4 text-[var(--color-ink-secondary)] whitespace-pre-wrap break-all">
                      {line}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
