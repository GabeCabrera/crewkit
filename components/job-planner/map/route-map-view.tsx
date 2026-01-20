"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Layers,
  Maximize2,
  Minimize2,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Ruler,
  Loader2,
  Settings,
  X,
  AlertCircle,
  FileCode,
  Pencil,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MeasurementResult, SavedMeasurement } from "./measurement-tools";

// Types for map data
export interface MapLayer {
  id: string;
  name: string;
  type: "kmz" | "kml" | "geojson" | "image_overlay" | "drawn";
  fileUrl?: string;
  geoJson?: GeoJSON.GeoJsonObject;
  bounds?: [[number, number], [number, number]];
  opacity: number;
  visible: boolean;
  zIndex: number;
}

export interface MapConfig {
  center: { lat: number; lng: number };
  zoom: number;
  layers: MapLayer[];
}

interface RouteMapViewProps {
  jobId: string;
  initialConfig?: Partial<MapConfig>;
  onConfigChange?: (config: MapConfig) => void;
  canEdit: boolean;
}

// Default center (US)
const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const DEFAULT_ZOOM = 4;

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Dynamically import the map to avoid SSR issues with Leaflet
const MapContent = dynamic(() => import("./map-content"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-xl">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  ),
});

// Helper to get layer icon
function getLayerIcon(type: MapLayer["type"]) {
  switch (type) {
    case "kmz":
    case "kml":
    case "geojson":
      return FileCode;
    case "image_overlay":
      return ImageIcon;
    case "drawn":
      return Pencil;
    default:
      return Layers;
  }
}

export function RouteMapView({
  jobId,
  initialConfig,
  onConfigChange,
  canEdit,
}: RouteMapViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [lastMeasurement, setLastMeasurement] = useState<MeasurementResult | null>(null);
  const [mapConfig, setMapConfig] = useState<MapConfig>({
    center: initialConfig?.center || DEFAULT_CENTER,
    zoom: initialConfig?.zoom || DEFAULT_ZOOM,
    layers: initialConfig?.layers || [],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [savedMeasurement, setSavedMeasurement] = useState<SavedMeasurement | null>(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [networkDesignMode, setNetworkDesignMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Get the selected layer for editing
  const selectedLayer = selectedLayerId
    ? mapConfig.layers.find((l) => l.id === selectedLayerId)
    : null;

  // Sync layers from initialConfig when it changes (e.g., after API load)
  useEffect(() => {
    if (initialConfig) {
      setMapConfig(prev => ({
        ...prev,
        center: initialConfig.center || prev.center,
        zoom: initialConfig.zoom ?? prev.zoom,
        layers: initialConfig.layers || prev.layers,
      }));
    }
  }, [initialConfig]);

  // Handle measurement completion
  const handleMeasurementComplete = useCallback((result: MeasurementResult) => {
    setLastMeasurement(result);
  }, []);

  // Load saved measurement from API
  useEffect(() => {
    const loadSavedMeasurement = async () => {
      try {
        const response = await fetch(`/api/job-plans/${jobId}/map`);
        if (response.ok) {
          const data = await response.json();
          if (data.measurementData) {
            setSavedMeasurement(data.measurementData as SavedMeasurement);
          }
        }
      } catch (error) {
        console.error("Error loading saved measurement:", error);
      }
    };

    if (jobId) {
      loadSavedMeasurement();
    }
  }, [jobId]);

  // Save measurement to API
  const handleSaveMeasurement = useCallback(async (data: SavedMeasurement, updateTotalDistance: boolean) => {
    const body: Record<string, unknown> = {
      measurementData: data,
    };

    if (updateTotalDistance) {
      body.totalDistance = data.result.totalCableRequired;
    }

    const response = await fetch(`/api/job-plans/${jobId}/map`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("Failed to save measurement");
    }

    setSavedMeasurement(data);
  }, [jobId]);

  // Sync config changes to parent
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(mapConfig);
    }
  }, [mapConfig, onConfigChange]);

  // Clear upload error after 5 seconds
  useEffect(() => {
    if (uploadError) {
      const timer = setTimeout(() => setUploadError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadError]);

  const handleMapMove = useCallback((center: { lat: number; lng: number }, zoom: number) => {
    setMapConfig((prev) => ({ ...prev, center, zoom }));
  }, []);

  const handleLayerAdd = useCallback((layerOrLayers: MapLayer | MapLayer[]) => {
    const layersToAdd = Array.isArray(layerOrLayers) ? layerOrLayers : [layerOrLayers];
    setMapConfig((prev) => ({
      ...prev,
      layers: [...prev.layers, ...layersToAdd],
    }));
  }, []);

  const handleLayerUpdate = useCallback(async (layerId: string, updates: Partial<MapLayer>) => {
    // Update local state immediately for responsiveness
    setMapConfig((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l)),
    }));

    // Sync to server
    try {
      await fetch(`/api/job-plans/${jobId}/map/layers/${layerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error("Error updating layer:", error);
    }
  }, [jobId]);

  const handleLayerDelete = useCallback(async (layerId: string) => {
    // Clear selection if deleting selected layer
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }

    // Update local state immediately
    setMapConfig((prev) => ({
      ...prev,
      layers: prev.layers.filter((l) => l.id !== layerId),
    }));

    // Sync to server
    try {
      await fetch(`/api/job-plans/${jobId}/map/layers/${layerId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error deleting layer:", error);
    }
  }, [jobId, selectedLayerId]);

  // Handle drawn feature creation
  const handleFeatureCreate = useCallback(async (feature: GeoJSON.Feature) => {
    try {
      // Find existing drawn layer or create new one
      const existingDrawnLayer = mapConfig.layers.find(l => l.type === "drawn");
      
      if (existingDrawnLayer) {
        // Add feature to existing layer
        const existingGeoJson = existingDrawnLayer.geoJson as GeoJSON.FeatureCollection;
        const updatedGeoJson: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: [...(existingGeoJson?.features || []), feature],
        };

        // Update locally and sync to server
        handleLayerUpdate(existingDrawnLayer.id, {
          geoJson: updatedGeoJson as GeoJSON.GeoJsonObject,
        });
      } else {
        // Create new drawn layer via API
        const response = await fetch(`/api/job-plans/${jobId}/map/layers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Drawn Features",
            type: "drawn",
            geoJson: {
              type: "FeatureCollection",
              features: [feature],
            },
            opacity: 1.0,
            visible: true,
          }),
        });

        if (response.ok) {
          const newLayer = await response.json();
          handleLayerAdd(newLayer);
        }
      }
    } catch (error) {
      console.error("Error saving drawn feature:", error);
    }
  }, [jobId, mapConfig.layers, handleLayerUpdate, handleLayerAdd]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File too large. Maximum size is 10MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobId", jobId);

      const response = await fetch(`/api/job-plans/${jobId}/map/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const layer = await response.json();
      handleLayerAdd(layer);
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File too large. Maximum size is 10MB.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobId", jobId);
      formData.append("type", "image_overlay");

      const response = await fetch(`/api/job-plans/${jobId}/map/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const layer = await response.json();
      handleLayerAdd(layer);
      // Auto-select image overlays for positioning
      setSelectedLayerId(layer.id);
      setShowLayerPanel(true);
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const containerClass = isFullscreen
    ? "fixed inset-0 z-50 bg-white"
    : "relative w-full h-[400px] rounded-xl overflow-hidden border border-slate-200";

  return (
    <div className={containerClass}>
      {/* Upload Error Alert */}
      {uploadError && (
        <div className="absolute top-3 left-3 right-[180px] z-[1001] bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-sm text-red-700 flex-1">{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Map Toolbar */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5">
        {canEdit && (
          <>
            {/* KMZ/KML Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".kmz,.kml"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 bg-white/95 backdrop-blur-sm shadow-md hover:bg-white"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-1.5 text-xs">KMZ</span>
            </Button>

            {/* Image Overlay Upload */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 bg-white/95 backdrop-blur-sm shadow-md hover:bg-white"
            >
              <ImageIcon className="h-4 w-4" />
              <span className="ml-1.5 text-xs">Overlay</span>
            </Button>
          </>
        )}

        {/* Measurement Tool Toggle */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setMeasurementMode(!measurementMode);
            if (!measurementMode) setDrawingMode(false);
          }}
          className={cn(
            "h-8 bg-white/95 backdrop-blur-sm shadow-md hover:bg-white",
            measurementMode && "bg-blue-100 text-blue-700 hover:bg-blue-100"
          )}
          title="Measure Cable Distance"
        >
          <Ruler className="h-4 w-4" />
        </Button>

        {/* Drawing Tool Toggle */}
        {canEdit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setDrawingMode(!drawingMode);
              if (!drawingMode) {
                setMeasurementMode(false);
                setNetworkDesignMode(false);
              }
            }}
            className={cn(
              "h-8 bg-white/95 backdrop-blur-sm shadow-md hover:bg-white",
              drawingMode && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
            )}
            title="Draw Features"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}

        {/* Network Design Toggle */}
        {canEdit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setNetworkDesignMode(!networkDesignMode);
              if (!networkDesignMode) {
                setMeasurementMode(false);
                setDrawingMode(false);
              }
            }}
            className={cn(
              "h-8 bg-white/95 backdrop-blur-sm shadow-md hover:bg-white",
              networkDesignMode && "bg-violet-100 text-violet-700 hover:bg-violet-100"
            )}
            title="Network Design"
          >
            <Network className="h-4 w-4" />
          </Button>
        )}

        {/* Layer Panel Toggle */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className={cn(
            "h-8 bg-white/95 backdrop-blur-sm shadow-md hover:bg-white",
            showLayerPanel && "bg-orange-100 text-orange-700 hover:bg-orange-100"
          )}
          title="Layers"
        >
          <Layers className="h-4 w-4" />
        </Button>

        {/* Fullscreen Toggle */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="h-8 bg-white/95 backdrop-blur-sm shadow-md hover:bg-white"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Layer Panel */}
      {showLayerPanel && (
        <div className="absolute top-14 right-3 z-[1000] w-72 bg-white/98 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-900">Layers</h3>
            <span className="text-xs text-slate-400">{mapConfig.layers.length} layer{mapConfig.layers.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {mapConfig.layers.length === 0 ? (
              <div className="p-4 text-center">
                <Layers className="h-8 w-8 mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-500">No layers added</p>
                <p className="text-xs text-slate-400 mt-1">
                  Upload a KMZ file or image overlay
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {mapConfig.layers.map((layer) => {
                  const Icon = getLayerIcon(layer.type);
                  const isSelected = selectedLayerId === layer.id;
                  const isImageOverlay = layer.type === "image_overlay";
                  const needsBounds = isImageOverlay && !layer.bounds;

                  return (
                    <div
                      key={layer.id}
                      className={cn(
                        "rounded-lg border transition-all",
                        isSelected
                          ? "border-orange-300 bg-orange-50"
                          : "border-transparent hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-2 p-2">
                        {/* Visibility Toggle */}
                        <button
                          onClick={() => handleLayerUpdate(layer.id, { visible: !layer.visible })}
                          className={cn(
                            "p-1 rounded transition-colors",
                            layer.visible
                              ? "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                              : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"
                          )}
                        >
                          {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>

                        {/* Layer Info */}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setSelectedLayerId(isSelected ? null : layer.id)}
                        >
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-700 truncate">{layer.name}</span>
                          </div>
                          {needsBounds && (
                            <span className="text-xs text-amber-600">Needs positioning</span>
                          )}
                        </div>

                        {/* Settings/Delete */}
                        <div className="flex items-center gap-0.5">
                          {isImageOverlay && canEdit && (
                            <button
                              onClick={() => setSelectedLayerId(isSelected ? null : layer.id)}
                              className={cn(
                                "p-1 rounded transition-colors",
                                isSelected
                                  ? "text-orange-600 bg-orange-100"
                                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                              )}
                              title="Configure overlay"
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleLayerDelete(layer.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete layer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Settings for Selected Layer */}
                      {isSelected && (
                        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-slate-100 mt-1">
                          {/* Opacity Control */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Opacity</span>
                              <span className="text-xs text-slate-600 font-medium">
                                {Math.round(layer.opacity * 100)}%
                              </span>
                            </div>
                            <Slider
                              value={[layer.opacity]}
                              min={0}
                              max={1}
                              step={0.05}
                              onValueChange={(value) => handleLayerUpdate(layer.id, { opacity: value[0] })}
                              disabled={!canEdit}
                            />
                          </div>

                          {/* Bounds Info for Image Overlays */}
                          {isImageOverlay && (
                            <div className="text-xs text-slate-500">
                              {layer.bounds ? (
                                <div className="space-y-1">
                                  <div className="font-medium text-slate-600">Bounds</div>
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 bg-slate-50 rounded p-2">
                                    <div>N: {layer.bounds[1][0].toFixed(4)}</div>
                                    <div>E: {layer.bounds[1][1].toFixed(4)}</div>
                                    <div>S: {layer.bounds[0][0].toFixed(4)}</div>
                                    <div>W: {layer.bounds[0][1].toFixed(4)}</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                                  <p className="text-amber-700 font-medium">Position Required</p>
                                  <p className="text-amber-600 mt-0.5">
                                    Set bounds by entering coordinates or use the default map center position.
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-2 h-7 text-xs w-full border-amber-300 hover:bg-amber-100"
                                    onClick={() => {
                                      const offset = 0.01;
                                      const newBounds: [[number, number], [number, number]] = [
                                        [mapConfig.center.lat - offset, mapConfig.center.lng - offset],
                                        [mapConfig.center.lat + offset, mapConfig.center.lng + offset],
                                      ];
                                      handleLayerUpdate(layer.id, { bounds: newBounds });
                                    }}
                                  >
                                    Set to Map Center
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Content */}
      <MapContent
        center={mapConfig.center}
        zoom={mapConfig.zoom}
        layers={mapConfig.layers}
        onMapMove={handleMapMove}
        onLayerUpdate={handleLayerUpdate}
        canEdit={canEdit}
        measurementMode={measurementMode}
        onMeasurementComplete={handleMeasurementComplete}
        savedMeasurement={savedMeasurement}
        onSaveMeasurement={handleSaveMeasurement}
        drawingMode={drawingMode}
        onFeatureCreate={handleFeatureCreate}
        drawnFeatures={mapConfig.layers.find(l => l.type === "drawn")?.geoJson as GeoJSON.FeatureCollection | undefined}
        jobId={jobId}
        networkDesignMode={networkDesignMode}
      />
    </div>
  );
}
