"use client";

import { useState } from "react";
import { Layers, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui";
import type { ClusterSettings, ClusterContext } from "@/types";

const CONTEXT_OPTIONS: { value: ClusterContext; label: string; description: string }[] = [
  { value: "general", label: "General", description: "Standard categorization" },
  { value: "stock", label: "Stock Photography", description: "Industry-standard stock categories" },
  { value: "ecommerce", label: "E-commerce", description: "Product-focused categories" },
];

export interface ClusterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: ClusterSettings) => void;
  imageCount: number;
}

export function ClusterDialog({ isOpen, onClose, onConfirm, imageCount }: ClusterDialogProps) {
  const [prefix, setPrefix] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [context, setContext] = useState<ClusterContext>("general");

  const handleConfirm = () => {
    onConfirm({
      prefix: prefix.trim() || undefined,
      startNumber,
      context,
    });
    // Reset form
    setPrefix("");
    setStartNumber(1);
    setContext("general");
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setPrefix("");
    setStartNumber(1);
    setContext("general");
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-blue-600" />
            Cluster Settings
          </AlertDialogTitle>
          <AlertDialogDescription>
            Configure how {imageCount} images will be organized into groups.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Prefix Input */}
          <div className="space-y-2">
            <label htmlFor="prefix" className="text-sm font-medium text-slate-700">
              Group Prefix <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="prefix"
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
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
          <div className="space-y-2">
            <label htmlFor="startNumber" className="text-sm font-medium text-slate-700">
              Start Numbering From
            </label>
            <input
              id="startNumber"
              type="number"
              min={1}
              max={999}
              value={startNumber}
              onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
              className={cn(
                "w-24 px-3 py-2 text-sm rounded-lg border border-slate-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              )}
            />
            <p className="text-xs text-slate-500">
              Fallback names will start from: Group {startNumber}
            </p>
          </div>

          {/* Context Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Categorization Style</label>
            <div className="space-y-2">
              {CONTEXT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    context === option.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <input
                    type="radio"
                    name="context"
                    value={option.value}
                    checked={context === option.value}
                    onChange={() => setContext(option.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-sm text-slate-900">{option.label}</div>
                    <div className="text-xs text-slate-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Layers className="h-4 w-4 mr-2" />
            Run Clustering
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
