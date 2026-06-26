"use client";

import { useEffect, useState } from "react";
import {
  listQuotes,
  createQuote,
  updateQuote,
  deleteQuote,
  type Quote,
} from "@/lib/quotes";
import {
  Button,
  Input,
  Textarea,
  Badge,
  Card,
  EmptyState,
  Skeleton,
  FormField,
} from "@/components/ui";

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");

  const loadData = () => {
    listQuotes()
      .then((data) => {
        setQuotes(data);
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
  }, []);

  const resetForm = () => {
    setContent("");
    setAuthor("");
    setEditingQuote(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const action = editingQuote
      ? updateQuote(editingQuote.id, { content: content.trim(), author: author.trim() || undefined })
      : createQuote({ content: content.trim(), author: author.trim() || undefined });

    action
      .then(() => {
        resetForm();
        loadData();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "保存失败");
      });
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定删除该名言？")) return;
    deleteQuote(id)
      .then(() => loadData())
      .catch((err) => setError(err instanceof Error ? err.message : "删除失败"));
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Card className="p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </Card>
        <Card className="p-6 space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">名言管理</h2>
        <Button onClick={() => setIsFormOpen(true)}>新增名言</Button>
      </div>

      {isFormOpen && (
        <Card className="p-6">
          <h3 className="text-base font-medium text-[var(--color-ink)] mb-4">
            {editingQuote ? "编辑名言" : "新增名言"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="名言内容" htmlFor="content" required>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="名言内容"
                rows={3}
              />
            </FormField>
            <FormField label="作者" htmlFor="author">
              <Input
                id="author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="作者"
              />
            </FormField>
            <div className="flex gap-3">
              <Button type="submit">保存</Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                取消
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">名言内容</th>
                <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">作者</th>
                <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">状态</th>
                <th className="text-right py-2 text-[var(--color-ink-muted)] font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      title="暂无可用的名言"
                      description="点击右上角按钮添加一条名言。"
                    />
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 text-[var(--color-ink)] max-w-md truncate">{quote.content}</td>
                    <td className="py-3 text-[var(--color-ink-secondary)]">{quote.author || "-"}</td>
                    <td className="py-3">
                      <Badge variant={quote.is_enabled ? "success" : "danger"}>
                        {quote.is_enabled ? "启用" : "禁用"}
                      </Badge>
                    </td>
                    <td className="py-3 text-right space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        onClick={() => {
                          setEditingQuote(quote);
                          setContent(quote.content);
                          setAuthor(quote.author || "");
                          setIsFormOpen(true);
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(quote.id)}
                      >
                        删除
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
