"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { X, Settings2, HelpCircle, Plus, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { previewFilename, validatePattern } from "@/lib/export/export-namer";
import type { ExportSettings as ExportSettingsType } from "@/lib/export";
import { DEFAULT_EXPORT_SETTINGS } from "@/lib/export";

export interface ExportSettingsProps {
  settings: ExportSettingsType;
  onSettingsChange: (settings: ExportSettingsType) => void;
  isOpen: boolean;
  onClose: () => void;
}

const PADDING_OPTIONS = [
  { value: 1, label: "1 digit (9)" },
  { value: 2, label: "2 digits (09)" },
  { value: 3, label: "3 digits (009)" },
  { value: 4, label: "4 digits (0009)" },
  { value: 5, label: "5 digits (00009)" },
];

const PLACEHOLDER_HELP = [
  { placeholder: "{project}", description: "Project/batch name" },
  { placeholder: "{seq}", description: "Sequential number (required)" },
  { placeholder: "{date}", description: "Current date (YYYY-MM-DD)" },
  { placeholder: "{original}", description: "Original filename" },
  { placeholder: "{group}", description: "Group name/title" },
];

export function ExportSettings({
  settings,
  onSettingsChange,
  isOpen,
  onClose,
}: ExportSettingsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [localSettings, setLocalSettings] = useState<ExportSettingsType>(settings);
  const [patternError, setPatternError] = useState<string | null>(null);
  const [showPlaceholderHelp, setShowPlaceholderHelp] = useState(false);
  const [globalTagInput, setGlobalTagInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Ensure globalTags is always an array (handles legacy persisted state)
      const normalizedSettings = {
        ...settings,
        globalTags: settings.globalTags ?? [],
      };
      setLocalSettings(normalizedSettings);
      setPatternError(null);
      setGlobalTagInput("");
    }
  }, [isOpen, settings]);

  // Safe accessor for globalTags
  const globalTags = localSettings.globalTags ?? [];

  const handleAddGlobalTag = () => {
    const tag = globalTagInput.trim().toLowerCase();
    if (tag && !globalTags.includes(tag)) {
      setLocalSettings({
        ...localSettings,
        globalTags: [...globalTags, tag],
      });
    }
    setGlobalTagInput("");
  };

  const handleRemoveGlobalTag = (tagToRemove: string) => {
    setLocalSettings({
      ...localSettings,
      globalTags: globalTags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleGlobalTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddGlobalTag();
    }
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const filenamePreview = previewFilename(localSettings.naming, 1, "IMG_1234.jpg");

  const handlePatternChange = (pattern: string) => {
    setLocalSettings({
      ...localSettings,
      naming: { ...localSettings.naming, pattern },
    });

    const validation = validatePattern(pattern);
    setPatternError(validation.valid ? null : validation.error || null);
  };

  const handleSave = () => {
    if (patternError) return;
    onSettingsChange(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_EXPORT_SETTINGS);
    setPatternError(null);
  };

  // Prevent ESC key from closing the dialog (user must use Cancel/X button)
  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClose={onClose}
      className={cn(
        "w-full max-w-lg p-0 rounded-xl bg-white shadow-2xl",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      )}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-slate-600" />
            <h2 className="text-xl font-semibold text-slate-900">Export Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Naming Section */}
        <section className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">File Naming</h3>

          {/* Pattern Input */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="pattern" className="text-sm text-slate-600">
                Naming Pattern
              </label>
              <button
                onClick={() => setShowPlaceholderHelp(!showPlaceholderHelp)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Placeholders
              </button>
            </div>
            <input
              id="pattern"
              type="text"
              value={localSettings.naming.pattern}
              onChange={(e) => handlePatternChange(e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-lg border",
                patternError
                  ? "border-red-300 focus:ring-red-500"
                  : "border-slate-300 focus:ring-blue-500",
                "focus:outline-none focus:ring-2 focus:border-transparent"
              )}
              placeholder="{project}_{seq}"
            />
            {patternError && <p className="mt-1 text-sm text-red-600">{patternError}</p>}
          </div>

          {/* Placeholder Help */}
          {showPlaceholderHelp && (
            <div className="mb-3 p-3 bg-slate-50 rounded-lg text-sm">
              <ul className="space-y-1">
                {PLACEHOLDER_HELP.map(({ placeholder, description }) => (
                  <li key={placeholder} className="flex justify-between">
                    <code className="text-blue-600 bg-blue-50 px-1 rounded">{placeholder}</code>
                    <span className="text-slate-600">{description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Project Name */}
          <div className="mb-3">
            <label htmlFor="projectName" className="text-sm text-slate-600 block mb-1">
              Project Name
            </label>
            <input
              id="projectName"
              type="text"
              value={localSettings.naming.projectName}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  naming: { ...localSettings.naming, projectName: e.target.value },
                })
              }
              className={cn(
                "w-full px-3 py-2 rounded-lg border border-slate-300",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              )}
              placeholder="my-project"
            />
          </div>

          {/* Sequence Padding */}
          <div className="mb-3">
            <label htmlFor="padding" className="text-sm text-slate-600 block mb-1">
              Sequence Padding
            </label>
            <select
              id="padding"
              value={localSettings.naming.sequencePadding}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  naming: { ...localSettings.naming, sequencePadding: parseInt(e.target.value) },
                })
              }
              className={cn(
                "w-full px-3 py-2 rounded-lg border border-slate-300",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "bg-white"
              )}
            >
              {PADDING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <div className="p-3 bg-slate-100 rounded-lg">
            <span className="text-xs text-slate-500 block mb-1">Preview</span>
            <code className="text-sm text-slate-800">{filenamePreview}</code>
          </div>
        </section>

        {/* Global Tags Section */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-medium text-slate-700">Global Tags</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            These tags will be appended to every image during export.
          </p>

          {/* Tag Input */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={globalTagInput}
              onChange={(e) => setGlobalTagInput(e.target.value)}
              onKeyDown={handleGlobalTagKeyDown}
              placeholder="Add a tag and press Enter"
              className={cn(
                "flex-1 px-3 py-2 rounded-lg border border-slate-300",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "text-sm"
              )}
            />
            <button
              type="button"
              onClick={handleAddGlobalTag}
              disabled={!globalTagInput.trim()}
              className={cn(
                "px-3 py-2 rounded-lg bg-blue-600 text-white",
                "hover:bg-blue-700 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center gap-1"
              )}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Tags Display */}
          {globalTags.length > 0 ? (
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg min-h-[60px]">
              {globalTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveGlobalTag(tag)}
                    className="hover:text-blue-900 transition-colors"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-sm text-slate-400">No global tags added</p>
            </div>
          )}
        </section>

        {/* Metadata Section */}
        <section className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Metadata Embedding</h3>

          {/* Master Toggle */}
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer">
            <div>
              <span className="text-sm font-medium text-slate-700">Embed Metadata</span>
              <p className="text-xs text-slate-500">Write title and keywords to image files</p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.metadata.enabled}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  metadata: { ...localSettings.metadata, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          {/* Sub-options */}
          {localSettings.metadata.enabled && (
            <div className="mt-3 ml-4 space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.metadata.burnExif}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      metadata: { ...localSettings.metadata, burnExif: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm text-slate-700">EXIF Tags</span>
                  <span className="text-xs text-slate-500 block">
                    XPTitle, XPKeywords, XPSubject (Windows)
                  </span>
                </div>
              </label>
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="flex justify-between">
          <button
            onClick={handleReset}
            className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
          >
            Reset to Defaults
          </button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!!patternError}>
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
