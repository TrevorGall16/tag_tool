"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKETPLACE_CONFIGS } from "@/types/marketplace";

export interface MarketplaceInfoProps {
  marketplace: string;
  className?: string;
}

export function MarketplaceInfo({ marketplace, className }: MarketplaceInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const config = MARKETPLACE_CONFIGS[marketplace];
  if (!config) return null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-1.5 rounded-full transition-colors",
          "hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500",
          isOpen && "bg-slate-100"
        )}
        aria-label={`${config.name} marketplace requirements`}
        aria-expanded={isOpen}
      >
        <HelpCircle className="h-4 w-4 text-slate-400" />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full right-0 mt-2 w-64",
            "p-3 bg-white border border-slate-200 rounded-lg shadow-lg",
            "z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          )}
        >
          <h4 className="font-medium text-slate-900 mb-2 text-sm">{config.tooltipSummary}</h4>
          <ul className="space-y-1.5">
            {config.tooltipDetails.map((detail, i) => (
              <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
