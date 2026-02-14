"use client";

import { useState, useRef, useEffect } from "react";
import { ShoppingBag, Camera, Sparkles, ChevronDown, Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBatchStore, type StrategyType } from "@/store/useBatchStore";

interface StrategyOption {
  value: StrategyType;
  label: string;
  shortDescription: string;
  fullDescription: string;
  icon: React.ReactNode;
}

const strategies: StrategyOption[] = [
  {
    value: "etsy",
    label: "Etsy Optimized",
    shortDescription: "Creative & emotional keywords",
    fullDescription: "Optimized for Etsy Search. 13 long-tail descriptive phrases.",
    icon: <ShoppingBag className="h-4 w-4" />,
  },
  {
    value: "stock",
    label: "Adobe Stock Expert",
    shortDescription: "Technical & objective tags",
    fullDescription: "Optimized for Adobe Stock. 49 single keywords. Visual priority.",
    icon: <Camera className="h-4 w-4" />,
  },
  {
    value: "standard",
    label: "Standard SEO",
    shortDescription: "Balanced for general use",
    fullDescription: "Standard SEO tagging for general use. 30–50 balanced keywords.",
    icon: <Sparkles className="h-4 w-4" />,
  },
];

export interface StrategySelectorProps {
  className?: string;
}

export function StrategySelector({ className }: StrategySelectorProps) {
  const { strategy, setStrategy, maxTags, setMaxTags } = useBatchStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    strategies.find((s) => s.value === strategy) || (strategies[0] as StrategyOption);

  const handleStrategyChange = (newStrategy: StrategyType) => {
    // Auto-set maxTags to 13 when switching to Etsy strategy
    if (newStrategy === "etsy" && maxTags > 13) {
      setMaxTags(13);
    }

    if (newStrategy !== strategy) {
      setStrategy(newStrategy);
      const selectedOption = strategies.find((s) => s.value === newStrategy);
      if (selectedOption) {
        toast.success(`Strategy updated to ${selectedOption.label}`);
      }
    }
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Strategy + Tags row */}
      <div className="flex items-center gap-3">
        {/* Strategy Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white",
              "text-sm font-semibold text-gray-900",
              "hover:border-slate-400 hover:bg-slate-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              "transition-all duration-150"
            )}
          >
            <span className="text-blue-600">{selectedOption.icon}</span>
            <span>{selectedOption.label}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform ml-1",
                isOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
              {strategies.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStrategyChange(option.value)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left",
                    "hover:bg-slate-50 transition-colors",
                    strategy === option.value && "bg-blue-50"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5",
                      strategy === option.value ? "text-blue-600" : "text-slate-500"
                    )}
                  >
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "font-medium text-sm",
                        strategy === option.value ? "text-blue-600" : "text-gray-900"
                      )}
                    >
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{option.fullDescription}</div>
                  </div>
                  {strategy === option.value && (
                    <div className="text-blue-600 mt-0.5">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Max Tags Control */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white">
            <Tag className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-gray-500">Tags:</span>
            <input
              type="range"
              min={5}
              max={50}
              value={maxTags}
              onChange={(e) => setMaxTags(Number(e.target.value))}
              className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-sm font-medium text-gray-900 w-6 text-right">{maxTags}</span>
          </div>
          {strategy === "etsy" && maxTags > 13 && (
            <span className="text-xs text-amber-600 px-1">
              Etsy limit is 13. Extra tags may be ignored by their system.
            </span>
          )}
        </div>
      </div>

      {/* Strategy Description — always visible */}
      <p className="text-xs text-gray-500 pl-1">{selectedOption.fullDescription}</p>
    </div>
  );
}
