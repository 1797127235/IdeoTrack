"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui";
import { Upload, X, FileText } from "lucide-react";
import { uploadAttachment } from "@/lib/upload";

interface FileUploaderProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export default function FileUploader({
  value,
  onChange,
  placeholder = "点击上传附件",
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const path = await uploadAttachment(file);
      onChange(path);
    } catch (err) {
      alert(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleClear = () => {
    onChange(null);
  };

  const fileName = value ? decodeURIComponent(value.split("/").pop() || "附件") : null;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mp3,.wav,.ogg,.mov"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
          <FileText className="w-5 h-5 text-[var(--color-primary)]" />
          <div className="flex-1 min-w-0">
            <a
              href={value.startsWith("http") ? value : `/api${value.startsWith("/") ? value : `/upload/attachment?path=${encodeURIComponent(value)}`}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[var(--color-primary)] hover:underline truncate block"
            >
              {fileName}
            </a>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full hover:bg-[var(--color-danger-subtle)] text-[var(--color-danger)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={uploading}
          className="flex flex-col items-center justify-center w-full h-24 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-primary)] transition-colors"
        >
          <Upload className="w-6 h-6 mb-1" />
          <span className="text-xs">{uploading ? "上传中…" : placeholder}</span>
          <span className="text-[10px] mt-1 opacity-70">支持 PDF、Word、Excel、PPT、图片、音视频等，最大 20MB</span>
        </button>
      )}

      {!value && (
        <Button type="button" variant="secondary" size="sm" onClick={handleClick} isLoading={uploading}>
          {uploading ? "上传中…" : "上传附件"}
        </Button>
      )}
    </div>
  );
}
