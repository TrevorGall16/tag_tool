"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Settings2, Save, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBatchStore } from "@/store/useBatchStore";
import type { ClusterSettings, ClusterContext, PlatformType } from "@/types";

interface NamingPreset {
  id: string;
  name: string;
  prefix: string | null;
  startNumber: number;
  context: string;
  platform: PlatformType;
}

const CONTEXT_OPTIONS: { value: ClusterContext; label: string; description: string }[] = [
  { value: "general", label: "General", description: "Standard categorization" },
  { value: "stock", label: "Stock Photography", description: "Industry-standard stock categories" },
  { value: "ecommerce", label: "E-commerce", description: "Product-focused categories" },
];

const PLATFORM_OPTIONS: { value: PlatformType; label: string; description: string }[] = [
  { value: "GENERIC", label: "Generic", description: "Standard 30–50 tags" },
  { value: "ADOBE", label: "Adobe Stock", description: "49 keywords, visual importance order" },
  { value: "SHUTTERSTOCK", label: "Shutterstock", description: "50 keywords, no duplicates" },
  { value: "ETSY", label: "Etsy", description: "13 long-tail phrases" },
];

export function NamingSettings() {
  const { namingSettings, setNamingSettings } = useBatchStore();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Preset state
  const [presets, setPresets] = useState<NamingPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [presetsLoaded, setPresetsLoaded] = useState(false);

  const prefix = namingSettings.prefix ?? "";
  const startNumber = namingSettings.startNumber ?? 1;
  const context = namingSettings.context ?? "general";
  const platform =
    (namingSettings as ClusterSettings & { platform?: PlatformType }).platform ?? "GENERIC";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const update = (partial: Partial<ClusterSettings & { platform?: PlatformType }>) => {
    setNamingSettings({ ...namingSettings, ...partial });
  };

  const hasSettings = !!namingSettings.prefix || (namingSettings.startNumber ?? 1) !== 1;

  // Load presets when popover opens
  const loadPresets = useCallback(async () => {
    if (presetsLoaded || isLoadingPresets) return;
    setIsLoadingPresets(true);
    try {
      const res = await fetch("/api/presets");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPresets(json.data);
      }
    } catch {
      // Silently fail — presets are optional (user may not be logged in)
    } finally {
      setIsLoadingPresets(false);
      setPresetsLoaded(true);
    }
  }, [presetsLoaded, isLoadingPresets]);

  useEffect(() => {
    if (open) {
      loadPresets();
    }
  }, [open, loadPresets]);

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast.error("Enter a preset name");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: presetName.trim(),
          prefix: prefix || undefined,
          startNumber,
          context,
          platform,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPresets((prev) => [json.data, ...prev]);
        setPresetName("");
        toast.success(`Preset "${json.data.name}" saved`);
      } else {
        toast.error(json.error || "Failed to save preset");
      }
    } catch {
      toast.error("Failed to save preset");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPreset = (preset: NamingPreset) => {
    setNamingSettings({
      prefix: preset.prefix || undefined,
      startNumber: preset.startNumber,
      context: (preset.context as ClusterContext) || "general",
      platform: preset.platform || "GENERIC",
    } as ClusterSettings & { platform?: PlatformType });
    toast.success(`Loaded preset "${preset.name}"`);
  };

  const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/presets?id=${presetId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setPresets((prev) => prev.filter((p) => p.id !== presetId));
        toast.success("Preset deleted");
      }
    } catch {
      toast.error("Failed to delete preset");
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium",
          "border transition-colors",
          hasSettings
            ? "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
            : "border-slate-300 text-slate-600 hover:bg-slate-50"
        )}
        title="Naming settings"
      >
        <Settings2 className="h-4 w-4" />
        Naming
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 space-y-4 max-h-[80vh] overflow-y-auto">
          <h4 className="font-semibold text-slate-900 text-sm">Naming Settings</h4>

          {/* Platform Select */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Platform Optimizer</label>
            <div className="space-y-1.5">
              {PLATFORM_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors",
                    platform === option.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <input
                    type="radio"
                    name="naming-platform"
                    value={option.value}
                    checked={platform === option.value}
                    onChange={() => update({ platform: option.value })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-xs text-slate-900">{option.label}</div>
                    <div className="text-xs text-slate-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Prefix Input */}
          <div className="space-y-1.5">
            <label htmlFor="naming-prefix" className="text-sm font-medium text-slate-700">
              Group Prefix <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="naming-prefix"
              type="text"
              value={prefix}
              onChange={(e) => update({ prefix: e.target.value || undefined })}
              placeholder="e.g., Summer Shoot, Paris Trip"
              className={cn(
                "w-full px-3 py-2 text-sm rounded-lg border border-slate-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "placeholder:text-slate-400"
              )}
            />
            <p className="text-xs text-slate-500">
              Groups will be named: {prefix ? `"${prefix} - Category"` : '"Category"'}
            </p>
          </div>

          {/* Start Number */}
          <div className="space-y-1.5">
            <label htmlFor="naming-start" className="text-sm font-medium text-slate-700">
              Start Numbering From
            </label>
            <input
              id="naming-start"
              type="number"
              min={1}
              max={999}
              value={startNumber}
              onChange={(e) => update({ startNumber: Math.max(1, parseInt(e.target.value) || 1) })}
              className={cn(
                "w-24 px-3 py-2 text-sm rounded-lg border border-slate-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              )}
            />
          </div>

          {/* Context Select */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Categorization Style</label>
            <div className="space-y-1.5">
              {CONTEXT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors",
                    context === option.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <input
                    type="radio"
                    name="naming-context"
                    value={option.value}
                    checked={context === option.value}
                    onChange={() => update({ context: option.value })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-xs text-slate-900">{option.label}</div>
                    <div className="text-xs text-slate-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 pt-3">
            <h4 className="font-semibold text-slate-900 text-sm mb-2">Presets</h4>

            {/* Save Preset */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name..."
                maxLength={100}
                className={cn(
                  "flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  "placeholder:text-slate-400"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSavePreset();
                }}
              />
              <button
                onClick={handleSavePreset}
                disabled={isSaving || !presetName.trim()}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium",
                  "bg-blue-600 text-white hover:bg-blue-700 transition-colors",
                  "disabled:opacity-50 disabled:pointer-events-none"
                )}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save
              </button>
            </div>

            {/* Load Presets */}
            {isLoadingPresets ? (
              <div className="flex items-center justify-center py-3 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading presets...
              </div>
            ) : presets.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleLoadPreset(preset)}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-lg border border-slate-200 text-left",
                      "hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-900 truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {preset.platform !== "GENERIC" && (
                          <span className="mr-1.5">{preset.platform}</span>
                        )}
                        {preset.prefix && <span>"{preset.prefix}"</span>}
                        {!preset.prefix && preset.platform === "GENERIC" && "Default settings"}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeletePreset(preset.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition-all"
                      title="Delete preset"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  </button>
                ))}
              </div>
            ) : presetsLoaded ? (
              <p className="text-xs text-slate-400 text-center py-2">
                No saved presets yet. Save your current settings above.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
