"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChipOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  allowMultiple?: boolean;
  showAll?: boolean;
  allLabel?: string;
  className?: string;
}

export function FilterChips({
  options,
  selected,
  onChange,
  allowMultiple = false,
  showAll = true,
  allLabel = "All",
  className,
}: FilterChipsProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [showLeftGradient, setShowLeftGradient] = React.useState(false);
  const [showRightGradient, setShowRightGradient] = React.useState(false);

  // Check for overflow and update gradient visibility
  const updateGradients = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftGradient(scrollLeft > 0);
    setShowRightGradient(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    updateGradients();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", updateGradients);
      window.addEventListener("resize", updateGradients);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", updateGradients);
      }
      window.removeEventListener("resize", updateGradients);
    };
  }, [updateGradients, options]);

  const handleChipClick = (id: string) => {
    if (id === "__all__") {
      onChange([]);
      return;
    }

    if (allowMultiple) {
      if (selected.includes(id)) {
        onChange(selected.filter((s) => s !== id));
      } else {
        onChange([...selected, id]);
      }
    } else {
      // Single select mode - toggle
      if (selected.includes(id)) {
        onChange([]);
      } else {
        onChange([id]);
      }
    }
  };

  const isAllSelected = selected.length === 0;

  return (
    <div className={cn("relative", className)}>
      {/* Left gradient */}
      {showLeftGradient && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      )}

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-0.5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* All chip */}
        {showAll && (
          <FilterChip
            label={allLabel}
            isSelected={isAllSelected}
            onClick={() => handleChipClick("__all__")}
          />
        )}

        {/* Option chips */}
        {options.map((option) => (
          <FilterChip
            key={option.id}
            label={option.label}
            count={option.count}
            isSelected={selected.includes(option.id)}
            onClick={() => handleChipClick(option.id)}
          />
        ))}
      </div>

      {/* Right gradient */}
      {showRightGradient && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      )}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  count?: number;
  isSelected: boolean;
  onClick: () => void;
}

function FilterChip({ label, count, isSelected, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
        "whitespace-nowrap flex-shrink-0",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isSelected
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      )}
    >
      {isSelected && <Check className="h-3.5 w-3.5" />}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            isSelected
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-background text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// Type badge for displaying assembly type inline
interface TypeBadgeProps {
  category: string;
  type?: string;
  size?: "sm" | "default";
  className?: string;
}

export function TypeBadge({ category, type, size = "default", className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" 
          ? "px-2 py-0.5 text-xs" 
          : "px-2.5 py-1 text-xs",
        "bg-muted text-muted-foreground",
        className
      )}
    >
      <span className="font-semibold">{category}</span>
      {type && (
        <>
          <span className="text-muted-foreground/50">·</span>
          <span>{type}</span>
        </>
      )}
    </span>
  );
}

// Category color mapping for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
  strand: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  fiber: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  underground: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  service: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  hardware: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};

export function CategoryBadge({ 
  category, 
  className 
}: { 
  category: string; 
  className?: string;
}) {
  const colorClass = CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.hardware;
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        colorClass,
        className
      )}
    >
      {category}
    </span>
  );
}
