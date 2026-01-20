"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { X, Move, RotateCcw } from "lucide-react";
import type { MapLayer } from "./route-map-view";

interface ImageOverlayManagerProps {
  layer: MapLayer;
  onUpdate: (updates: Partial<MapLayer>) => void;
  onClose: () => void;
  mapCenter: { lat: number; lng: number };
}

export function ImageOverlayManager({
  layer,
  onUpdate,
  onClose,
  mapCenter,
}: ImageOverlayManagerProps) {
  const [bounds, setBounds] = useState<{
    north: string;
    south: string;
    east: string;
    west: string;
  }>(() => {
    if (layer.bounds) {
      const [[south, west], [north, east]] = layer.bounds;
      return {
        north: String(north),
        south: String(south),
        east: String(east),
        west: String(west),
      };
    }
    // Default to a small area around the map center
    const offset = 0.01;
    return {
      north: String(mapCenter.lat + offset),
      south: String(mapCenter.lat - offset),
      east: String(mapCenter.lng + offset),
      west: String(mapCenter.lng - offset),
    };
  });

  const [opacity, setOpacity] = useState(layer.opacity);

  const handleBoundsChange = useCallback(
    (key: "north" | "south" | "east" | "west", value: string) => {
      setBounds((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleApplyBounds = useCallback(() => {
    const north = parseFloat(bounds.north);
    const south = parseFloat(bounds.south);
    const east = parseFloat(bounds.east);
    const west = parseFloat(bounds.west);

    if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) {
      return;
    }

    const newBounds: [[number, number], [number, number]] = [
      [south, west],
      [north, east],
    ];

    onUpdate({ bounds: newBounds });
  }, [bounds, onUpdate]);

  const handleOpacityChange = useCallback(
    (value: number[]) => {
      const newOpacity = value[0];
      setOpacity(newOpacity);
      onUpdate({ opacity: newOpacity });
    },
    [onUpdate]
  );

  const handleCenterOnMap = useCallback(() => {
    const offset = 0.005;
    const newBounds = {
      north: String(mapCenter.lat + offset),
      south: String(mapCenter.lat - offset),
      east: String(mapCenter.lng + offset),
      west: String(mapCenter.lng - offset),
    };
    setBounds(newBounds);
  }, [mapCenter]);

  return (
    <div className="absolute bottom-4 left-4 z-[1000] w-80 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200">
      <div className="flex items-center justify-between p-3 border-b border-slate-100">
        <h3 className="font-medium text-sm text-slate-900">
          Position Overlay: {layer.name}
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-4">
        {/* Opacity Slider */}
        <div className="space-y-2">
          <Label className="text-xs">Opacity: {Math.round(opacity * 100)}%</Label>
          <Slider
            value={[opacity]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={handleOpacityChange}
          />
        </div>

        {/* Bounds Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Geographic Bounds</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCenterOnMap}
              className="h-7 text-xs"
            >
              <Move className="h-3 w-3 mr-1" />
              Center on Map
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500">North (Lat)</label>
              <Input
                type="number"
                step="0.0001"
                value={bounds.north}
                onChange={(e) => handleBoundsChange("north", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">South (Lat)</label>
              <Input
                type="number"
                step="0.0001"
                value={bounds.south}
                onChange={(e) => handleBoundsChange("south", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">East (Lng)</label>
              <Input
                type="number"
                step="0.0001"
                value={bounds.east}
                onChange={(e) => handleBoundsChange("east", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">West (Lng)</label>
              <Input
                type="number"
                step="0.0001"
                value={bounds.west}
                onChange={(e) => handleBoundsChange("west", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleApplyBounds}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          size="sm"
        >
          Apply Bounds
        </Button>

        <p className="text-xs text-slate-500">
          Tip: Set the coordinates to position your image overlay on the map.
          The overlay will stretch to fit these bounds.
        </p>
      </div>
    </div>
  );
}
