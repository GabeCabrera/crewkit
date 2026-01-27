"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
  Popup,
  type MapRef,
  type ViewStateChangeEvent,
  type LayerProps,
  type MapMouseEvent,
} from "react-map-gl/mapbox";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Feature, LineString, Polygon, MultiPolygon, Point } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { getIntersectingFeatureIds, type SelectedFeatures } from "@/lib/selection-utils";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

// Base threshold at zoom level 14 (in degrees, ~50 meters)
// This scales with zoom to maintain consistent screen-space feel
const BASE_CLOSE_THRESHOLD = 0.0005;
const BASE_ZOOM_LEVEL = 14;

// Calculate zoom-adjusted threshold
// At higher zoom (zoomed in), threshold is smaller in degrees
// At lower zoom (zoomed out), threshold is larger in degrees
function getCloseThreshold(zoom: number): number {
  // Each zoom level doubles/halves the map scale
  // So we scale the threshold by 2^(baseZoom - currentZoom)
  const zoomDiff = BASE_ZOOM_LEVEL - zoom;
  return BASE_CLOSE_THRESHOLD * Math.pow(2, zoomDiff);
}

// Helper to check if point is near first vertex
function isNearFirstVertex(state: any, lngLat: { lng: number; lat: number }, zoom: number): boolean {
  if (!state.polygon?.coordinates?.[0] || state.polygon.coordinates[0].length < 3) {
    return false;
  }
  const firstVertex = state.polygon.coordinates[0][0];
  const distance = Math.sqrt(
    Math.pow(firstVertex[0] - lngLat.lng, 2) +
    Math.pow(firstVertex[1] - lngLat.lat, 2)
  );
  const threshold = getCloseThreshold(zoom);
  return distance < threshold;
}

// Custom draw mode that closes polygon when clicking first vertex
// Enhanced with ghost closing line, pulse animation support, and professional UX
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LoopSelectMode: any = {
  ...MapboxDraw.modes.draw_polygon,

  // Track hover state and current mouse position
  onSetup(this: any, opts: any) {
    const state = (MapboxDraw.modes.draw_polygon.onSetup as any).call(this, opts);
    state.isHoveringClose = false;
    state.currentMousePosition = null;
    state.pulsePhase = 0;
    return state;
  },

  // Override click handler to detect first vertex click
  onClick(this: any, state: any, e: any) {
    // If hovering near first vertex, close the polygon
    if (state.isHoveringClose && state.polygon?.coordinates?.[0]?.length >= 3) {
      return this.changeMode("simple_select", { featureIds: [state.polygon.id] });
    }
    
    // Default behavior - add vertex
    return (MapboxDraw.modes.draw_polygon.onClick as any).call(this, state, e);
  },

  // Track mouse movement for hover effect and ghost line
  onMouseMove(this: any, state: any, e: any) {
    const wasHovering = state.isHoveringClose;
    // Get current zoom level for dynamic threshold scaling
    const zoom = this.map?.getZoom() ?? BASE_ZOOM_LEVEL;
    state.isHoveringClose = isNearFirstVertex(state, e.lngLat, zoom);
    state.currentMousePosition = [e.lngLat.lng, e.lngLat.lat];
    
    // Update cursor based on hover state
    const container = this.map?.getContainer();
    if (container) {
      if (state.isHoveringClose) {
        container.style.cursor = "pointer";
      } else {
        container.style.cursor = "crosshair";
      }
    }
    
    // If hover state changed, trigger redraw
    if (wasHovering !== state.isHoveringClose) {
      this.updateUIClasses({ mouse: state.isHoveringClose ? "pointer" : "add" });
    }
    
    // Emit real-time preview polygon for highlighting features during lasso
    if (state.polygon?.coordinates?.[0]?.length >= 3) {
      const coords = state.polygon.coordinates[0];
      // Create a closed polygon with current mouse position
      const previewPolygon = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[...coords, [e.lngLat.lng, e.lngLat.lat], coords[0]]],
        },
      };
      this.map?.fire("draw.preview", { polygon: previewPolygon });
    }
    
    // Call parent implementation
    return (MapboxDraw.modes.draw_polygon.onMouseMove as any)?.call(this, state, e);
  },

  // Customize the display to show first vertex prominently with hover state
  // Also adds ghost closing line when hovering near first vertex
  toDisplayFeatures(this: any, state: any, geojson: any, display: any) {
    const isPolygon = geojson.geometry.type === "Polygon";
    
    // Call parent implementation
    (MapboxDraw.modes.draw_polygon.toDisplayFeatures as any).call(this, state, geojson, display);
    
    // Add features when we have 3+ points
    if (isPolygon && state.polygon?.coordinates?.[0]?.length >= 3) {
      const firstCoord = state.polygon.coordinates[0][0];
      
      // Add a special marker for the first vertex
      display({
        type: "Feature",
        properties: {
          meta: "first_vertex",
          active: "true",
          hover: state.isHoveringClose ? "true" : "false",
        },
        geometry: {
          type: "Point",
          coordinates: firstCoord,
        },
      });
      
      // Add outer pulse ring when hovering (for animation effect)
      if (state.isHoveringClose) {
        display({
          type: "Feature",
          properties: {
            meta: "first_vertex_pulse",
            active: "true",
          },
          geometry: {
            type: "Point",
            coordinates: firstCoord,
          },
        });
        
        // Add ghost closing line from current mouse to first vertex
        if (state.currentMousePosition) {
          display({
            type: "Feature",
            properties: {
              meta: "closing_line",
              active: "true",
            },
            geometry: {
              type: "LineString",
              coordinates: [state.currentMousePosition, firstCoord],
            },
          });
        }
      }
    }
  },
};

// Custom styles for the draw tool - professional polish with animations
const drawStyles = [
  // Polygon fill - subtle with slight pattern effect
  {
    id: "gl-draw-polygon-fill",
    type: "fill",
    filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
    paint: {
      "fill-color": "#3b82f6",
      "fill-outline-color": "#3b82f6",
      "fill-opacity": 0.12,
    },
  },
  // Polygon outline - clean solid line
  {
    id: "gl-draw-polygon-stroke",
    type: "line",
    filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#3b82f6",
      "line-width": 2.5,
      "line-dasharray": [3, 2],
    },
  },
  // Polygon outline glow (shadow effect)
  {
    id: "gl-draw-polygon-stroke-glow",
    type: "line",
    filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#3b82f6",
      "line-width": 6,
      "line-opacity": 0.15,
      "line-blur": 3,
    },
  },
  // Line being drawn
  {
    id: "gl-draw-line",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"], ["!=", "meta", "closing_line"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#3b82f6",
      "line-width": 2.5,
      "line-dasharray": [3, 2],
    },
  },
  // Line glow effect
  {
    id: "gl-draw-line-glow",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"], ["!=", "meta", "closing_line"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#3b82f6",
      "line-width": 6,
      "line-opacity": 0.15,
      "line-blur": 3,
    },
  },
  // Ghost closing line - dashed line showing where polygon will close
  {
    id: "gl-draw-closing-line",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["==", "meta", "closing_line"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#22c55e",
      "line-width": 2,
      "line-dasharray": [4, 4],
      "line-opacity": 0.8,
    },
  },
  // Ghost closing line glow
  {
    id: "gl-draw-closing-line-glow",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["==", "meta", "closing_line"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#22c55e",
      "line-width": 8,
      "line-opacity": 0.2,
      "line-blur": 4,
    },
  },
  // Vertices (normal) - clean white dots with blue border
  {
    id: "gl-draw-point",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"], ["!=", "meta", "first_vertex"]],
    paint: {
      "circle-radius": 5,
      "circle-color": "#ffffff",
      "circle-stroke-color": "#3b82f6",
      "circle-stroke-width": 2,
    },
  },
  // Vertex shadow for depth
  {
    id: "gl-draw-point-shadow",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"], ["!=", "meta", "first_vertex"]],
    paint: {
      "circle-radius": 8,
      "circle-color": "#3b82f6",
      "circle-opacity": 0.15,
      "circle-blur": 2,
    },
  },
  // First vertex outer pulse ring (for animation)
  {
    id: "gl-draw-first-vertex-pulse-outer",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "first_vertex_pulse"]],
    paint: {
      "circle-radius": 24,
      "circle-color": "#22c55e",
      "circle-opacity": 0.2,
      "circle-stroke-width": 0,
    },
  },
  // First vertex pulse ring (middle)
  {
    id: "gl-draw-first-vertex-pulse-middle",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "first_vertex_pulse"]],
    paint: {
      "circle-radius": 20,
      "circle-color": "#22c55e",
      "circle-opacity": 0.3,
      "circle-stroke-width": 0,
    },
  },
  // First vertex - normal state (green to indicate "click to close")
  {
    id: "gl-draw-first-vertex-glow",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "first_vertex"]],
    paint: {
      "circle-radius": 18,
      "circle-color": "#10b981",
      "circle-opacity": 0.25,
      "circle-blur": 3,
    },
  },
  {
    id: "gl-draw-first-vertex",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "first_vertex"], ["!=", "hover", "true"]],
    paint: {
      "circle-radius": 10,
      "circle-color": "#10b981",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
    },
  },
  // First vertex inner dot
  {
    id: "gl-draw-first-vertex-inner",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "first_vertex"], ["!=", "hover", "true"]],
    paint: {
      "circle-radius": 4,
      "circle-color": "#ffffff",
    },
  },
  // First vertex - hover state (larger, brighter with ring effect)
  {
    id: "gl-draw-first-vertex-hover",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "first_vertex"], ["==", "hover", "true"]],
    paint: {
      "circle-radius": 12,
      "circle-color": "#22c55e",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
    },
  },
  // First vertex hover inner dot
  {
    id: "gl-draw-first-vertex-hover-inner",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "first_vertex"], ["==", "hover", "true"]],
    paint: {
      "circle-radius": 4,
      "circle-color": "#ffffff",
    },
  },
  // Midpoints - subtle
  {
    id: "gl-draw-midpoint",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
    paint: {
      "circle-radius": 3,
      "circle-color": "#3b82f6",
      "circle-opacity": 0.6,
    },
  },
];

// Layer colors by type
const LAYER_COLORS = {
  backbone: "#3b82f6", // blue-500
  lateral: "#f97316", // orange-500
  mst_tail: "#8b5cf6", // violet-500
  strand: "#64748b", // slate-500
  mst: "#7c3aed", // violet-600
  vault: "#059669", // emerald-600
  handhole: "#0891b2", // cyan-600
  pedestal: "#0d9488", // teal-600
  splice: "#dc2626", // red-600
  pole: "#ca8a04", // yellow-600
  riser: "#9333ea", // purple-600
  guy: "#78716c", // stone-500
  slack_loop: "#2563eb", // blue-600
  crossing: "#ea580c", // orange-600
  conduit: "#a16207", // yellow-700
};

// Fiber count colors (higher count = thicker/brighter)
const FIBER_COUNT_COLORS: Record<number, string> = {
  288: "#1d4ed8", // blue-700
  144: "#2563eb", // blue-600
  96: "#3b82f6", // blue-500
  72: "#60a5fa", // blue-400
  48: "#93c5fd", // blue-300
  24: "#f97316", // orange-500
  12: "#fb923c", // orange-400
  6: "#fdba74", // orange-300
  2: "#fde68a", // amber-200
};

export interface FiberSegment {
  id: string;
  segmentType: string;
  fiberCount: number;
  footage: number;
  geometry?: GeoJSON.Geometry | null;
  description?: string | null;
  sourceFileId?: string | null;
}

export interface InfrastructureItem {
  id: string;
  itemType: string;
  quantity: number;
  specs?: string | null;
  label?: string | null;
  subPhase?: string | null;
  poleType?: string | null; // Pole type from shapefile for pole classification
  location?: GeoJSON.Point | null;
  isSelected?: boolean;
  isCompleted?: boolean;
  sourceFileId?: string | null;
  tailFootage?: number | null; // MST tail cable length in feet
}

export interface ConduitSegment {
  id: string;
  conduitSize: string;
  footage: number;
  geometry?: GeoJSON.Geometry | null;
  sourceFileId?: string | null;
}

export interface DesignMapProps {
  fiberSegments: FiberSegment[];
  infrastructure: InfrastructureItem[];
  conduitSegments: ConduitSegment[];
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  visibleLayers?: Set<string>;
  selectedPhases?: Set<string>;
  // Feature-based selection props
  selectMode?: boolean;
  hoveredFeatureId?: string | null;
  selectedFeatureIds?: Set<string>; // All selected feature IDs (fiber, infra, conduit)
  visibleFileIds?: Set<string>;
  onFeatureClick?: (feature: Feature, layerType: string) => void;
  onFeatureSelect?: (featureId: string, featureType: string) => void;
  onSelectionComplete?: (selected: SelectedFeatures) => void;
  onMapLoad?: (map: mapboxgl.Map) => void;
  // Focus mode - dims non-selected features
  focusMode?: boolean;
  onToggleFocusMode?: (enabled: boolean) => void;
  className?: string;
  style?: "streets" | "satellite" | "outdoors";
}

// Convert our data to GeoJSON FeatureCollections
function createFiberGeoJSON(segments: FiberSegment[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = segments
    .filter((seg) => seg.geometry)
    .map((seg) => ({
      type: "Feature" as const,
      id: seg.id,
      properties: {
        id: seg.id,
        featureType: "fiber", // For feature-based selection
        segmentType: seg.segmentType,
        fiberCount: seg.fiberCount,
        footage: seg.footage,
        description: seg.description,
        sourceFileId: seg.sourceFileId || null,
        color: FIBER_COUNT_COLORS[seg.fiberCount] || LAYER_COLORS[seg.segmentType as keyof typeof LAYER_COLORS] || "#64748b",
      },
      geometry: seg.geometry as GeoJSON.Geometry,
    }));

  return { type: "FeatureCollection", features };
}

function createInfraGeoJSON(items: InfrastructureItem[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = items
    .filter((item) => item.location)
    .map((item) => ({
      type: "Feature" as const,
      id: item.id,
      properties: {
        id: item.id,
        featureType: "infrastructure", // For feature-based selection
        itemType: item.itemType,
        quantity: item.quantity,
        specs: item.specs,
        label: item.label,
        subPhase: item.subPhase,
        sourceFileId: item.sourceFileId || null,
        isSelected: item.isSelected ?? true,
        isCompleted: item.isCompleted ?? false,
        color: LAYER_COLORS[item.itemType as keyof typeof LAYER_COLORS] || "#64748b",
      },
      geometry: item.location as GeoJSON.Point,
    }));

  return { type: "FeatureCollection", features };
}

function createConduitGeoJSON(segments: ConduitSegment[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = segments
    .filter((seg) => seg.geometry)
    .map((seg) => ({
      type: "Feature" as const,
      id: seg.id,
      properties: {
        id: seg.id,
        featureType: "conduit", // For feature-based selection
        conduitSize: seg.conduitSize,
        footage: seg.footage,
        sourceFileId: seg.sourceFileId || null,
        color: LAYER_COLORS.conduit,
      },
      geometry: seg.geometry as GeoJSON.Geometry,
    }));

  return { type: "FeatureCollection", features };
}

// Map style URLs
const MAP_STYLES = {
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
};

export function DesignMap({
  fiberSegments,
  infrastructure,
  conduitSegments,
  center,
  zoom = 14,
  visibleLayers,
  selectedPhases,
  selectMode = false,
  hoveredFeatureId,
  selectedFeatureIds,
  visibleFileIds,
  onFeatureClick,
  onFeatureSelect,
  onSelectionComplete,
  onMapLoad,
  focusMode = false,
  onToggleFocusMode,
  className = "",
  style = "streets",
}: DesignMapProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [popupInfo, setPopupInfo] = useState<{
    longitude: number;
    latitude: number;
    feature: Feature;
    layerType: string;
  } | null>(null);
  const [viewState, setViewState] = useState({
    longitude: center?.[0] ?? -111.78,
    latitude: center?.[1] ?? 40.1,
    zoom: zoom,
  });
  
  // Close tooltip state for lasso selection
  const [closeTooltip, setCloseTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });
  
  // Selection completion flash animation
  const [selectionFlash, setSelectionFlash] = useState<{
    visible: boolean;
    count: number;
  }>({ visible: false, count: 0 });
  
  // Preview feature IDs - features highlighted during lasso drawing (before selection completes)
  const [previewFeatureIds, setPreviewFeatureIds] = useState<Set<string>>(new Set());
  
  // Context menu state for multi-feature selection
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    pinned: boolean; // true = clicked to open, false = hover preview
    x: number;
    y: number;
    features: Array<{
      id: string;
      featureType: string;
      layerType: string;
      properties: Record<string, any>;
      isSelected: boolean;
      isDisabled: boolean;
    }>;
  } | null>(null);
  
  // Ref for context menu to detect outside clicks
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // Debounce timer for hover preview
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize GeoJSON data
  const fiberGeoJSON = useMemo(() => createFiberGeoJSON(fiberSegments), [fiberSegments]);
  const infraGeoJSON = useMemo(() => createInfraGeoJSON(infrastructure), [infrastructure]);
  const conduitGeoJSON = useMemo(() => createConduitGeoJSON(conduitSegments), [conduitSegments]);

  // Collect all features for selection logic
  const allFeatures = useMemo(() => {
    return [
      ...fiberGeoJSON.features,
      ...infraGeoJSON.features,
      ...conduitGeoJSON.features,
    ] as Feature<Point | LineString>[];
  }, [fiberGeoJSON, infraGeoJSON, conduitGeoJSON]);

  // Refs to avoid stale closures in event handlers
  const allFeaturesRef = useRef(allFeatures);
  const onSelectionCompleteRef = useRef(onSelectionComplete);
  const setPreviewFeatureIdsRef = useRef(setPreviewFeatureIds);

  // Keep refs in sync with current values
  useEffect(() => {
    allFeaturesRef.current = allFeatures;
  }, [allFeatures]);

  useEffect(() => {
    onSelectionCompleteRef.current = onSelectionComplete;
  }, [onSelectionComplete]);
  
  useEffect(() => {
    setPreviewFeatureIdsRef.current = setPreviewFeatureIds;
  }, [setPreviewFeatureIds]);

  // ResizeObserver to handle container size changes (e.g., sidebar collapse)
  // This ensures the Mapbox canvas redraws smoothly during CSS transitions
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      // Call resize on the map to update the WebGL canvas
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate bounds from all features
  useEffect(() => {
    if (!center && mapRef.current) {
      const allCoords: [number, number][] = [];

      // Collect coords from fiber
      fiberSegments.forEach((seg) => {
        if (seg.geometry?.type === "LineString") {
          (seg.geometry as LineString).coordinates.forEach((coord) => {
            allCoords.push(coord as [number, number]);
          });
        }
      });

      // Collect coords from infrastructure
      infrastructure.forEach((item) => {
        if (item.location) {
          allCoords.push(item.location.coordinates as [number, number]);
        }
      });

      if (allCoords.length > 0) {
        const lngs = allCoords.map((c) => c[0]);
        const lats = allCoords.map((c) => c[1]);
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ];

        mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 16 });
      }
    }
  }, [fiberSegments, infrastructure, center]);

  // Flash animation helper - shows brief pulse when selection completes
  const triggerSelectionFlash = useCallback((count: number) => {
    setSelectionFlash({ visible: true, count });
    // Auto-hide after animation
    setTimeout(() => {
      setSelectionFlash({ visible: false, count: 0 });
    }, 1500);
  }, []);

  // Handle map load - set up draw control
  const handleMapLoad = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      
      // Initialize MapboxDraw with custom lasso mode and styles
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        defaultMode: "simple_select",
        modes: {
          ...MapboxDraw.modes,
          loop_select: LoopSelectMode,
        },
        styles: drawStyles,
        // Touch and click settings for better polygon closing
        touchEnabled: true,
        boxSelect: false,
        clickBuffer: 4,
        touchBuffer: 25,
      });
      
      map.addControl(draw as any);
      drawRef.current = draw;
      
      // Handle draw completion - use refs to avoid stale closures
      map.on("draw.create", (e: any) => {
        const callback = onSelectionCompleteRef.current;
        const features = allFeaturesRef.current;
        
        if (callback && e.features?.length > 0) {
          const drawnPolygon = e.features[0] as Feature<Polygon | MultiPolygon>;
          const selectedFeatures = getIntersectingFeatureIds(drawnPolygon, features);
          
          // Trigger flash animation with count
          const totalCount = selectedFeatures.fiberIds.length + 
                            selectedFeatures.infraIds.length + 
                            selectedFeatures.conduitIds.length;
          if (totalCount > 0) {
            triggerSelectionFlash(totalCount);
          }
          
          callback(selectedFeatures);
          // Clear the drawn shape after selection
          draw.deleteAll();
        }
      });

      // Also handle selection change (for first-vertex closing)
      map.on("draw.selectionchange", (e: any) => {
        const callback = onSelectionCompleteRef.current;
        const features = allFeaturesRef.current;
        
        if (callback && e.features?.length > 0) {
          const selectedFeature = e.features[0];
          if (selectedFeature.geometry?.type === "Polygon") {
            const drawnPolygon = selectedFeature as Feature<Polygon | MultiPolygon>;
            const selectedFeatures = getIntersectingFeatureIds(drawnPolygon, features);
            
            // Trigger flash animation with count
            const totalCount = selectedFeatures.fiberIds.length + 
                              selectedFeatures.infraIds.length + 
                              selectedFeatures.conduitIds.length;
            if (totalCount > 0) {
              triggerSelectionFlash(totalCount);
            }
            
            callback(selectedFeatures);
            // Clear the drawn shape after selection
            draw.deleteAll();
          }
        }
      });
      
      // Track mouse movement for close tooltip
      map.on("mousemove", (e: any) => {
        // Check if we're in draw mode and near first vertex
        if (drawRef.current) {
          const mode = drawRef.current.getMode();
          if (mode === "loop_select") {
            // Get draw state (this is a bit hacky but necessary)
            const drawState = (drawRef.current as any)?._ctx?.store?.getSelectedIds?.();
            // Show tooltip near cursor when in draw mode
            // The actual hover detection is in the LoopSelectMode
          }
        }
      });
      
      // Listen for real-time lasso preview events
      map.on("draw.preview", (e: any) => {
        const setPreview = setPreviewFeatureIdsRef.current;
        const features = allFeaturesRef.current;
        
        if (e.polygon && setPreview) {
          // Calculate features inside the current polygon
          const previewIds = getIntersectingFeatureIds(e.polygon, features);
          const allPreviewIds = new Set([
            ...previewIds.fiberIds,
            ...previewIds.infraIds,
            ...previewIds.conduitIds,
          ]);
          setPreview(allPreviewIds);
        }
      });
      
      // Clear preview when drawing ends or is cancelled
      map.on("draw.modechange", () => {
        setPreviewFeatureIdsRef.current?.(new Set());
      });
      
      if (onMapLoad) {
        onMapLoad(map);
      }
    }
  }, [onMapLoad, triggerSelectionFlash]); // Removed allFeatures and onSelectionComplete - using refs instead
  
  // ESC key to cancel drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectMode && drawRef.current) {
        drawRef.current.deleteAll();
        drawRef.current.changeMode("simple_select");
        // Re-enter loop_select mode to start fresh
        setTimeout(() => {
          if (drawRef.current && selectMode) {
            drawRef.current.changeMode("loop_select");
          }
        }, 50);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectMode]);

  // F key to toggle focus mode (when selection exists)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if 'f' or 'F' is pressed, not in an input field, and selection exists
      if (
        (e.key === "f" || e.key === "F") &&
        !selectMode &&
        selectedFeatureIds &&
        selectedFeatureIds.size > 0 &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        onToggleFocusMode?.(!focusMode);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectMode, selectedFeatureIds, focusMode, onToggleFocusMode]);

  // Toggle draw mode based on selectMode prop
  useEffect(() => {
    if (drawRef.current) {
      if (selectMode) {
        drawRef.current.changeMode("loop_select");
      } else {
        drawRef.current.changeMode("simple_select");
        drawRef.current.deleteAll();
      }
    }
  }, [selectMode]);

  // Helper to get layer type from feature
  const getLayerTypeFromFeature = useCallback((feature: any): string => {
    const layerId = feature.layer?.id || "";
    if (layerId.includes("fiber")) return "fiber";
    if (layerId.includes("infra")) return "infrastructure";
    if (layerId.includes("conduit")) return "conduit";
    return "unknown";
  }, []);

  // Build context menu features from map query results
  const buildContextMenuFeatures = useCallback(
    (features: any[]) => {
      // Deduplicate by feature ID (same feature can appear in multiple layers)
      const seen = new Set<string>();
      return features
        .filter((f) => {
          const id = f.properties?.id;
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        })
        .map((f) => {
          const layerType = getLayerTypeFromFeature(f);
          const featureType = f.properties?.featureType || layerType;
          const id = f.properties?.id;
          const isSelected = selectedFeatureIds?.has(id) ?? false;
          // Feature is disabled if its layer type is not in visibleLayers
          const isDisabled = visibleLayers ? !visibleLayers.has(layerType) : false;
          
          return {
            id,
            featureType,
            layerType,
            properties: f.properties || {},
            isSelected,
            isDisabled,
          };
        });
    },
    [getLayerTypeFromFeature, selectedFeatureIds, visibleLayers]
  );

  // Handle feature click - show context menu with all features at point
  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      // Skip if in select mode (drawing)
      if (selectMode) return;

      const features = e.features;
      if (!features || features.length === 0) {
        // Clicking empty space closes the context menu if not pinned via hover
        if (contextMenu && !contextMenu.pinned) {
          setContextMenu(null);
        }
        setPopupInfo(null);
        return;
      }

      // Build context menu with all features at this point
      const menuFeatures = buildContextMenuFeatures(features);
      
      if (menuFeatures.length === 0) {
        setContextMenu(null);
        return;
      }

      // If only one feature, handle it directly (quick select)
      if (menuFeatures.length === 1) {
        const feature = menuFeatures[0];
        if (!feature.isDisabled && onFeatureSelect) {
          onFeatureSelect(feature.id, feature.featureType);
        }
        setContextMenu(null);
        return;
      }

      // Multiple features - show context menu pinned
      setContextMenu({
        visible: true,
        pinned: true,
        x: e.point.x,
        y: e.point.y,
        features: menuFeatures,
      });

      // Clear popup since we're using context menu
      setPopupInfo(null);
    },
    [selectMode, buildContextMenuFeatures, onFeatureSelect, contextMenu]
  );

  // Handle mouse move for hover preview
  const handleMouseMove = useCallback(
    (e: MapMouseEvent) => {
      // Skip if in select mode or menu is pinned
      if (selectMode || contextMenu?.pinned) return;

      // Clear any pending hover timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      const features = e.features;
      if (!features || features.length === 0) {
        // No features - hide preview after small delay
        hoverTimeoutRef.current = setTimeout(() => {
          setContextMenu((prev) => (prev?.pinned ? prev : null));
        }, 100);
        return;
      }

      // Build menu features
      const menuFeatures = buildContextMenuFeatures(features);
      
      // Only show hover preview if there are multiple features
      if (menuFeatures.length <= 1) {
        setContextMenu((prev) => (prev?.pinned ? prev : null));
        return;
      }

      // Debounce showing the preview to avoid flickering
      hoverTimeoutRef.current = setTimeout(() => {
        setContextMenu({
          visible: true,
          pinned: false,
          x: e.point.x,
          y: e.point.y,
          features: menuFeatures,
        });
      }, 150);
    },
    [selectMode, contextMenu?.pinned, buildContextMenuFeatures]
  );

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Click outside handler to dismiss pinned context menu
  useEffect(() => {
    if (!contextMenu?.pinned) return;

    const handleClickOutside = (e: MouseEvent) => {
      // Check if click is outside the context menu
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };

    // Add listener with slight delay to avoid immediate dismissal
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextMenu?.pinned]);

  // Layer visibility based on props
  const getLayerVisibility = (layerType: string): "visible" | "none" => {
    if (!visibleLayers) return "visible";
    return visibleLayers.has(layerType) ? "visible" : "none";
  };

  // Phase filter expression
  const getPhaseFilter = (): any[] | undefined => {
    if (!selectedPhases || selectedPhases.size === 0) return undefined;
    return ["in", ["get", "subPhase"], ["literal", Array.from(selectedPhases)]];
  };

  // Build arrays for feature-based highlighting
  const hoveredFeatureIdArr = hoveredFeatureId ? [hoveredFeatureId] : [];
  const selectedFeatureIdArr = selectedFeatureIds ? Array.from(selectedFeatureIds) : [];
  const previewFeatureIdArr = previewFeatureIds ? Array.from(previewFeatureIds) : [];

  // Fiber line layer style with hover/selection highlighting
  const fiberLineLayer: LayerProps = {
    id: "fiber-lines",
    type: "line",
    paint: {
      // Keep original feature color - glow layer handles selection highlight
      "line-color": ["get", "color"],
      "line-width": [
        "case",
        // Hovered feature - thicker
        hoveredFeatureId
          ? ["==", ["get", "id"], hoveredFeatureId]
          : false,
        8,
        // Selected features - wider for highlighter effect
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        7,
        // Default width based on fiber count
        [
          "interpolate",
          ["linear"],
          ["get", "fiberCount"],
          2, 2,
          12, 3,
          48, 4,
          144, 5,
          288, 6,
        ],
      ],
      "line-opacity": [
        "case",
        // Hovered or selected - fully opaque
        hoveredFeatureId
          ? ["==", ["get", "id"], hoveredFeatureId]
          : false,
        1,
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        1,
        // Select mode: dim immediately; Focus mode: dim only if selections exist
        selectMode || (focusMode && selectedFeatureIds && selectedFeatureIds.size > 0)
          ? true
          : false,
        0.08,
        // Default
        0.8,
      ],
      // Smooth transitions for visual polish
      "line-opacity-transition": { duration: 300 },
      "line-width-transition": { duration: 200 },
      "line-color-transition": { duration: 200 },
    },
    layout: {
      visibility: getLayerVisibility("fiber"),
    },
  };

  // Conduit line layer style with hover/selection highlighting
  const conduitLineLayer: LayerProps = {
    id: "conduit-lines",
    type: "line",
    paint: {
      // Keep original feature color - glow layer handles selection highlight
      "line-color": LAYER_COLORS.conduit,
      "line-width": [
        "case",
        hoveredFeatureId
          ? ["==", ["get", "id"], hoveredFeatureId]
          : false,
        6,
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        6,
        3,
      ],
      "line-opacity": [
        "case",
        hoveredFeatureId
          ? ["==", ["get", "id"], hoveredFeatureId]
          : false,
        1,
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        1,
        // Select mode: dim immediately; Focus mode: dim only if selections exist
        selectMode || (focusMode && selectedFeatureIds && selectedFeatureIds.size > 0)
          ? true
          : false,
        0.08,
        0.7,
      ],
      "line-dasharray": [2, 2],
      // Smooth transitions for visual polish
      "line-opacity-transition": { duration: 300 },
      "line-width-transition": { duration: 200 },
      "line-color-transition": { duration: 200 },
    },
    layout: {
      visibility: getLayerVisibility("conduit"),
    },
  };

  // Fiber hit area layer - invisible but catches mouse events with larger target
  const fiberHitLayer: LayerProps = {
    id: "fiber-lines-hit",
    type: "line",
    paint: {
      "line-color": "#000000",
      "line-opacity": 0,
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        10, 24,  // At zoom 10: 24px hit area (zoomed out, lines close together)
        14, 18,  // At zoom 14: 18px hit area
        18, 14,  // At zoom 18: 14px hit area (zoomed in, more precision)
      ],
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
      visibility: getLayerVisibility("fiber"),
    },
  };

  // Conduit hit area layer - invisible but catches mouse events with larger target
  const conduitHitLayer: LayerProps = {
    id: "conduit-lines-hit",
    type: "line",
    paint: {
      "line-color": "#000000",
      "line-opacity": 0,
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        10, 24,  // At zoom 10: 24px hit area
        14, 18,  // At zoom 14: 18px hit area
        18, 14,  // At zoom 18: 14px hit area
      ],
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
      visibility: getLayerVisibility("conduit"),
    },
  };

  // White for selection glow
  const SELECTION_COLOR = "#FFFFFF";
  // Lighter white/gray for preview (during lasso drawing)
  const PREVIEW_COLOR = "#E2E8F0";

  // Fiber glow layer - renders underneath main layer for selected features
  // Solid border, no blur, full opacity for crisp selection highlight
  const fiberGlowLayer: LayerProps = {
    id: "fiber-lines-glow",
    type: "line",
    paint: {
      "line-color": [
        "case",
        // Selected features - white
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        SELECTION_COLOR,
        // Preview features (during lasso) - lighter gray
        previewFeatureIds && previewFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", previewFeatureIdArr]]
          : false,
        PREVIEW_COLOR,
        // Default - transparent (won't show anyway due to width 0)
        SELECTION_COLOR,
      ],
      "line-width": [
        "case",
        // Selected features
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        10, // solid border width
        // Preview features
        previewFeatureIds && previewFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", previewFeatureIdArr]]
          : false,
        8, // slightly thinner for preview
        0,  // invisible when not selected or previewed
      ],
      // No line-blur - solid crisp edge
      "line-opacity": [
        "case",
        // Selected features
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        1, // Full opacity
        // Preview features
        previewFeatureIds && previewFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", previewFeatureIdArr]]
          : false,
        0.85, // Slightly transparent for preview
        0,
      ],
      "line-width-transition": { duration: 200 },
      "line-opacity-transition": { duration: 200 },
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
      visibility: getLayerVisibility("fiber"),
    },
  };

  // Conduit glow layer - renders underneath main layer for selected features
  // Solid border, no blur, full opacity for crisp selection highlight
  const conduitGlowLayer: LayerProps = {
    id: "conduit-lines-glow",
    type: "line",
    paint: {
      "line-color": [
        "case",
        // Selected features - white
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        SELECTION_COLOR,
        // Preview features - lighter gray
        previewFeatureIds && previewFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", previewFeatureIdArr]]
          : false,
        PREVIEW_COLOR,
        SELECTION_COLOR,
      ],
      "line-width": [
        "case",
        // Selected features
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        8, // solid border width
        // Preview features
        previewFeatureIds && previewFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", previewFeatureIdArr]]
          : false,
        6, // slightly thinner for preview
        0,  // invisible when not selected or previewed
      ],
      // No line-blur - solid crisp edge
      "line-opacity": [
        "case",
        // Selected features
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        1, // Full opacity
        // Preview features
        previewFeatureIds && previewFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", previewFeatureIdArr]]
          : false,
        0.85,
        0,
      ],
      "line-width-transition": { duration: 200 },
      "line-opacity-transition": { duration: 200 },
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
      visibility: getLayerVisibility("conduit"),
    },
  };

  // Get phase filter (only include if defined)
  const phaseFilter = getPhaseFilter();

  // Infrastructure glow layer - renders underneath main layer for selected features
  // Solid border, no blur, full opacity for crisp selection highlight
  const infraGlowLayer: LayerProps = {
    id: "infra-circles-glow",
    type: "circle",
    paint: {
      "circle-color": [
        "case",
        // Selected features - white
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        SELECTION_COLOR,
        // Preview features - lighter gray
        previewFeatureIds && previewFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", previewFeatureIdArr]]
          : false,
        PREVIEW_COLOR,
        SELECTION_COLOR,
      ],
      "circle-radius": [
        "case",
        // Selected features
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        14, // solid border radius
        // Preview features
        previewFeatureIds && previewFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", previewFeatureIdArr]]
          : false,
        12, // slightly smaller for preview
        0,
      ],
      // No circle-blur - solid crisp edge
      "circle-opacity": [
        "case",
        // Selected features
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        1, // Full opacity
        // Preview features
        previewFeatureIds && previewFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", previewFeatureIdArr]]
          : false,
        0.85,
        0,
      ],
      "circle-radius-transition": { duration: 200 },
      "circle-opacity-transition": { duration: 200 },
    },
    layout: {
      visibility: getLayerVisibility("infrastructure"),
    },
    ...(phaseFilter && { filter: phaseFilter }),
  };

  // Infrastructure circle layer with hover/selection highlighting
  const infraCircleLayer: LayerProps = {
    id: "infra-circles",
    type: "circle",
    paint: {
      // Keep original feature color - glow layer handles selection highlight
      "circle-color": ["get", "color"],
      "circle-radius": [
        "case",
        // Hovered feature - larger
        hoveredFeatureId
          ? ["==", ["get", "id"], hoveredFeatureId]
          : false,
        12,
        // Default based on item type
        [
          "match",
          ["get", "itemType"],
          "pole", 4,
          "mst", 8,
          "vault", 7,
          "handhole", 6,
          "splice", 6,
          5,
        ],
      ],
      "circle-stroke-color": [
        "case",
        // Hovered - blue border
        hoveredFeatureId
          ? ["==", ["get", "id"], hoveredFeatureId]
          : false,
        "#3b82f6",
        // Completed - green border
        ["get", "isCompleted"],
        "#10b981",
        // Default
        "#ffffff",
      ],
      "circle-stroke-width": [
        "case",
        hoveredFeatureId
          ? ["==", ["get", "id"], hoveredFeatureId]
          : false,
        3,
        ["get", "isCompleted"],
        3,
        1,
      ],
      "circle-opacity": [
        "case",
        hoveredFeatureId
          ? ["==", ["get", "id"], hoveredFeatureId]
          : false,
        1,
        selectedFeatureIds && selectedFeatureIds.size > 0
          ? ["in", ["get", "id"], ["literal", selectedFeatureIdArr]]
          : false,
        1,
        // Select mode: dim immediately; Focus mode: dim only if selections exist
        selectMode || (focusMode && selectedFeatureIds && selectedFeatureIds.size > 0)
          ? true
          : false,
        0.08,
        ["get", "isSelected"],
        1,
        0.4,
      ],
      // Smooth transitions for visual polish
      "circle-opacity-transition": { duration: 300 },
      "circle-radius-transition": { duration: 200 },
      "circle-stroke-width-transition": { duration: 200 },
      "circle-color-transition": { duration: 200 },
      "circle-stroke-color-transition": { duration: 200 },
    },
    layout: {
      visibility: getLayerVisibility("infrastructure"),
    },
    // Only include filter if phases are selected (Mapbox rejects undefined)
    ...(phaseFilter && { filter: phaseFilter }),
  };

  // Infrastructure labels
  const infraLabelLayer: LayerProps = {
    id: "infra-labels",
    type: "symbol",
    layout: {
      "text-field": ["get", "label"],
      "text-size": 10,
      "text-offset": [0, 1.5],
      "text-anchor": "top",
      visibility: getLayerVisibility("infrastructure"),
    },
    paint: {
      "text-color": "#374151",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1,
    },
    // Only include filter if phases are selected (Mapbox rejects undefined)
    ...(phaseFilter && { filter: phaseFilter }),
  };

  // Map dim overlay - darkens base map during selection/focus mode
  const showMapOverlay = selectMode || focusMode;
  
  // Full-world polygon for overlay
  const overlayGeoJSON: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]],
      },
    }],
  };

  const mapOverlayLayer: LayerProps = {
    id: "map-dim-overlay",
    type: "fill",
    paint: {
      "fill-color": "#1e293b", // slate-800 for a professional dark overlay
      "fill-opacity": showMapOverlay ? 0.35 : 0,
      "fill-opacity-transition": { duration: 300 },
    },
  };

  // Interactable layers - use hit layers for fiber/conduit for larger click targets
  const interactiveLayerIds = ["fiber-lines-hit", "conduit-lines-hit", "infra-circles"];

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`flex items-center justify-center h-full w-full bg-slate-100 ${className}`}>
        <p className="text-slate-500">Mapbox token not configured</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative h-full w-full ${className}`} 
      style={{ cursor: selectMode ? "crosshair" : undefined }}
    >
      <Map
        ref={mapRef}
        {...viewState}
        cursor={selectMode ? "crosshair" : undefined}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        onLoad={handleMapLoad}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        interactiveLayerIds={interactiveLayerIds}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLES[style]}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Navigation Controls - bottom-right to avoid overlapping with style toggle */}
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" />

        {/* Map Dim Overlay - darkens base map during selection/focus mode */}
        <Source id="overlay-source" type="geojson" data={overlayGeoJSON}>
          <Layer {...mapOverlayLayer} />
        </Source>

        {/* Fiber Lines Source & Layers (glow underneath, visible, hit area on top) */}
        <Source id="fiber-source" type="geojson" data={fiberGeoJSON}>
          <Layer {...fiberGlowLayer} />
          <Layer {...fiberLineLayer} />
          <Layer {...fiberHitLayer} />
        </Source>

        {/* Conduit Lines Source & Layers (glow underneath, visible, hit area on top) */}
        <Source id="conduit-source" type="geojson" data={conduitGeoJSON}>
          <Layer {...conduitGlowLayer} />
          <Layer {...conduitLineLayer} />
          <Layer {...conduitHitLayer} />
        </Source>

        {/* Infrastructure Source & Layers (glow underneath, visible on top) */}
        <Source id="infra-source" type="geojson" data={infraGeoJSON}>
          <Layer {...infraGlowLayer} />
          <Layer {...infraCircleLayer} />
          <Layer {...infraLabelLayer} />
        </Source>

        {/* Popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
          >
            <div className="p-2 min-w-[150px]">
              <FeaturePopupContent
                feature={popupInfo.feature}
                layerType={popupInfo.layerType}
              />
            </div>
          </Popup>
        )}
      </Map>
      
      {/* Selection Mode Hint - shows ESC to cancel */}
      {selectMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-gray-900/90 text-white text-sm px-4 py-2 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Click to add points
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-300">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono">ESC</kbd> to cancel
            </span>
          </div>
        </div>
      )}
      
      {/* Selection Complete Flash Animation */}
      {selectionFlash.visible && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
          {/* Pulse ring effect */}
          <div className="absolute inset-0 bg-blue-500/10 animate-[pulse_0.5s_ease-out]" />
          
          {/* Count badge */}
          <div className="animate-[bounceIn_0.4s_ease-out] bg-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{selectionFlash.count}</p>
              <p className="text-sm text-gray-500">features selected</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Feature Context Menu - for selecting overlapping features */}
      {contextMenu?.visible && (
        <FeatureContextMenu
          menu={contextMenu}
          onSelect={(id, featureType) => {
            if (onFeatureSelect) {
              onFeatureSelect(id, featureType);
            }
            // Update menu to reflect new selection state
            setContextMenu((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                features: prev.features.map((f) =>
                  f.id === id ? { ...f, isSelected: !f.isSelected } : f
                ),
              };
            });
          }}
          onClose={() => setContextMenu(null)}
          menuRef={contextMenuRef}
          onMouseEnter={() => {
            // Clear any pending hide timeout when entering menu
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            // Hide menu after delay when leaving (unless pinned)
            if (!contextMenu.pinned) {
              hoverTimeoutRef.current = setTimeout(() => {
                setContextMenu(null);
              }, 150);
            }
          }}
        />
      )}
      
      {/* Focus Mode Indicator Bar */}
      {focusMode && selectedFeatureIds && selectedFeatureIds.size > 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-gray-900/95 text-white px-4 py-2.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-3">
            {/* Eye icon */}
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            
            {/* Label */}
            <span className="text-sm font-medium">
              Focused on <span className="text-blue-400 font-bold">{selectedFeatureIds.size}</span> features
            </span>
            
            {/* Divider */}
            <span className="text-gray-600">|</span>
            
            {/* Show All button */}
            <button
              onClick={() => onToggleFocusMode?.(false)}
              className="text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Show All
            </button>
            
            {/* Keyboard hint */}
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono text-gray-400">
              F
            </kbd>
          </div>
        </div>
      )}
    </div>
  );
}

// Popup content component
function FeaturePopupContent({
  feature,
  layerType,
}: {
  feature: Feature;
  layerType: string;
}) {
  const props = feature.properties || {};

  if (layerType === "fiber") {
    return (
      <div>
        <p className="font-semibold text-slate-800 capitalize">
          {props.segmentType?.replace("_", " ")}
        </p>
        {props.fiberCount > 0 && (
          <p className="text-sm text-slate-600">{props.fiberCount} count</p>
        )}
        <p className="text-sm text-slate-600">
          {Number(props.footage).toLocaleString()} ft
        </p>
        {props.description && (
          <p className="text-xs text-slate-500 mt-1">{props.description}</p>
        )}
      </div>
    );
  }

  if (layerType === "infrastructure") {
    return (
      <div>
        <p className="font-semibold text-slate-800 capitalize">
          {props.itemType?.replace("_", " ")}
        </p>
        {props.label && (
          <p className="text-sm font-mono text-slate-700">{props.label}</p>
        )}
        {props.specs && (
          <p className="text-sm text-slate-600">{props.specs}</p>
        )}
        {props.subPhase && (
          <p className="text-xs text-slate-500">Phase {props.subPhase}</p>
        )}
        {props.isCompleted && (
          <p className="text-xs text-emerald-600 font-medium mt-1">✓ Completed</p>
        )}
      </div>
    );
  }

  if (layerType === "conduit") {
    return (
      <div>
        <p className="font-semibold text-slate-800">Conduit</p>
        <p className="text-sm text-slate-600">{props.conduitSize}" diameter</p>
        <p className="text-sm text-slate-600">
          {Number(props.footage).toLocaleString()} ft
        </p>
      </div>
    );
  }

  return <p className="text-slate-500">Unknown feature</p>;
}

// SVG Icon components for feature types
const FeatureIcons = {
  // Fiber/Line icons
  fiber: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.5">
      <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
      <circle cx="7" cy="12" r="2" fill={color || "currentColor"} stroke="none" />
      <circle cx="17" cy="12" r="2" fill={color || "currentColor"} stroke="none" />
    </svg>
  ),
  backbone: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="3">
      <line x1="2" y1="12" x2="22" y2="12" strokeLinecap="round" />
    </svg>
  ),
  lateral: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.5">
      <path d="M3 12h10M13 12l5-5M13 12l5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  mst_tail: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.5">
      <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" strokeDasharray="4 3" />
    </svg>
  ),
  strand: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2">
      <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
    </svg>
  ),
  // Infrastructure icons
  pole: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.5" fill={color || "currentColor"} stroke="none" />
    </svg>
  ),
  splice: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color || "currentColor"} strokeLinejoin="round" />
    </svg>
  ),
  mst: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="9" y1="9" x2="9" y2="20" />
    </svg>
  ),
  vault: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill={color || "currentColor"}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  ),
  handhole: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  ),
  pedestal: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2">
      <rect x="6" y="3" width="12" height="18" rx="1" />
      <line x1="6" y1="8" x2="18" y2="8" />
    </svg>
  ),
  riser: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2">
      <path d="M12 3v18M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  // Conduit
  conduit: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2">
      <path d="M4 8h16M4 16h16" strokeLinecap="round" />
      <path d="M4 8v8M20 8v8" strokeLinecap="round" />
    </svg>
  ),
  // Generic/fallback
  infrastructure: ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill={color || "currentColor"}>
      <circle cx="12" cy="12" r="6" />
    </svg>
  ),
};

// Feature type colors and labels
const FEATURE_TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  fiber: { color: "#3b82f6", label: "Fiber" },
  infrastructure: { color: "#ca8a04", label: "Infrastructure" },
  conduit: { color: "#a16207", label: "Conduit" },
  // Infrastructure subtypes
  pole: { color: "#ca8a04", label: "Pole" },
  splice: { color: "#dc2626", label: "Splice" },
  mst: { color: "#7c3aed", label: "MST" },
  vault: { color: "#059669", label: "Vault" },
  handhole: { color: "#0891b2", label: "Handhole" },
  pedestal: { color: "#0d9488", label: "Pedestal" },
  riser: { color: "#9333ea", label: "Riser" },
  // Fiber subtypes
  backbone: { color: "#3b82f6", label: "Backbone" },
  lateral: { color: "#f97316", label: "Lateral" },
  mst_tail: { color: "#8b5cf6", label: "MST Tail" },
  strand: { color: "#64748b", label: "Strand" },
};

// Get icon component for a feature type
function getFeatureIcon(type: string): React.FC<{ className?: string; color?: string }> {
  return FeatureIcons[type as keyof typeof FeatureIcons] || FeatureIcons.infrastructure;
}

// Context menu for selecting features at a point - minimal list design
function FeatureContextMenu({
  menu,
  onSelect,
  onClose,
  menuRef,
  onMouseEnter,
  onMouseLeave,
}: {
  menu: {
    visible: boolean;
    pinned: boolean;
    x: number;
    y: number;
    features: Array<{
      id: string;
      featureType: string;
      layerType: string;
      properties: Record<string, any>;
      isSelected: boolean;
      isDisabled: boolean;
    }>;
  };
  onSelect: (id: string, featureType: string) => void;
  onClose: () => void;
  menuRef: React.RefObject<HTMLDivElement>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  // Smart positioning - keep menu within viewport
  const menuStyle: React.CSSProperties = {
    position: "absolute",
    left: menu.x,
    top: menu.y + 8,
    transform: "translateX(-50%)",
    zIndex: 50,
  };

  // Get icon type for a feature
  const getIconType = (feature: typeof menu.features[0]) => {
    return feature.properties?.itemType || feature.properties?.segmentType || feature.layerType;
  };

  // Get config for a feature
  const getConfig = (feature: typeof menu.features[0]) => {
    const subType = feature.properties?.itemType || feature.properties?.segmentType;
    return FEATURE_TYPE_CONFIG[subType] || FEATURE_TYPE_CONFIG[feature.layerType] || {
      color: "#64748b",
      label: feature.featureType,
    };
  };

  // Get display label for a feature
  const getLabel = (feature: typeof menu.features[0]) => {
    const props = feature.properties;
    if (feature.layerType === "fiber") {
      const type = props.segmentType?.replace("_", " ") || "Fiber";
      const count = props.fiberCount ? `${props.fiberCount}ct` : "";
      return `${type} ${count}`.trim();
    }
    if (feature.layerType === "infrastructure") {
      const type = props.itemType?.replace("_", " ") || "Infrastructure";
      const label = props.label ? ` (${props.label})` : "";
      return `${type}${label}`;
    }
    if (feature.layerType === "conduit") {
      return `Conduit ${props.conduitSize}"`;
    }
    return feature.featureType;
  };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
    >
      {menu.features.map((feature) => {
        const config = getConfig(feature);
        const label = getLabel(feature);
        const iconType = getIconType(feature);
        const IconComponent = getFeatureIcon(iconType);
        
        return (
          <button
            key={feature.id}
            onClick={() => {
              if (!feature.isDisabled) {
                onSelect(feature.id, feature.featureType);
              }
            }}
            disabled={feature.isDisabled}
            className={`
              w-full px-3 py-1.5 flex items-center gap-2.5 text-left
              transition-colors duration-75
              ${feature.isDisabled 
                ? "opacity-40 cursor-not-allowed" 
                : "hover:bg-gray-100 cursor-pointer"
              }
              ${feature.isSelected && !feature.isDisabled ? "bg-lime-50" : ""}
            `}
          >
            {/* Feature icon */}
            <IconComponent 
              className="w-4 h-4 flex-shrink-0" 
              color={feature.isDisabled ? "#9ca3af" : feature.isSelected ? "#84cc16" : config.color} 
            />

            {/* Feature label */}
            <span className={`text-sm capitalize truncate ${
              feature.isDisabled 
                ? "text-gray-400" 
                : feature.isSelected 
                  ? "text-lime-700 font-medium" 
                  : "text-gray-700"
            }`}>
              {label}
            </span>

            {/* Selected checkmark */}
            {feature.isSelected && !feature.isDisabled && (
              <svg className="w-4 h-4 text-lime-500 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default DesignMap;
