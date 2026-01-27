"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  disabled = false,
  size = "md",
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const sizeClasses = {
    sm: "h-8 text-xs px-2 gap-1",
    md: "h-9 text-sm px-2.5 gap-1.5",
    lg: "h-10 text-sm px-3 gap-1.5",
  };

  const iconSizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div
      className={cn(
        "inline-flex rounded-lg bg-slate-100 p-1",
        fullWidth && "w-full",
        className
      )}
      role="group"
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        const isDisabled = disabled || option.disabled;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center rounded-md font-medium transition-all min-w-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
              sizeClasses[size],
              fullWidth && "flex-1",
              isSelected
                ? "bg-orange-500 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {option.icon && (
              <span className={cn(iconSizeClasses[size], "shrink-0")}>
                {option.icon}
              </span>
            )}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Preset for traffic control levels
export const trafficControlOptions: SegmentedControlOption<"none" | "cones" | "flaggers">[] = [
  { value: "none", label: "None" },
  { value: "cones", label: "Cones" },
  { value: "flaggers", label: "Flaggers" },
];

// Preset for primary method
export const primaryMethodOptions: SegmentedControlOption<"aerial" | "underground" | "both">[] = [
  { value: "aerial", label: "Aerial" },
  { value: "underground", label: "Underground" },
  { value: "both", label: "Both" },
];

// Preset for construction type (DEPRECATED - use jobBuildTypeOptions)
export const constructionTypeOptions: SegmentedControlOption<"new_strand" | "overlash" | "adss" | "ug_dip">[] = [
  { value: "new_strand", label: "New Strand" },
  { value: "overlash", label: "Overlash" },
  { value: "adss", label: "ADSS" },
  { value: "ug_dip", label: "UG Dip" },
];

// Preset for job build type (replaces primaryMethod + constructionType)
export type JobBuildType = "full_build" | "strand_build" | "fiber_build" | "peripheral_build";

export const jobBuildTypeOptions: SegmentedControlOption<JobBuildType>[] = [
  { value: "full_build", label: "Full" },
  { value: "strand_build", label: "Strand" },
  { value: "fiber_build", label: "Fiber" },
  { value: "peripheral_build", label: "Periph" },
];
