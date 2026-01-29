"use client";

import { forwardRef, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, value, onChange, placeholder, label, className, disabled, ...props }, ref) => {
    return (
      <div className="relative inline-block">
        {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(
              "appearance-none bg-white border border-slate-200 rounded-lg",
              "pl-3 pr-9 py-2 text-sm text-slate-700",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "hover:border-slate-300 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50",
              "cursor-pointer",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className={cn(
              "absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none",
              disabled && "opacity-50"
            )}
          />
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";
