"use client";

import { useState, useEffect, useRef } from "react";
import { X, Settings2, HelpCircle } from "lucide-react";
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

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setPatternError(null);
    }
  }, [isOpen, settings]);

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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
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

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.metadata.burnIptc}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      metadata: { ...localSettings.metadata, burnIptc: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm text-slate-700">IPTC Keywords</span>
                  <span className="text-xs text-slate-500 block">
                    Standard keyword field (future enhancement)
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
