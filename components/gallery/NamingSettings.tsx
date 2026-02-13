"use client";

import { useState, useRef, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBatchStore } from "@/store/useBatchStore";
import type { ClusterSettings, ClusterContext } from "@/types";

const CONTEXT_OPTIONS: { value: ClusterContext; label: string; description: string }[] = [
  { value: "general", label: "General", description: "Standard categorization" },
  { value: "stock", label: "Stock Photography", description: "Industry-standard stock categories" },
  { value: "ecommerce", label: "E-commerce", description: "Product-focused categories" },
];

export function NamingSettings() {
  const { namingSettings, setNamingSettings } = useBatchStore();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const prefix = namingSettings.prefix ?? "";
  const startNumber = namingSettings.startNumber ?? 1;
  const context = namingSettings.context ?? "general";

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

  const update = (partial: Partial<ClusterSettings>) => {
    setNamingSettings({ ...namingSettings, ...partial });
  };

  const hasSettings = !!namingSettings.prefix || (namingSettings.startNumber ?? 1) !== 1;

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
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 space-y-4">
          <h4 className="font-semibold text-slate-900 text-sm">Naming Settings</h4>

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
        </div>
      )}
    </div>
  );
}
