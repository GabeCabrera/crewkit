"use client";

import { memo, useState, useCallback, useMemo } from "react";
import {
  Layers,
  MapPin,
  Satellite,
  Map as MapIcon,
  Mountain,
  Eye,
  EyeOff,
  Lasso,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DesignMap } from "../../../design-map";
import { LayerManager, type SourceFile, type Segment } from "./layer-manager";
import type { JobPlanData } from "../../../job-lifecycle-view";
import type { BOMData } from "../route-design-step";
import type { SelectedFeatures } from "@/lib/selection-utils";

interface MapStyles {
  aerialColor: string;
  undergroundColor: string;
  showAerial: boolean;
  showUnderground: boolean;
}

interface DesignMapPaneProps {
  job: JobPlanData;
  bom: BOMData | null;
  mapStyles: MapStyles;
  visibleLayers: Set<string>;
  onToggleLayer: (layer: string) => void;
  // Feature-based selection props
  selectMode?: boolean;
  hoveredFeatureId?: string | null;
  selectedFeatureIds?: Set<string>;
  visibleFileIds?: Set<string>;
  onSelectionComplete?: (selected: SelectedFeatures) => void;
  onFeatureSelect?: (featureId: string, featureType: string) => void;
  onToggleSelectMode?: (enabled: boolean) => void;
  // Focus mode props
  focusMode?: boolean;
  onToggleFocusMode?: (enabled: boolean) => void;
  // LayerManager props
  sourceFiles?: SourceFile[];
  segments?: Segment[];
  selectedFileIds?: Set<string>;
  onSelectFile?: (fileId: string, multi?: boolean) => void;
  onHoverFile?: (fileId: string | null) => void;
  onToggleFileVisibility?: (fileId: string) => void;
  onCreateSegment?: (name: string, fileIds: string[]) => Promise<void>;
  onUpdateSegment?: (segmentId: string, updates: { name?: string; fileIds?: string[] }) => Promise<void>;
  onDeleteSegment?: (segmentId: string) => Promise<void>;
  canEdit?: boolean;
}

// Layer config for the control panel (quick toggles)
const LAYER_OPTIONS = [
  { id: "fiber", label: "Fiber Routes", color: "#3b82f6" },
  { id: "infrastructure", label: "Infrastructure", color: "#7c3aed" },
  { id: "poles", label: "Poles", color: "#ca8a04" },
  { id: "conduit", label: "Conduit", color: "#a16207" },
];

export const DesignMapPane = memo(
  function DesignMapPane({
    job,
    bom,
    mapStyles,
    visibleLayers,
    onToggleLayer,
    selectMode = false,
    hoveredFeatureId,
    selectedFeatureIds,
    visibleFileIds,
    onSelectionComplete,
    onFeatureSelect,
    onToggleSelectMode,
    focusMode = false,
    onToggleFocusMode,
    // LayerManager props
    sourceFiles = [],
    segments = [],
    selectedFileIds = new Set(),
    onSelectFile,
    onHoverFile,
    onToggleFileVisibility,
    onCreateSegment,
    onUpdateSegment,
    onDeleteSegment,
    canEdit = false,
  }: DesignMapPaneProps) {
    const [mapStyle, setMapStyle] = useState<"streets" | "satellite" | "outdoors">("outdoors");
    const [showLayerPanel, setShowLayerPanel] = useState(false);
    
    // Check if we have full layer manager functionality
    const hasLayerManagerProps = onSelectFile && onHoverFile && onToggleFileVisibility;

    // Convert layer sets to the format DesignMap expects
    const mapVisibleLayers = useMemo(() => {
      const layers = new Set<string>();
      if (visibleLayers.has("fiber")) layers.add("fiber");
      if (visibleLayers.has("infrastructure") || visibleLayers.has("poles")) {
        layers.add("infrastructure");
      }
      if (visibleLayers.has("conduit")) layers.add("conduit");
      return layers;
    }, [visibleLayers]);

    // Get center from job location or BOM data
    const center = useMemo((): [number, number] | undefined => {
      if (job.locationLng && job.locationLat) {
        return [job.locationLng, job.locationLat];
      }
      // Try to get center from first infrastructure item
      if (bom?.infrastructure?.length) {
        const firstWithLocation = bom.infrastructure.find((i) => i.location);
        if (firstWithLocation?.location) {
          return firstWithLocation.location.coordinates;
        }
      }
      return undefined;
    }, [job.locationLng, job.locationLat, bom?.infrastructure]);

    // No BOM state
    if (!bom) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-100 p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-slate-200 flex items-center justify-center mb-4">
            <MapPin className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            No Design Data
          </h3>
          <p className="text-sm text-slate-500 max-w-xs">
            Import shapefiles from the Materials section to visualize your fiber design on the map.
          </p>
        </div>
      );
    }

    return (
      <div className="h-full relative">
        {/* Map */}
        <DesignMap
          fiberSegments={bom.fiberSegments as any}
          infrastructure={bom.infrastructure as any}
          conduitSegments={bom.conduitSegments as any}
          center={center}
          visibleLayers={mapVisibleLayers}
          style={mapStyle}
          className="h-full w-full"
          selectMode={selectMode}
          hoveredFeatureId={hoveredFeatureId}
          selectedFeatureIds={selectedFeatureIds}
          visibleFileIds={visibleFileIds}
          onSelectionComplete={onSelectionComplete}
          onFeatureSelect={onFeatureSelect}
          focusMode={focusMode}
          onToggleFocusMode={onToggleFocusMode}
        />

        {/* Map Style Toggle */}
        <div className="absolute top-4 right-4 flex bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden z-10">
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

        {/* Map Tools - Left side */}
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          {/* Layer Toggle Button */}
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className={cn(
              "p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm",
              showLayerPanel && "bg-slate-100"
            )}
            title="Toggle layers"
          >
            <Layers className="h-4 w-4 text-slate-600" />
          </button>

          {/* Select Mode Toggle */}
          {onToggleSelectMode && (
            <button
              onClick={() => onToggleSelectMode(!selectMode)}
              className={cn(
                "p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm transition-colors",
                selectMode
                  ? "bg-blue-100 border-blue-300 text-blue-600"
                  : "hover:bg-slate-50 text-slate-600"
              )}
              title={selectMode ? "Exit select mode" : "Enter select mode (draw to select)"}
            >
              <Lasso className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Layer Panel - Full LayerManager when props available */}
        {showLayerPanel && (
          <div className="absolute top-16 left-4 bg-white rounded-lg border border-slate-200 shadow-lg z-20 overflow-hidden" style={{ width: "280px", maxHeight: "calc(100% - 140px)" }}>
            {hasLayerManagerProps && sourceFiles.length > 0 ? (
              <div className="h-full flex flex-col" style={{ maxHeight: "400px" }}>
                {/* Close button header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Layer Manager
                  </span>
                  <button
                    onClick={() => setShowLayerPanel(false)}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <LayerManager
                    sourceFiles={sourceFiles}
                    segments={segments}
                    selectedFileIds={selectedFileIds}
                    hoveredFileId={hoveredFeatureId || null}
                    visibleFileIds={visibleFileIds || new Set()}
                    onSelectFile={onSelectFile!}
                    onHoverFile={onHoverFile!}
                    onToggleFileVisibility={onToggleFileVisibility!}
                    onCreateSegment={onCreateSegment || (async () => {})}
                    onUpdateSegment={onUpdateSegment || (async () => {})}
                    onDeleteSegment={onDeleteSegment || (async () => {})}
                    canEdit={canEdit}
                  />
                </div>
              </div>
            ) : (
              /* Simple layer toggles when no file data */
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Layers
                  </p>
                  <button
                    onClick={() => setShowLayerPanel(false)}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-1">
                  {LAYER_OPTIONS.map((layer) => (
                    <button
                      key={layer.id}
                      onClick={() => onToggleLayer(layer.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors text-left",
                        visibleLayers.has(layer.id)
                          ? "bg-slate-100"
                          : "hover:bg-slate-50"
                      )}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-sm text-slate-700 flex-1">{layer.label}</span>
                      {visibleLayers.has(layer.id) ? (
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats Overlay */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm px-3 py-2 z-10">
          <div className="flex items-center gap-4 text-xs">
            {bom.summary.poleCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-slate-600">{bom.summary.poleCount} poles</span>
              </div>
            )}
            {bom.summary.mstCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                <span className="text-slate-600">{bom.summary.mstCount} MSTs</span>
              </div>
            )}
            {Object.keys(bom.summary.fiberByCount).length > 0 && (
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-slate-600">
                  {Object.values(bom.summary.fiberByCount)
                    .reduce((a, b) => a + b, 0)
                    .toLocaleString()}{" "}
                  ft fiber
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
  // Custom comparison to prevent re-renders on unrelated state changes
  (prevProps, nextProps) => {
    return (
      prevProps.bom === nextProps.bom &&
      prevProps.job.locationLat === nextProps.job.locationLat &&
      prevProps.job.locationLng === nextProps.job.locationLng &&
      prevProps.mapStyles.aerialColor === nextProps.mapStyles.aerialColor &&
      prevProps.mapStyles.undergroundColor === nextProps.mapStyles.undergroundColor &&
      prevProps.visibleLayers === nextProps.visibleLayers &&
      prevProps.selectMode === nextProps.selectMode &&
      prevProps.hoveredFeatureId === nextProps.hoveredFeatureId &&
      prevProps.selectedFeatureIds === nextProps.selectedFeatureIds &&
      prevProps.visibleFileIds === nextProps.visibleFileIds &&
      prevProps.sourceFiles === nextProps.sourceFiles &&
      prevProps.segments === nextProps.segments &&
      prevProps.selectedFileIds === nextProps.selectedFileIds &&
      prevProps.canEdit === nextProps.canEdit
    );
  }
);

export default DesignMapPane;
