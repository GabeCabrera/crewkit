"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DesignMap,
  type FiberSegment,
  type InfrastructureItem,
  type ConduitSegment,
} from "./design-map";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Map,
  Layers,
  Filter,
  MousePointer2,
  Square,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Cable,
  CircleDot,
  Box,
  Milestone,
  CheckCircle2,
  Eye,
  EyeOff,
  Satellite,
  MapIcon,
  Mountain,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Layer configuration
const LAYER_CONFIG = {
  fiber: {
    label: "Fiber Routes",
    icon: Cable,
    color: "#3b82f6",
    subLayers: ["backbone", "lateral", "mst_tail", "strand"],
  },
  infrastructure: {
    label: "Infrastructure",
    icon: Box,
    color: "#7c3aed",
    subLayers: ["mst", "vault", "handhole", "pedestal", "splice", "riser", "slack_loop", "crossing"],
  },
  poles: {
    label: "Poles",
    icon: Milestone,
    color: "#ca8a04",
    subLayers: ["pole"],
  },
  conduit: {
    label: "Conduit",
    icon: CircleDot,
    color: "#a16207",
    subLayers: ["conduit"],
  },
};

interface SelectionSummary {
  totalFiber: number;
  fiberByCount: Record<number, number>;
  poleCount: number;
  mstCount: number;
  vaultCount: number;
  handholeCount: number;
  spliceCount: number;
  conduitFootage: number;
}

export interface DesignWorkspaceProps {
  fiberSegments: FiberSegment[];
  infrastructure: InfrastructureItem[];
  conduitSegments: ConduitSegment[];
  onSelectionChange?: (selectedIds: { fiber: string[]; infra: string[] }) => void;
  onSaveSelection?: () => void;
  readOnly?: boolean;
  className?: string;
}

export function DesignWorkspace({
  fiberSegments,
  infrastructure,
  conduitSegments,
  onSelectionChange,
  onSaveSelection,
  readOnly = false,
  className = "",
}: DesignWorkspaceProps) {
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite" | "outdoors">("streets");
  
  // Layer visibility
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(
    new Set(["fiber", "infrastructure", "poles", "conduit"])
  );
  
  // SubPhase filter
  const [selectedPhases, setSelectedPhases] = useState<Set<string>>(new Set());
  
  // Selection mode
  const [selectionMode, setSelectionMode] = useState<"none" | "polygon" | "rectangle">("none");
  const [selectedFiberIds, setSelectedFiberIds] = useState<Set<string>>(new Set());
  const [selectedInfraIds, setSelectedInfraIds] = useState<Set<string>>(new Set());

  // Extract unique SubPhases from infrastructure (poles have SubPhase)
  const availablePhases = useMemo(() => {
    const phases = new Set<string>();
    infrastructure.forEach((item) => {
      if (item.subPhase) {
        phases.add(item.subPhase);
      }
    });
    return Array.from(phases).sort((a, b) => {
      // Sort numerically (3.1, 3.2, 3.10, etc.)
      const aParts = a.split(".").map(Number);
      const bParts = b.split(".").map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] ?? 0;
        const bVal = bParts[i] ?? 0;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    });
  }, [infrastructure]);

  // Calculate selection summary
  const selectionSummary = useMemo((): SelectionSummary => {
    const summary: SelectionSummary = {
      totalFiber: 0,
      fiberByCount: {},
      poleCount: 0,
      mstCount: 0,
      vaultCount: 0,
      handholeCount: 0,
      spliceCount: 0,
      conduitFootage: 0,
    };

    // If no selection, count everything visible
    const fiberToCount = selectedFiberIds.size > 0
      ? fiberSegments.filter((f) => selectedFiberIds.has(f.id))
      : fiberSegments;

    const infraToCount = selectedInfraIds.size > 0
      ? infrastructure.filter((i) => selectedInfraIds.has(i.id))
      : infrastructure.filter((i) => {
          // Apply phase filter if set
          if (selectedPhases.size > 0 && i.subPhase) {
            return selectedPhases.has(i.subPhase);
          }
          return true;
        });

    // Count fiber
    fiberToCount.forEach((seg) => {
      summary.totalFiber += seg.footage;
      if (seg.fiberCount > 0) {
        summary.fiberByCount[seg.fiberCount] =
          (summary.fiberByCount[seg.fiberCount] || 0) + seg.footage;
      }
    });

    // Count infrastructure
    infraToCount.forEach((item) => {
      switch (item.itemType) {
        case "pole":
          summary.poleCount += item.quantity;
          break;
        case "mst":
          summary.mstCount += item.quantity;
          break;
        case "vault":
          summary.vaultCount += item.quantity;
          break;
        case "handhole":
          summary.handholeCount += item.quantity;
          break;
        case "splice":
          summary.spliceCount += item.quantity;
          break;
      }
    });

    // Count conduit
    conduitSegments.forEach((seg) => {
      summary.conduitFootage += seg.footage;
    });

    return summary;
  }, [fiberSegments, infrastructure, conduitSegments, selectedFiberIds, selectedInfraIds, selectedPhases]);

  // Toggle layer visibility
  const toggleLayer = useCallback((layer: string) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  }, []);

  // Toggle phase filter
  const togglePhase = useCallback((phase: string) => {
    setSelectedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  }, []);

  // Select/deselect all phases
  const selectAllPhases = useCallback(() => {
    setSelectedPhases(new Set(availablePhases));
  }, [availablePhases]);

  const clearPhases = useCallback(() => {
    setSelectedPhases(new Set());
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFiberIds(new Set());
    setSelectedInfraIds(new Set());
    setSelectionMode("none");
  }, []);

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange({
        fiber: Array.from(selectedFiberIds),
        infra: Array.from(selectedInfraIds),
      });
    }
  }, [selectedFiberIds, selectedInfraIds, onSelectionChange]);

  // Map the visible layers to the actual layer types for the map
  const mapVisibleLayers = useMemo(() => {
    const layers = new Set<string>();
    
    if (visibleLayers.has("fiber")) {
      layers.add("fiber");
    }
    if (visibleLayers.has("infrastructure") || visibleLayers.has("poles")) {
      layers.add("infrastructure");
    }
    if (visibleLayers.has("conduit")) {
      layers.add("conduit");
    }
    
    return layers;
  }, [visibleLayers]);

  return (
    <div className={cn("flex h-full w-full relative", className)}>
      {/* Sidebar */}
      <div
        className={cn(
          "absolute top-0 left-0 h-full bg-white border-r border-slate-200 z-10 transition-all duration-200 flex flex-col",
          sidebarOpen ? "w-72" : "w-0"
        )}
      >
        {sidebarOpen && (
          <>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Map className="h-4 w-4" />
                Design Workspace
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Visualize and select design elements
              </p>
            </div>

            {/* Layer Controls */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Layers</span>
              </div>
              <div className="space-y-2">
                {Object.entries(LAYER_CONFIG).map(([key, config]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <Checkbox
                      checked={visibleLayers.has(key)}
                      onCheckedChange={() => toggleLayer(key)}
                    />
                    <config.icon
                      className="h-4 w-4"
                      style={{ color: config.color }}
                    />
                    <span className="text-sm text-slate-600 group-hover:text-slate-800">
                      {config.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Phase Filter */}
            {availablePhases.length > 0 && (
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">
                      SubPhase Filter
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={selectAllPhases}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={clearPhases}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {availablePhases.map((phase) => (
                    <label
                      key={phase}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedPhases.size === 0 || selectedPhases.has(phase)}
                        onCheckedChange={() => togglePhase(phase)}
                      />
                      <span className="text-sm text-slate-600">Phase {phase}</span>
                    </label>
                  ))}
                </div>
                {selectedPhases.size > 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    Showing {selectedPhases.size} of {availablePhases.length} phases
                  </p>
                )}
              </div>
            )}

            {/* Selection Tools */}
            {!readOnly && (
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <MousePointer2 className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">
                    Selection Tools
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={selectionMode === "polygon" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setSelectionMode(selectionMode === "polygon" ? "none" : "polygon")
                    }
                    className="flex-1 gap-1.5"
                  >
                    <MousePointer2 className="h-3.5 w-3.5" />
                    Polygon
                  </Button>
                  <Button
                    variant={selectionMode === "rectangle" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setSelectionMode(selectionMode === "rectangle" ? "none" : "rectangle")
                    }
                    className="flex-1 gap-1.5"
                  >
                    <Square className="h-3.5 w-3.5" />
                    Rectangle
                  </Button>
                </div>
                {(selectedFiberIds.size > 0 || selectedInfraIds.size > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="w-full mt-2 text-slate-500 gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear Selection
                  </Button>
                )}
              </div>
            )}

            {/* Selection Summary */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">
                  {selectedFiberIds.size > 0 || selectedInfraIds.size > 0
                    ? "Selection"
                    : "Totals"}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                {/* Fiber by count */}
                {Object.entries(selectionSummary.fiberByCount)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([count, footage]) => (
                    <div key={count} className="flex justify-between">
                      <span className="text-slate-600">{count}ct Fiber</span>
                      <span className="font-medium text-slate-800">
                        {Math.round(footage).toLocaleString()} ft
                      </span>
                    </div>
                  ))}
                {selectionSummary.poleCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Poles</span>
                    <span className="font-medium text-slate-800">
                      {selectionSummary.poleCount}
                    </span>
                  </div>
                )}
                {selectionSummary.mstCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">MSTs</span>
                    <span className="font-medium text-slate-800">
                      {selectionSummary.mstCount}
                    </span>
                  </div>
                )}
                {selectionSummary.vaultCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Vaults</span>
                    <span className="font-medium text-slate-800">
                      {selectionSummary.vaultCount}
                    </span>
                  </div>
                )}
                {selectionSummary.handholeCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Handholes</span>
                    <span className="font-medium text-slate-800">
                      {selectionSummary.handholeCount}
                    </span>
                  </div>
                )}
                {selectionSummary.spliceCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Splices</span>
                    <span className="font-medium text-slate-800">
                      {selectionSummary.spliceCount}
                    </span>
                  </div>
                )}
                {selectionSummary.conduitFootage > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Conduit</span>
                    <span className="font-medium text-slate-800">
                      {Math.round(selectionSummary.conduitFootage).toLocaleString()} ft
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            {!readOnly && onSaveSelection && (
              <div className="p-4 border-t border-slate-200">
                <Button onClick={onSaveSelection} className="w-full">
                  Save Selection to Job
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          "absolute top-4 z-20 bg-white border border-slate-200 rounded-lg p-2 shadow-sm hover:bg-slate-50 transition-all",
          sidebarOpen ? "left-[17rem]" : "left-4"
        )}
      >
        {sidebarOpen ? (
          <ChevronLeft className="h-4 w-4 text-slate-600" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-600" />
        )}
      </button>

      {/* Map Style Toggle */}
      <div className="absolute top-4 right-14 z-10 flex bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setMapStyle("streets")}
          className={cn(
            "p-2 transition-colors",
            mapStyle === "streets"
              ? "bg-slate-100 text-slate-800"
              : "text-slate-500 hover:bg-slate-50"
          )}
          title="Streets"
        >
          <MapIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => setMapStyle("satellite")}
          className={cn(
            "p-2 transition-colors border-l border-slate-200",
            mapStyle === "satellite"
              ? "bg-slate-100 text-slate-800"
              : "text-slate-500 hover:bg-slate-50"
          )}
          title="Satellite"
        >
          <Satellite className="h-4 w-4" />
        </button>
        <button
          onClick={() => setMapStyle("outdoors")}
          className={cn(
            "p-2 transition-colors border-l border-slate-200",
            mapStyle === "outdoors"
              ? "bg-slate-100 text-slate-800"
              : "text-slate-500 hover:bg-slate-50"
          )}
          title="Outdoors"
        >
          <Mountain className="h-4 w-4" />
        </button>
      </div>

      {/* Map */}
      <div className={cn("flex-1 h-full", sidebarOpen ? "ml-72" : "ml-0")}>
        <DesignMap
          fiberSegments={fiberSegments}
          infrastructure={infrastructure}
          conduitSegments={conduitSegments}
          visibleLayers={mapVisibleLayers}
          selectedPhases={selectedPhases.size > 0 ? selectedPhases : undefined}
          style={mapStyle}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

export default DesignWorkspace;
