"use client";

import { useState, useEffect, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import dynamic from "next/dynamic";
import { toPng } from "html-to-image";
import {
  Loader2,
  Layers,
  CheckCircle2,
  Circle,
  X,
  MapPin,
  RotateCcw,
  CheckCheck,
  Camera,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Dynamically import the map to avoid SSR issues
const DesignMap = dynamic(
  () => import("@/components/job-planner/design-map").then((mod) => mod.DesignMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-slate-100 rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    ),
  }
);

// Types
interface FiberSegment {
  id: string;
  segmentType: string;
  fiberCount: number;
  footage: number;
  geometry?: unknown;
  isSelected?: boolean;
  isCompleted?: boolean;
}

interface InfrastructureItem {
  id: string;
  itemType: string;
  quantity: number;
  specs?: string;
  label?: string;
  subPhase?: string;
  location?: { type: "Point"; coordinates: [number, number] };
  isSelected: boolean;
  isCompleted: boolean;
}

interface ConduitSegment {
  id: string;
  conduitSize: string;
  footage: number;
  geometry?: unknown;
  isSelected?: boolean;
  isCompleted?: boolean;
}

interface BOMData {
  fiberSegments: FiberSegment[];
  infrastructure: InfrastructureItem[];
  conduitSegments: ConduitSegment[];
}

interface JobData {
  id: string;
  jobName: string;
  locationLat: number | null;
  locationLng: number | null;
}

export interface ProgressStats {
  totalItems: number;
  completedItems: number;
  todayItems: number;
  byType: Record<string, { total: number; completed: number; today: number }>;
}

export interface ProgressMapProps {
  jobId: string;
  mode: "view" | "edit";
  // In edit mode, track today's completed items separately
  todayCompletedIds?: string[];
  onTodayCompletionChange?: (completedInfraIds: string[], completedFiberIds: string[]) => void;
  // In view mode, just show final state
  className?: string;
  height?: string;
  // Show export button in view mode
  showExportButton?: boolean;
}

// Export handle type for imperative methods
export interface ProgressMapHandle {
  exportAsImage: () => Promise<string | null>;
}

export const ProgressMap = forwardRef<ProgressMapHandle, ProgressMapProps>(function ProgressMapComponent({
  jobId,
  mode,
  todayCompletedIds = [],
  onTodayCompletionChange,
  className,
  height = "400px",
  showExportButton = true,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [job, setJob] = useState<JobData | null>(null);
  const [bom, setBom] = useState<BOMData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Track today's selections (only in edit mode)
  const [todayInfraIds, setTodayInfraIds] = useState<Set<string>>(new Set(todayCompletedIds));
  const [todayFiberIds, setTodayFiberIds] = useState<Set<string>>(new Set());
  
  // UI State
  const [showLayers, setShowLayers] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(
    new Set(["fiber", "infrastructure", "conduit"])
  );
  const [selectedItem, setSelectedItem] = useState<InfrastructureItem | null>(null);

  // Export map as image
  const exportAsImage = useCallback(async (): Promise<string | null> => {
    if (!containerRef.current) return null;
    
    try {
      setIsExporting(true);
      // Add a small delay to ensure map tiles are loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataUrl = await toPng(containerRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        filter: (node) => {
          // Filter out buttons and interactive elements for cleaner export
          const isButton = node.tagName === 'BUTTON';
          const hasExcludeClass = node.classList?.contains('exclude-from-export');
          return !isButton && !hasExcludeClass;
        },
      });
      
      return dataUrl;
    } catch (err) {
      console.error("Error exporting map:", err);
      return null;
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Download the map as a PNG
  const downloadMapImage = useCallback(async () => {
    const dataUrl = await exportAsImage();
    if (dataUrl && job) {
      const link = document.createElement('a');
      link.download = `${job.jobName.replace(/\s+/g, '-')}-progress-map.png`;
      link.href = dataUrl;
      link.click();
    }
  }, [exportAsImage, job]);

  // Expose export method via ref
  useImperativeHandle(ref, () => ({
    exportAsImage,
  }), [exportAsImage]);

  // Sync todayCompletedIds prop changes
  useEffect(() => {
    setTodayInfraIds(new Set(todayCompletedIds));
  }, [todayCompletedIds]);

  // Fetch job and BOM data with AbortController to prevent race conditions
  useEffect(() => {
    const abortController = new AbortController();
    
    async function fetchData() {
      if (!jobId) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch job data (basic info only)
        const jobRes = await fetch(`/api/job-plans/${jobId}?include=basic`, {
          signal: abortController.signal,
        });
        if (!jobRes.ok) throw new Error("Job not found");
        const jobData = await jobRes.json();
        
        // Check if request was aborted before updating state
        if (abortController.signal.aborted) return;
        setJob(jobData);

        // Fetch BOM with full geometry
        const bomRes = await fetch(`/api/job-plans/${jobId}/bom`, {
          signal: abortController.signal,
        });
        
        // Check if request was aborted before updating state
        if (abortController.signal.aborted) return;
        
        if (bomRes.ok) {
          const bomData = await bomRes.json();
          if (bomData.exists && bomData.bom) {
            // Filter to only show selected features
            const filteredBom: BOMData = {
              fiberSegments: (bomData.bom.fiberSegments || []).filter(
                (seg: FiberSegment) => seg.isSelected !== false
              ),
              infrastructure: (bomData.bom.infrastructure || []).filter(
                (item: InfrastructureItem) => item.isSelected !== false
              ),
              conduitSegments: (bomData.bom.conduitSegments || []).filter(
                (seg: ConduitSegment) => seg.isSelected !== false
              ),
            };
            setBom(filteredBom);
          }
        }
      } catch (err) {
        // Ignore abort errors - they're expected when jobId changes
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("Error fetching data:", err);
        setError("Failed to load job map data");
      } finally {
        // Only update loading state if not aborted
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();
    
    // Cleanup: abort any in-flight requests when jobId changes or component unmounts
    return () => {
      abortController.abort();
    };
  }, [jobId]);

  // Calculate progress stats
  const progressStats = useMemo<ProgressStats>(() => {
    if (!bom) {
      return {
        totalItems: 0,
        completedItems: 0,
        todayItems: 0,
        byType: {},
      };
    }

    const stats: ProgressStats = {
      totalItems: 0,
      completedItems: 0,
      todayItems: todayInfraIds.size,
      byType: {},
    };

    bom.infrastructure.forEach((item) => {
      const type = item.itemType;
      if (!stats.byType[type]) {
        stats.byType[type] = { total: 0, completed: 0, today: 0 };
      }
      stats.byType[type].total += item.quantity;
      stats.totalItems += item.quantity;

      // Previously completed (before today)
      if (item.isCompleted && !todayInfraIds.has(item.id)) {
        stats.byType[type].completed += item.quantity;
        stats.completedItems += item.quantity;
      }
      
      // Completed today
      if (todayInfraIds.has(item.id)) {
        stats.byType[type].today += item.quantity;
        stats.byType[type].completed += item.quantity;
        stats.completedItems += item.quantity;
      }
    });

    return stats;
  }, [bom, todayInfraIds]);

  // Toggle today's completion (only in edit mode)
  const toggleTodayCompletion = useCallback((itemId: string) => {
    if (mode !== "edit") return;
    
    setTodayInfraIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      
      // Notify parent
      onTodayCompletionChange?.(Array.from(next), Array.from(todayFiberIds));
      
      return next;
    });
    setSelectedItem(null);
  }, [mode, onTodayCompletionChange, todayFiberIds]);

  // Clear today's selections
  const clearTodaySelections = useCallback(() => {
    setTodayInfraIds(new Set());
    setTodayFiberIds(new Set());
    onTodayCompletionChange?.([], []);
  }, [onTodayCompletionChange]);

  // Handle feature click
  const handleFeatureClick = useCallback((feature: unknown, layerType: string) => {
    if (layerType === "infrastructure" && bom && mode === "edit") {
      const props = (feature as { properties?: { id?: string } }).properties;
      const item = bom.infrastructure.find((i) => i.id === props?.id);
      if (item) {
        setSelectedItem(item);
      }
    }
  }, [bom, mode]);

  // Toggle layer visibility
  const toggleLayer = (layer: string) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  // Modify infrastructure data to reflect today's completions for display
  const displayInfrastructure = useMemo(() => {
    if (!bom) return [];
    return bom.infrastructure.map((item) => ({
      ...item,
      // Mark as completed if it was already completed OR marked today
      isCompleted: item.isCompleted || todayInfraIds.has(item.id),
    }));
  }, [bom, todayInfraIds]);

  const progressPercent = progressStats.totalItems > 0
    ? Math.round((progressStats.completedItems / progressStats.totalItems) * 100)
    : 0;

  // Loading state
  if (isLoading) {
    return (
      <div 
        className={cn("flex items-center justify-center bg-slate-100 rounded-lg", className)}
        style={{ height }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // Error state
  if (error || !job) {
    return (
      <div 
        className={cn("flex flex-col items-center justify-center gap-2 bg-slate-100 rounded-lg p-4", className)}
        style={{ height }}
      >
        <MapPin className="h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-500">{error || "Job not found"}</p>
      </div>
    );
  }

  // No BOM data
  if (!bom || (bom.infrastructure.length === 0 && bom.fiberSegments.length === 0)) {
    return (
      <div 
        className={cn("flex flex-col items-center justify-center gap-2 bg-slate-100 rounded-lg p-4", className)}
        style={{ height }}
      >
        <MapPin className="h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-500 text-center">No design data available for this job</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative rounded-lg overflow-hidden border border-slate-200", className)} style={{ height }}>
      {/* Progress Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-3 py-2 exclude-from-export">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-600">
                {progressPercent}%
              </span>
            </div>
            
            {/* Today's count badge */}
            {mode === "edit" && todayInfraIds.size > 0 && (
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                +{todayInfraIds.size} today
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Clear today button */}
            {mode === "edit" && todayInfraIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearTodaySelections}
                className="h-7 px-2 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            
            {/* Download button (view mode only) */}
            {mode === "view" && showExportButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadMapImage}
                disabled={isExporting}
                className="h-7 w-7 p-0"
                title="Download map as image"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Layer toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLayers(!showLayers)}
              className="h-7 w-7 p-0"
            >
              <Layers className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Layer Panel */}
        {showLayers && (
          <div className="absolute top-full right-2 mt-1 bg-white rounded-lg shadow-lg p-3 min-w-[160px] border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700">Layers</span>
              <button onClick={() => setShowLayers(false)}>
                <X className="h-3 w-3 text-slate-400" />
              </button>
            </div>
            <div className="space-y-1.5">
              {[
                { id: "fiber", label: "Fiber" },
                { id: "infrastructure", label: "Infrastructure" },
                { id: "conduit", label: "Conduit" },
              ].map((layer) => (
                <label key={layer.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleLayers.has(layer.id)}
                    onChange={() => toggleLayer(layer.id)}
                    className="rounded text-orange-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs text-slate-600">{layer.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="h-full pt-10">
        <DesignMap
          fiberSegments={bom.fiberSegments as any}
          infrastructure={displayInfrastructure as any}
          conduitSegments={bom.conduitSegments as any}
          center={job.locationLng && job.locationLat ? [job.locationLng, job.locationLat] : undefined}
          visibleLayers={visibleLayers}
          onFeatureClick={handleFeatureClick}
          style="satellite"
          className="h-full w-full"
        />
      </div>

      {/* Selected Item Panel (edit mode only) */}
      {mode === "edit" && selectedItem && (
        <div className="absolute bottom-2 left-2 right-2 bg-white rounded-lg shadow-lg p-3 border border-slate-200">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-medium text-sm text-slate-800 capitalize">
                {selectedItem.itemType.replace("_", " ")}
              </p>
              {selectedItem.label && (
                <p className="text-xs font-mono text-slate-600">{selectedItem.label}</p>
              )}
            </div>
            <button onClick={() => setSelectedItem(null)} className="p-1">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>
          
          {/* Completion status indicators */}
          <div className="flex items-center gap-2 mb-2 text-xs">
            {selectedItem.isCompleted && !todayInfraIds.has(selectedItem.id) && (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Previously completed
              </span>
            )}
            {todayInfraIds.has(selectedItem.id) && (
              <span className="text-orange-600 flex items-center gap-1">
                <CheckCheck className="h-3 w-3" />
                Marked today
              </span>
            )}
          </div>
          
          <Button
            onClick={() => toggleTodayCompletion(selectedItem.id)}
            size="sm"
            className={cn(
              "w-full gap-1.5 h-8",
              todayInfraIds.has(selectedItem.id)
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : selectedItem.isCompleted
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
            )}
            disabled={selectedItem.isCompleted && !todayInfraIds.has(selectedItem.id)}
          >
            {todayInfraIds.has(selectedItem.id) ? (
              <>
                <Circle className="h-3.5 w-3.5" />
                Unmark
              </>
            ) : selectedItem.isCompleted ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Already Complete
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark Complete
              </>
            )}
          </Button>
        </div>
      )}

      {/* Bottom Stats (view mode only) */}
      {mode === "view" && (
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              {Object.entries(progressStats.byType)
                .filter(([type]) => ["pole", "mst", "splice", "vault"].includes(type))
                .slice(0, 3)
                .map(([type, stats]) => (
                  <div key={type} className="flex items-center gap-1">
                    <span className="text-slate-500 capitalize">{type}s:</span>
                    <span className="font-medium text-slate-700">
                      {stats.completed}/{stats.total}
                    </span>
                  </div>
                ))}
            </div>
            <span className="text-slate-500">
              {progressStats.completedItems} of {progressStats.totalItems} items
            </span>
          </div>
        </div>
      )}

      {/* Color Legend */}
      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1.5 text-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span className="text-slate-600">Pending</span>
          </div>
          {mode === "edit" && (
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-slate-600">Today</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600">Done</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProgressMap;
