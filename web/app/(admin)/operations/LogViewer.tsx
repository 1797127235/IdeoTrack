"use client";

import { useMemo, useState } from "react";
import { Card, Input, Select, EmptyState, Badge } from "@/components/ui";
import { ChevronDown, ChevronRight, FileJson } from "lucide-react";

interface LogEntry {
  raw: string;
  parsed: boolean;
  level?: number;
  time?: number | string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  msg?: string;
  requestId?: string;
  userId?: string;
  hostname?: string;
  pid?: number;
}

const LEVEL_NAMES: Record<number, string> = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL",
};

function levelName(level?: number): string {
  if (level === undefined) return "-";
  return LEVEL_NAMES[level] || String(level);
}

function levelVariant(level?: number): "success" | "warning" | "danger" | "info" | "neutral" {
  if (level === undefined) return "neutral";
  if (level >= 60) return "danger";
  if (level >= 50) return "danger";
  if (level >= 40) return "warning";
  if (level >= 30) return "info";
  return "neutral";
}

function statusVariant(status?: number): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === undefined) return "neutral";
  if (status >= 500) return "danger";
  if (status >= 400) return "warning";
  if (status >= 300) return "info";
  return "success";
}

function formatLogTime(time?: number | string): string {
  if (time === undefined) return "-";
  const ts = typeof time === "string" ? Date.parse(time) || Number(time) : time;
  if (!Number.isFinite(ts)) return "-";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

function parseLogLine(line: string): LogEntry {
  try {
    const obj = JSON.parse(line);
    return {
      raw: line,
      parsed: true,
      level: typeof obj.level === "number" ? obj.level : undefined,
      time: obj.time,
      method: obj.method,
      path: obj.path,
      status: typeof obj.status === "number" ? obj.status : undefined,
      durationMs: typeof obj.durationMs === "number" ? obj.durationMs : undefined,
      msg: obj.msg,
      requestId: obj.requestId,
      userId: obj.userId,
      hostname: obj.hostname,
      pid: typeof obj.pid === "number" ? obj.pid : undefined,
    };
  } catch {
    return { raw: line, parsed: false };
  }
}

function durationClass(ms?: number): string {
  if (ms === undefined) return "text-[var(--color-ink-secondary)]";
  if (ms >= 1000) return "text-[var(--color-danger)] font-medium";
  if (ms >= 500) return "text-[var(--color-warning)] font-medium";
  return "text-[var(--color-ink-secondary)]";
}

export interface LogViewerProps {
  logs: string[];
}

export default function LogViewer({ logs }: LogViewerProps) {
  const [filter, setFilter] = useState("");
  const [level, setLevel] = useState("all");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const parsed = useMemo(() => logs.map(parseLogLine), [logs]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return parsed.filter((entry) => {
      const matchesLevel =
        level === "all"
          ? true
          : level === "error"
          ? entry.level !== undefined && entry.level >= 50
          : level === "warn"
          ? entry.level === 40
          : level === "info"
          ? entry.level === 30
          : level === "debug"
          ? entry.level === 20
          : true;
      if (!matchesLevel) return false;
      if (!q) return true;
      const haystack =
        `${entry.raw} ${entry.msg ?? ""} ${entry.method ?? ""} ${entry.path ?? ""} ${entry.requestId ?? ""} ${entry.userId ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [parsed, filter, level]);

  const toggleExpand = (idx: number) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="text"
            placeholder="搜索日志内容 / 路径 / RequestId / UserId"
            className="w-full sm:w-[22rem] text-base h-11"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Select className="w-40 text-base h-11" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">全部级别</option>
            <option value="debug">DEBUG</option>
            <option value="info">INFO</option>
            <option value="warn">WARN</option>
            <option value="error">ERROR+</option>
          </Select>
          <span className="text-base text-[var(--color-ink-muted)] ml-auto">
            共 {filtered.length} 条 / {logs.length} 条原始日志
          </span>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="暂无日志" description="当前筛选条件下没有匹配日志" />
        ) : (
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-base border-collapse">
              <thead className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left py-3.5 px-5 text-base font-semibold uppercase tracking-wider text-[var(--color-ink)] whitespace-nowrap">
                    时间
                  </th>
                  <th className="text-left py-3.5 px-4 text-base font-semibold uppercase tracking-wider text-[var(--color-ink)] whitespace-nowrap">
                    级别
                  </th>
                  <th className="text-left py-3.5 px-4 text-base font-semibold uppercase tracking-wider text-[var(--color-ink)] whitespace-nowrap">
                    方法
                  </th>
                  <th className="text-left py-3.5 px-4 text-base font-semibold uppercase tracking-wider text-[var(--color-ink)] whitespace-nowrap">
                    路径
                  </th>
                  <th className="text-left py-3.5 px-4 text-base font-semibold uppercase tracking-wider text-[var(--color-ink)] whitespace-nowrap">
                    状态
                  </th>
                  <th className="text-left py-3.5 px-4 text-base font-semibold uppercase tracking-wider text-[var(--color-ink)] whitespace-nowrap">
                    耗时
                  </th>
                  <th className="text-left py-3.5 px-5 text-base font-semibold uppercase tracking-wider text-[var(--color-ink)] whitespace-nowrap">
                    消息
                  </th>
                  <th className="py-3.5 px-5 text-right text-base font-semibold uppercase tracking-wider text-[var(--color-ink)] whitespace-nowrap">
                    详情
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, idx) => (
                  <>
                    <tr
                      key={idx}
                      className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors"
                    >
                      <td className="py-3.5 px-5 text-base tabular-nums text-[var(--color-ink-secondary)] whitespace-nowrap">
                        {formatLogTime(entry.time)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {entry.parsed && entry.level !== undefined ? (
                          <Badge variant={levelVariant(entry.level)} className="text-base">
                            {levelName(entry.level)}
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-base">-</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-base font-semibold text-[var(--color-ink)] whitespace-nowrap">
                        {entry.method || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-base text-[var(--color-ink)] whitespace-nowrap max-w-[16rem] truncate" title={entry.path}>
                        {entry.path || "-"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {entry.status !== undefined ? (
                          <Badge variant={statusVariant(entry.status)} className="text-base tabular-nums">
                            {entry.status}
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-base">-</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-base tabular-nums whitespace-nowrap">
                        {entry.durationMs !== undefined ? (
                          <span className={durationClass(entry.durationMs)}>{entry.durationMs}ms</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-base text-[var(--color-ink)] max-w-[24rem]">
                        <div className="truncate" title={entry.msg || entry.raw}>
                          {entry.msg || (entry.parsed ? "-" : entry.raw)}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => toggleExpand(idx)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg)] transition-colors"
                          title="查看原始 JSON"
                        >
                          {expanded[idx] ? (
                            <ChevronDown className="w-6 h-6" />
                          ) : (
                            <ChevronRight className="w-6 h-6" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expanded[idx] && (
                      <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                        <td colSpan={8} className="py-3 px-4">
                          <div className="flex items-start gap-2">
                            <FileJson className="w-5 h-5 text-[var(--color-accent)] mt-1 shrink-0" />
                            <pre className="text-base font-mono text-[var(--color-ink-secondary)] whitespace-pre-wrap break-all max-h-60 overflow-auto">
                              {entry.raw}
                            </pre>
                          </div>
                          {entry.parsed && (
                            <div className="mt-2 flex flex-wrap gap-4 text-base text-[var(--color-ink-muted)]">
                              {entry.requestId && <span>requestId: {entry.requestId}</span>}
                              {entry.userId && <span>userId: {entry.userId}</span>}
                              {entry.hostname && <span>hostname: {entry.hostname}</span>}
                              {entry.pid !== undefined && <span>pid: {entry.pid}</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
