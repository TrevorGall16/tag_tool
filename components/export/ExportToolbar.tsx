"use client";

import { useState } from "react";
import { Download, CheckCircle, AlertCircle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useBatchStore } from "@/store/useBatchStore";
import { ExportEngine } from "@/lib/export";
import { ExportSettings } from "./ExportSettings";
import type {
  ExportProgress,
  ExportResult,
  ExportSettings as ExportSettingsType,
} from "@/lib/export";

export interface ExportToolbarProps {
  className?: string;
}

export function ExportToolbar({ className }: ExportToolbarProps) {
  const { groups, marketplace, exportSettings, updateExportSettings } = useBatchStore();

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const exportableGroups = groups.filter(
    (g) =>
      g.id !== "unclustered" && g.images.length > 0 && (g.sharedTitle || g.sharedTags.length > 0)
  );
  const totalExportableImages = exportableGroups.reduce((sum, g) => sum + g.images.length, 0);
  const canExport = totalExportableImages > 0 && !isExporting;

  const handleExport = async () => {
    if (!canExport) return;

    setIsExporting(true);
    setResult(null);
    setShowResult(false);
    setProgress(null);

    try {
      const engine = new ExportEngine({ marketplace, settings: exportSettings });
      engine.onProgress(setProgress);

      const exportResult = await engine.exportGroups(groups);
      setResult(exportResult);

      if (exportResult.success && exportResult.blob && exportResult.filename) {
        ExportEngine.downloadBlob(exportResult.blob, exportResult.filename);
      }

      setShowResult(true);
      setTimeout(() => setShowResult(false), 5000);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Export failed",
        stats: { totalGroups: 0, totalImages: 0, skippedImages: 0 },
      });
      setShowResult(true);
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const getButtonText = () => {
    if (isExporting && progress) {
      switch (progress.phase) {
        case "preparing":
          return "Preparing...";
        case "processing":
          return `Processing ${progress.current}/${progress.total}`;
        case "compressing":
          return "Creating ZIP...";
        default:
          return "Exporting...";
      }
    }
    if (totalExportableImages === 0) {
      return "No images to export";
    }
    return `Download All (${totalExportableImages})`;
  };

  const handleSettingsChange = (newSettings: ExportSettingsType) => {
    updateExportSettings(newSettings);
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button
        onClick={() => setShowSettings(true)}
        variant="outline"
        size="md"
        title="Export Settings"
      >
        <Settings2 className="h-4 w-4" />
      </Button>

      <Button
        onClick={handleExport}
        disabled={!canExport}
        isLoading={isExporting}
        variant="primary"
        size="md"
      >
        {!isExporting && <Download className="h-4 w-4 mr-2" />}
        {getButtonText()}
      </Button>

      {showResult && result && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
            result.success
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          )}
        >
          {result.success ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Exported {result.stats.totalImages} images
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              {result.error}
            </>
          )}
        </div>
      )}

      <ExportSettings
        settings={exportSettings}
        onSettingsChange={handleSettingsChange}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
