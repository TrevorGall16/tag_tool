"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { isValidImageType } from "@/lib/image-processing";

export interface DropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
}

export function Dropzone({
  onFilesAccepted,
  maxFiles = 50,
  maxSizeMB = 25,
  disabled,
  className,
}: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const errors: string[] = [];
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      for (const file of files) {
        if (!isValidImageType(file)) {
          errors.push(`${file.name}: Invalid file type. Only JPG, PNG, and WebP are allowed.`);
          continue;
        }
        if (file.size > maxSizeBytes) {
          errors.push(`${file.name}: File too large. Maximum size is ${maxSizeMB}MB.`);
          continue;
        }
        valid.push(file);
      }

      if (valid.length > maxFiles) {
        errors.push(`Only the first ${maxFiles} files will be processed.`);
        return { valid: valid.slice(0, maxFiles), errors };
      }

      return { valid, errors };
    },
    [maxFiles, maxSizeMB]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);
      setError(null);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const { valid, errors } = validateFiles(files);

      if (errors.length > 0 && errors[0]) {
        setError(errors[0]);
      }

      if (valid.length > 0) {
        onFilesAccepted(valid);
      }
    },
    [disabled, validateFiles, onFilesAccepted]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragActive(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const files = e.target.files ? Array.from(e.target.files) : [];
      const { valid, errors } = validateFiles(files);

      if (errors.length > 0 && errors[0]) {
        setError(errors[0]);
      }

      if (valid.length > 0) {
        onFilesAccepted(valid);
      }

      // Reset input
      e.target.value = "";
    },
    [validateFiles, onFilesAccepted]
  );

  return (
    <div className={className}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer",
          isDragActive && !disabled && "border-blue-400 bg-blue-50",
          !isDragActive &&
            !disabled &&
            "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50",
          disabled && "opacity-50 cursor-not-allowed border-slate-200"
        )}
      >
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="text-slate-500">
          <svg
            className="mx-auto h-12 w-12 mb-4"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-sm">
            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs mt-1">JPG, PNG, or WebP (max {maxSizeMB}MB each)</p>
          <p className="text-xs mt-1">Maximum {maxFiles} images per batch</p>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
