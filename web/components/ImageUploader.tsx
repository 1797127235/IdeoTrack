"use client";

import { useState, useRef } from "react";
import { uploadCoverImage } from "@/lib/upload";
import { Button } from "@/components/ui";
import { Upload, X } from "lucide-react";

interface ImageUploaderProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export default function ImageUploader({
  value,
  onChange,
  placeholder = "点击上传图片",
}: ImageUploaderProps) {
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
      const path = await uploadCoverImage(file);
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

  const imageUrl = value ? (value.startsWith("http") ? value : `/api/upload/cover?path=${encodeURIComponent(value)}`) : null;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {imageUrl ? (
        <div className="relative inline-block group">
          <img
            src={imageUrl}
            alt="封面图"
            className="h-32 w-auto rounded-lg border border-[var(--color-border)] object-cover"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-[var(--color-danger)] text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={uploading}
          className="flex flex-col items-center justify-center w-40 h-32 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-primary)] transition-colors"
        >
          <Upload className="w-6 h-6 mb-1" />
          <span className="text-xs">{uploading ? "上传中…" : placeholder}</span>
        </button>
      )}

      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleClick} isLoading={uploading}>
          {imageUrl ? "更换图片" : "上传图片"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            移除
          </Button>
        )}
      </div>
    </div>
  );
}
