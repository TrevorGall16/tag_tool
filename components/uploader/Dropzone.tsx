"use client";

import { useCallback, useState } from "react";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidImageType, resizeImageForApi } from "@/lib/image-processing";
import { useBatchStore, LocalImageItem } from "@/store/useBatchStore";
import { sanitizeFilename } from "@/lib/utils/slugify";

export interface DropzoneProps {
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
}

export function Dropzone({ maxFiles = 50, maxSizeMB = 25, disabled, className }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<{
    isProcessing: boolean;
    processed: number;
    total: number;
  }>({ isProcessing: false, processed: 0, total: 0 });

  const {
    ensureUnclusteredGroup,
    addImageToGroup,
    setProcessingState: setStoreProcessing,
  } = useBatchStore();

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

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setProcessingState({ isProcessing: true, processed: 0, total: files.length });
      setStoreProcessing({ isUploading: true });

      // Ensure unclustered group exists
      ensureUnclusteredGroup();

      let processed = 0;

      // Process files in parallel
      await Promise.all(
        files.map(async (file) => {
          try {
            const id = crypto.randomUUID();
            const thumbnailDataUrl = await resizeImageForApi(file, 512);

            const image: LocalImageItem = {
              id,
              file,
              originalFilename: file.name,
              sanitizedSlug: sanitizeFilename(file.name),
              thumbnailDataUrl,
              status: "pending",
            };

            addImageToGroup("unclustered", image);
          } catch (err) {
            console.error(`Failed to process ${file.name}:`, err);
          } finally {
            processed++;
            setProcessingState((prev) => ({ ...prev, processed }));
          }
        })
      );

      setProcessingState({ isProcessing: false, processed: 0, total: 0 });
      setStoreProcessing({ isUploading: false });
    },
    [ensureUnclusteredGroup, addImageToGroup, setStoreProcessing]
  );

  const handleFilesAccepted = useCallback(
    (files: File[]) => {
      const { valid, errors } = validateFiles(files);

      if (errors.length > 0 && errors[0]) {
        setError(errors[0]);
      } else {
        setError(null);
      }

      if (valid.length > 0) {
        processFiles(valid);
      }
    },
    [validateFiles, processFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);

      if (disabled || processingState.isProcessing) return;

      const files = Array.from(e.dataTransfer.files);
      handleFilesAccepted(files);
    },
    [disabled, processingState.isProcessing, handleFilesAccepted]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled && !processingState.isProcessing) {
        setIsDragActive(true);
      }
    },
    [disabled, processingState.isProcessing]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      handleFilesAccepted(files);

      // Reset input
      e.target.value = "";
    },
    [handleFilesAccepted]
  );

  const isDisabled = disabled || processingState.isProcessing;

  return (
    <div className={className} data-dropzone>
      <div
        role="region"
        aria-label="Image upload dropzone"
        aria-busy={processingState.isProcessing}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 rounded-xl p-12 text-center transition-all cursor-pointer",
          // Default state
          !isDragActive &&
            !isDisabled &&
            !error &&
            "border-dashed border-slate-300 bg-slate-50 hover:border-blue-600 hover:bg-blue-50 hover:shadow-[0_0_0_4px_rgba(37,99,235,0.1)]",
          // Drag-active state (solid border + scale)
          isDragActive && !isDisabled && "border-solid border-blue-600 bg-blue-100 scale-[1.02]",
          // Processing state
          processingState.isProcessing && "bg-blue-50 border-dashed border-blue-400",
          // Error state
          error && !isDragActive && "border-dashed border-red-500 bg-red-50",
          // Disabled state
          isDisabled &&
            !processingState.isProcessing &&
            "opacity-50 cursor-not-allowed border-dashed border-slate-200 bg-slate-50"
        )}
      >
        <label htmlFor="dropzone-file-input" className="sr-only">
          Upload images
        </label>
        <input
          id="dropzone-file-input"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInput}
          disabled={isDisabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        {processingState.isProcessing ? (
          <div className="text-slate-600">
            <Loader2
              className="mx-auto h-12 w-12 mb-4 animate-spin text-blue-600"
              aria-hidden="true"
            />
            <p className="text-lg font-medium text-slate-700" aria-live="polite">
              Processing {processingState.processed}/{processingState.total} images...
            </p>
            <p className="text-sm mt-1 text-slate-500">Resizing to 512px WebP thumbnails</p>
          </div>
        ) : error ? (
          <div className="text-slate-600">
            <AlertCircle className="mx-auto h-12 w-12 mb-4 text-red-500" aria-hidden="true" />
            <p className="text-lg font-medium text-slate-700">
              <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm mt-1 text-slate-500">
              JPG, PNG, or WebP (max {maxSizeMB}MB each)
            </p>
            <p className="text-sm mt-1 text-slate-500">Maximum {maxFiles} images per batch</p>
          </div>
        ) : (
          <div className="text-slate-600">
            <Upload className="mx-auto h-12 w-12 mb-4 text-slate-400" aria-hidden="true" />
            <p className="text-lg font-medium text-slate-700">
              <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm mt-1 text-slate-500">
              JPG, PNG, or WebP (max {maxSizeMB}MB each)
            </p>
            <p className="text-sm mt-1 text-slate-500">Maximum {maxFiles} images per batch</p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
