"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Eye,
  EyeOff,
  Trash2,
  Settings,
  GripVertical,
  Map,
  Image as ImageIcon,
  Pencil,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapLayer } from "./route-map-view";

interface LayerPanelProps {
  layers: MapLayer[];
  onLayerUpdate: (layerId: string, updates: Partial<MapLayer>) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerSelect: (layer: MapLayer) => void;
  selectedLayerId?: string;
  canEdit: boolean;
}

export function LayerPanel({
  layers,
  onLayerUpdate,
  onLayerDelete,
  onLayerSelect,
  selectedLayerId,
  canEdit,
}: LayerPanelProps) {
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);

  const getLayerIcon = (type: MapLayer["type"]) => {
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
        return Map;
    }
  };

  const getLayerTypeLabel = (type: MapLayer["type"]) => {
    switch (type) {
      case "kmz":
        return "KMZ";
      case "kml":
        return "KML";
      case "geojson":
        return "GeoJSON";
      case "image_overlay":
        return "Image";
      case "drawn":
        return "Drawn";
      default:
        return type;
    }
  };

  if (layers.length === 0) {
    return (
      <div className="p-4 text-center">
        <Map className="h-8 w-8 mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">No layers added yet</p>
        <p className="text-xs text-slate-400 mt-1">
          Upload a KMZ file or image overlay to get started
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {layers.map((layer) => {
        const Icon = getLayerIcon(layer.type);
        const isExpanded = expandedLayerId === layer.id;
        const isSelected = selectedLayerId === layer.id;

        return (
          <div
            key={layer.id}
            className={cn(
              "transition-colors",
              isSelected && "bg-orange-50"
            )}
          >
            {/* Layer Row */}
            <div className="flex items-center gap-2 p-2 hover:bg-slate-50">
              {/* Drag Handle */}
              <div className="text-slate-300 cursor-grab">
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Visibility Toggle */}
              <button
                onClick={() =>
                  onLayerUpdate(layer.id, { visible: !layer.visible })
                }
                className={cn(
                  "p-1 rounded transition-colors",
                  layer.visible
                    ? "text-slate-600 hover:text-slate-800"
                    : "text-slate-300 hover:text-slate-500"
                )}
              >
                {layer.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>

              {/* Layer Icon */}
              <Icon className="h-4 w-4 text-slate-400 shrink-0" />

              {/* Layer Name */}
              <button
                onClick={() => onLayerSelect(layer)}
                className="flex-1 text-left min-w-0"
              >
                <span className="text-sm text-slate-700 truncate block">
                  {layer.name}
                </span>
                <span className="text-xs text-slate-400">
                  {getLayerTypeLabel(layer.type)}
                </span>
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setExpandedLayerId(isExpanded ? null : layer.id)
                  }
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <Settings className="h-4 w-4" />
                </button>

                {canEdit && (
                  <button
                    onClick={() => onLayerDelete(layer.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Settings */}
            {isExpanded && (
              <div className="px-4 pb-3 pt-1 bg-slate-50/50">
                <div className="space-y-3">
                  {/* Opacity Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Opacity</span>
                      <span className="text-xs text-slate-600">
                        {Math.round(layer.opacity * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[layer.opacity]}
                      min={0}
                      max={1}
                      step={0.05}
                      onValueChange={(value) =>
                        onLayerUpdate(layer.id, { opacity: value[0] })
                      }
                      disabled={!canEdit}
                    />
                  </div>

                  {/* Layer Info */}
                  {layer.fileUrl && (
                    <div className="text-xs text-slate-400 truncate">
                      Source: {layer.fileUrl.split("/").pop()}
                    </div>
                  )}

                  {/* Image Overlay Bounds Info */}
                  {layer.type === "image_overlay" && layer.bounds && (
                    <div className="text-xs text-slate-400">
                      Bounds set: {layer.bounds[0][0].toFixed(4)},{" "}
                      {layer.bounds[0][1].toFixed(4)} to{" "}
                      {layer.bounds[1][0].toFixed(4)},{" "}
                      {layer.bounds[1][1].toFixed(4)}
                    </div>
                  )}

                  {layer.type === "image_overlay" && !layer.bounds && canEdit && (
                    <p className="text-xs text-amber-600">
                      Click to set bounds for this overlay
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
