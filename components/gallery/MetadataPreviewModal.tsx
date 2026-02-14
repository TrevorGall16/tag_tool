"use client";

import { useState, useMemo } from "react";
import {
  X,
  Eye,
  Code2,
  AlertTriangle,
  CheckCircle2,
  Download,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { copyToClipboard, downloadString } from "@/lib/utils";
import { useBatchStore, type LocalGroup } from "@/store/useBatchStore";
import { generateStockCSV, CSV_PRESETS, formatPreviewCsv } from "@/lib/export";
import type { CsvFormatPreset } from "@/lib/export";

export interface MetadataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: LocalGroup[];
}

// ─── Platform Limits ─────────────────────────────────────────

interface PlatformLimits {
  titleMax: number;
  descriptionMax: number;
  tagsMax: number;
  tagFormat: string;
}

const PLATFORM_LIMITS: Record<string, PlatformLimits> = {
  etsy: { titleMax: 140, descriptionMax: 2000, tagsMax: 13, tagFormat: "long-tail phrases" },
  stock: { titleMax: 200, descriptionMax: 2000, tagsMax: 49, tagFormat: "single keywords" },
  standard: { titleMax: 200, descriptionMax: 2000, tagsMax: 50, tagFormat: "mixed keywords" },
};

// ─── Helpers ─────────────────────────────────────────────────

function getGroupMetadata(group: LocalGroup) {
  const firstImage = group.images[0];
  const title = firstImage?.userTitle || group.sharedTitle || firstImage?.aiTitle || "";
  const description = group.sharedDescription || "";
  const tags = firstImage?.userTags || group.sharedTags || firstImage?.aiTags || [];
  return { title, description, tags };
}

// ─── Character Counter ───────────────────────────────────────

function CharCounter({ current, max, label }: { current: number; max: number; label?: string }) {
  const isOver = current > max;
  const pct = Math.min((current / max) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-slate-400">{label}</span>}
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isOver ? "bg-red-500" : pct > 80 ? "bg-amber-400" : "bg-emerald-400"
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs font-mono tabular-nums",
          isOver ? "text-red-600 font-bold" : "text-slate-500"
        )}
      >
        {current} / {max}
      </span>
      {isOver && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function MetadataPreviewModal({ isOpen, onClose, groups }: MetadataPreviewModalProps) {
  const { strategy, marketplace, exportSettings } = useBatchStore();
  const [activeTab, setActiveTab] = useState<"inspector" | "raw">("inspector");
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [copiedCsv, setCopiedCsv] = useState(false);
  const [keepExtraTags, setKeepExtraTags] = useState(false);
  const [csvPreset, setCsvPreset] = useState<CsvFormatPreset>(CSV_PRESETS[0]!);
  const [showPresetMenu, setShowPresetMenu] = useState(false);

  const limits: PlatformLimits = PLATFORM_LIMITS[strategy] ?? PLATFORM_LIMITS.standard!;

  const activeGroup = groups[activeGroupIndex] || groups[0];

  const metadata = useMemo(
    () => (activeGroup ? getGroupMetadata(activeGroup) : { title: "", description: "", tags: [] }),
    [activeGroup]
  );

  // CSV preview driven by formatter engine
  const csvPreview = useMemo(
    () =>
      formatPreviewCsv(groups, {
        preset: csvPreset,
        includeExtraTags: keepExtraTags,
        tagsMax: limits.tagsMax,
      }),
    [groups, csvPreset, keepExtraTags, limits.tagsMax]
  );

  // Validation checks
  const titleOk = metadata.title.length > 0 && metadata.title.length <= limits.titleMax;
  const descOk = metadata.description.length <= limits.descriptionMax;
  const tagsOk =
    metadata.tags.length > 0 && (keepExtraTags || metadata.tags.length <= limits.tagsMax);
  const allOk = titleOk && descOk && tagsOk;

  const handleCopyCsv = async () => {
    const ok = await copyToClipboard(csvPreview.full);
    if (ok) {
      setCopiedCsv(true);
      setTimeout(() => setCopiedCsv(false), 2000);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csv = generateStockCSV(groups, marketplace, exportSettings.naming.projectName);
    downloadString(csv, "tagarchitect-sample.csv", "text/csv;charset=utf-8");
    toast.success(
      `Downloaded sample CSV with ${groups.reduce((s, g) => s + g.images.length, 0)} images`
    );
  };

  if (!isOpen || groups.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Metadata X-Ray"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onMouseDown={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Metadata X-Ray</h2>
              <p className="text-xs text-slate-500">
                {groups.length} group{groups.length !== 1 ? "s" : ""} &middot; Strategy:{" "}
                <span className="font-medium text-slate-700">
                  {strategy === "etsy" ? "Etsy" : strategy === "stock" ? "Adobe Stock" : "Standard"}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 px-6">
          <button
            onClick={() => setActiveTab("inspector")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === "inspector"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <Eye className="h-4 w-4" />
            Inspector
          </button>
          <button
            onClick={() => setActiveTab("raw")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === "raw"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <Code2 className="h-4 w-4" />
            Raw CSV
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {activeTab === "inspector" ? (
            <div className="p-6 space-y-6">
              {/* Group Selector (if multiple) */}
              {groups.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {groups.map((g, i) => (
                    <button
                      key={g.id}
                      onClick={() => setActiveGroupIndex(i)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        i === activeGroupIndex
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      {g.sharedTitle || `Group ${g.groupNumber}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Overall Status Badge */}
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                  allOk
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                )}
              >
                {allOk ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    All fields pass validation for{" "}
                    {strategy === "etsy"
                      ? "Etsy"
                      : strategy === "stock"
                        ? "Adobe Stock"
                        : "general use"}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    Some fields need attention — check warnings below
                  </>
                )}
              </div>

              {/* Section 1: Title */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Title
                  </h3>
                  {metadata.title.length === 0 && (
                    <span className="text-xs text-red-500 font-medium">Missing</span>
                  )}
                </div>
                <div
                  className={cn(
                    "px-4 py-3 rounded-lg border text-sm",
                    metadata.title.length > limits.titleMax
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                >
                  {metadata.title || (
                    <span className="italic text-slate-400">No title generated yet</span>
                  )}
                </div>
                <CharCounter current={metadata.title.length} max={limits.titleMax} />
                {metadata.title.length > limits.titleMax && (
                  <p className="text-xs text-red-600">
                    Too long for{" "}
                    {strategy === "etsy"
                      ? "Etsy"
                      : strategy === "stock"
                        ? "Adobe Stock"
                        : "this platform"}
                    . Will be truncated on export.
                  </p>
                )}
              </div>

              {/* Section 2: Description */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Description
                </h3>
                <div
                  className={cn(
                    "px-4 py-3 rounded-lg border text-sm leading-relaxed",
                    metadata.description.length > limits.descriptionMax
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  )}
                >
                  {metadata.description || (
                    <span className="italic text-slate-400">No description generated yet</span>
                  )}
                </div>
                <CharCounter current={metadata.description.length} max={limits.descriptionMax} />
              </div>

              {/* Section 3: Keywords */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Keywords
                  </h3>
                  <div className="flex items-center gap-3">
                    {/* Keep Extra Tags Toggle */}
                    {metadata.tags.length > limits.tagsMax && (
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className="text-xs text-slate-500">Export all tags</span>
                        <button
                          role="switch"
                          aria-checked={keepExtraTags}
                          onClick={() => setKeepExtraTags(!keepExtraTags)}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                            keepExtraTags ? "bg-blue-600" : "bg-slate-300"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm",
                              keepExtraTags ? "translate-x-[18px]" : "translate-x-[3px]"
                            )}
                          />
                        </button>
                      </label>
                    )}
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        metadata.tags.length > limits.tagsMax && !keepExtraTags
                          ? "bg-red-100 text-red-700"
                          : metadata.tags.length === 0
                            ? "bg-slate-100 text-slate-400"
                            : "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {metadata.tags.length} / {limits.tagsMax} tags
                    </span>
                  </div>
                </div>

                {metadata.tags.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">
                      Expected format: <span className="font-medium">{limits.tagFormat}</span>. Tags
                      #1–10 have highest SEO priority.
                    </p>
                    <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-md px-2.5 py-1.5">
                      <span className="font-semibold">Blue tags</span> are High Priority (First 10).
                      Stock agencies weigh these heavily for SEO.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200 min-h-[60px]">
                  {metadata.tags.length > 0 ? (
                    metadata.tags.map((tag, i) => (
                      <span
                        key={i}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
                          i < 10
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : i >= limits.tagsMax
                              ? keepExtraTags
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-red-50 text-red-600 border-red-200 line-through"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                        )}
                      >
                        <span className="text-[10px] font-mono text-slate-400 mr-0.5">{i + 1}</span>
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400 italic">
                      No tags generated yet. Generate tags first.
                    </span>
                  )}
                </div>

                {metadata.tags.length > limits.tagsMax && !keepExtraTags && (
                  <p className="text-xs text-red-600">
                    {metadata.tags.length - limits.tagsMax} tag
                    {metadata.tags.length - limits.tagsMax !== 1 ? "s" : ""} over limit — extras
                    will be dropped on export.
                  </p>
                )}
                {metadata.tags.length > limits.tagsMax && keepExtraTags && (
                  <p className="text-xs text-amber-600">
                    {metadata.tags.length - limits.tagsMax} tag
                    {metadata.tags.length - limits.tagsMax !== 1 ? "s" : ""} over the{" "}
                    {limits.tagsMax}-tag recommendation — all will be exported.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Raw CSV Tab */
            <div className="p-6 space-y-4">
              {/* Toolbar: Preset selector + Copy */}
              <div className="flex items-center justify-between gap-3">
                {/* Export Preset Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowPresetMenu(!showPresetMenu)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white",
                      "text-sm font-medium text-slate-700",
                      "hover:border-slate-400 hover:bg-slate-50 transition-all"
                    )}
                  >
                    <span className="max-w-[180px] truncate">{csvPreset.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-slate-400 transition-transform",
                        showPresetMenu && "rotate-180"
                      )}
                    />
                  </button>
                  {showPresetMenu && (
                    <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                      {CSV_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setCsvPreset(preset);
                            setShowPresetMenu(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 transition-colors",
                            csvPreset.id === preset.id
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <div className="text-sm font-medium">{preset.label}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {preset.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-400">
                    {groups.reduce((s, g) => s + g.images.length, 0)} images
                  </p>
                  <button
                    onClick={handleCopyCsv}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg",
                      "border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                    )}
                  >
                    {copiedCsv ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy CSV
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Preset info pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200">
                  Separator: {csvPreset.separator === "," ? "Comma (,)" : "Semicolon (;)"}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200">
                  Headers: {csvPreset.headers.title}, {csvPreset.headers.description},{" "}
                  {csvPreset.headers.tags}
                </span>
                {keepExtraTags && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-xs font-medium border border-amber-200">
                    All tags included
                  </span>
                )}
              </div>

              {/* CSV Preview */}
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono leading-relaxed overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre">
                <span className="text-emerald-400">{csvPreview.header}</span>
                {"\n"}
                {csvPreview.rows}
              </pre>

              <p className="text-xs text-slate-400">
                This is a preview of the raw data. The actual export uses your Export Settings for
                filename patterns and global tags.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Limits based on{" "}
            <span className="font-medium text-slate-600">
              {strategy === "etsy" ? "Etsy" : strategy === "stock" ? "Adobe Stock" : "Standard"}
            </span>{" "}
            strategy
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSampleCsv}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg",
                "border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              )}
            >
              <Download className="h-4 w-4" />
              Download Sample CSV
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
