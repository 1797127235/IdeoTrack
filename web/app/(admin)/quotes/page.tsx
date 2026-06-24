"use client";

import { useEffect, useState } from "react";
import {
  listQuotes,
  createQuote,
  updateQuote,
  deleteQuote,
  type Quote,
} from "@/lib/quotes";

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
    return <div className="text-sm text-[var(--color-ink-secondary)]">加载中…</div>;
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">名言管理</h2>
        <button
          onClick={() => setIsFormOpen(true)}
          className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium"
        >
          新增名言
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
          <h3 className="text-base font-medium text-[var(--color-ink)] mb-4">
            {editingQuote ? "编辑名言" : "新增名言"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="名言内容"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="作者"
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium"
              >
                保存
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
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
            {quotes.map((quote) => (
              <tr key={quote.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="py-3 text-[var(--color-ink)] max-w-md truncate">{quote.content}</td>
                <td className="py-3 text-[var(--color-ink-secondary)]">{quote.author || "-"}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      quote.is_enabled
                        ? "bg-[var(--color-success-subtle)] text-[var(--color-success)]"
                        : "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]"
                    }`}
                  >
                    {quote.is_enabled ? "启用" : "禁用"}
                  </span>
                </td>
                <td className="py-3 text-right space-x-3">
                  <button
                    onClick={() => {
                      setEditingQuote(quote);
                      setContent(quote.content);
                      setAuthor(quote.author || "");
                      setIsFormOpen(true);
                    }}
                    className="text-[var(--color-accent)] hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(quote.id)}
                    className="text-[var(--color-danger)] hover:underline"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
