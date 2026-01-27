"use client";

import { X, Cable, Milestone, Box, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SelectionBOM } from "../route-design-step";

interface FloatingActionBarProps {
  selectionBOM: SelectionBOM;
  onClearSelection: () => void;
  onReview?: () => void;
  className?: string;
}

// Format number with commas
function formatNumber(num: number): string {
  return Math.round(num).toLocaleString();
}

// Get top infrastructure items for display
function getTopInfraItems(infraCounts: Record<string, number>): { type: string; count: number }[] {
  return Object.entries(infraCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));
}

// Format infrastructure type name
function formatInfraType(type: string): string {
  const names: Record<string, string> = {
    pole: "poles",
    mst: "MSTs",
    vault: "vaults",
    handhole: "handholes",
    pedestal: "pedestals",
    splice: "splices",
    riser: "risers",
    guy: "guys",
    slack_loop: "slack loops",
    crossing: "crossings",
    anchor: "anchors",
  };
  return names[type] || type;
}

export function FloatingActionBar({
  selectionBOM,
  onClearSelection,
  onReview,
  className,
}: FloatingActionBarProps) {
  // Don't render if nothing selected
  if (selectionBOM.totalFeatures === 0) {
    return null;
  }

  const topInfra = getTopInfraItems(selectionBOM.infraCounts);
  const totalInfraCount = Object.values(selectionBOM.infraCounts).reduce((a, b) => a + b, 0);
  const hasFiber = selectionBOM.fiberFootage > 0;
  const hasInfra = totalInfraCount > 0;
  const hasConduit = selectionBOM.conduitFootage > 0;

  return (
    <div
      className={cn(
        "absolute bottom-6 left-1/2 -translate-x-1/2 z-20",
        "bg-gray-900 text-white rounded-2xl shadow-xl border border-gray-700",
        "flex items-center gap-3 px-5 py-3",
        "animate-in fade-in slide-in-from-bottom-4 duration-200",
        className
      )}
    >
      {/* Selection count badge */}
      <div className="flex items-center gap-2 pr-3 border-r border-gray-700">
        <span className="text-sm font-semibold text-blue-400">
          {selectionBOM.totalFeatures}
        </span>
        <span className="text-xs text-gray-400">selected</span>
      </div>

      {/* BOM Summary Stats */}
      <div className="flex items-center gap-4">
        {/* Fiber footage */}
        {hasFiber && (
          <div className="flex items-center gap-1.5">
            <Cable className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium">
              {formatNumber(selectionBOM.fiberFootage)}
            </span>
            <span className="text-xs text-gray-400">ft</span>
          </div>
        )}

        {/* Infrastructure counts */}
        {hasInfra && (
          <div className="flex items-center gap-1.5">
            <Milestone className="h-4 w-4 text-amber-400" />
            {topInfra.map((item, idx) => (
              <span key={item.type} className="text-sm">
                <span className="font-medium">{item.count}</span>
                <span className="text-xs text-gray-400 ml-0.5">
                  {formatInfraType(item.type)}
                </span>
                {idx < topInfra.length - 1 && (
                  <span className="text-gray-600 mx-1">·</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Conduit footage */}
        {hasConduit && (
          <div className="flex items-center gap-1.5">
            <Box className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">
              {formatNumber(selectionBOM.conduitFootage)}
            </span>
            <span className="text-xs text-gray-400">ft conduit</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 ml-2 pl-3 border-l border-gray-700">
        {/* Review button */}
        {onReview && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-blue-400 hover:text-blue-300 hover:bg-gray-700"
            onClick={onReview}
          >
            <Eye className="h-4 w-4 mr-1.5" />
            Review
          </Button>
        )}
        
        {/* Clear button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default FloatingActionBar;
