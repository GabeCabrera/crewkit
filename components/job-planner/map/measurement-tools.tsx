"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMap, useMapEvents, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Ruler,
  Plus,
  Trash2,
  Calculator,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Constants for cable calculations
const FEET_PER_METER = 3.28084;
const METERS_PER_MILE = 1609.344;

// Default calculation parameters (industry standards)
const DEFAULT_SAG_PERCENTAGE = 2.5; // 2.5% sag is typical for aerial fiber
const DEFAULT_SLACK_LOOP_FEET = 30; // 30 feet per slack loop
const DEFAULT_SPLICE_SLACK_FEET = 75; // 75 feet per splice case

export interface MeasurementPoint {
  id: string;
  latlng: L.LatLng;
  isSlackLoop: boolean;
  isSplicePoint: boolean;
}

export interface MeasurementResult {
  straightLineDistance: number; // feet
  distanceWithSag: number; // feet
  slackLoopTotal: number; // feet
  spliceSlackTotal: number; // feet
  totalCableRequired: number; // feet
  spans: SpanMeasurement[];
}

export interface SpanMeasurement {
  from: number;
  to: number;
  straightDistance: number;
  withSag: number;
}

interface MeasurementToolsProps {
  enabled: boolean;
  onMeasurementComplete?: (result: MeasurementResult) => void;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(point1: L.LatLng, point2: L.LatLng): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (point1.lat * Math.PI) / 180;
  const lat2 = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Calculate sag factor based on span length
// Longer spans have more sag due to cable weight
function calculateSagFactor(spanLengthFeet: number, baseSagPercentage: number): number {
  // For very short spans (<100ft), sag is minimal
  if (spanLengthFeet < 100) {
    return 1 + (baseSagPercentage * 0.5) / 100;
  }
  // For medium spans (100-300ft), use base sag
  if (spanLengthFeet < 300) {
    return 1 + baseSagPercentage / 100;
  }
  // For long spans (300-500ft), increase sag
  if (spanLengthFeet < 500) {
    return 1 + (baseSagPercentage * 1.3) / 100;
  }
  // For very long spans (>500ft), further increase
  return 1 + (baseSagPercentage * 1.5) / 100;
}

// Custom marker icon for measurement points
function createMeasurementIcon(index: number, isSlackLoop: boolean, isSplicePoint: boolean) {
  let bgColor = "#3b82f6"; // Blue default
  if (isSplicePoint) bgColor = "#ef4444"; // Red for splice
  else if (isSlackLoop) bgColor = "#f97316"; // Orange for slack loop

  return L.divIcon({
    className: "measurement-marker",
    html: `<div style="
      width: 28px;
      height: 28px;
      background: ${bgColor};
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Map click handler component
function MapClickHandler({
  onMapClick,
  enabled,
}: {
  onMapClick: (latlng: L.LatLng) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

export function MeasurementTools({
  enabled,
  onMeasurementComplete,
}: MeasurementToolsProps) {
  const map = useMap();
  const [points, setPoints] = useState<MeasurementPoint[]>([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState<MeasurementResult | null>(null);

  // Calculation parameters
  const [sagPercentage, setSagPercentage] = useState(DEFAULT_SAG_PERCENTAGE);
  const [slackLoopFeet, setSlackLoopFeet] = useState(DEFAULT_SLACK_LOOP_FEET);
  const [spliceSlackFeet, setSpliceSlackFeet] = useState(DEFAULT_SPLICE_SLACK_FEET);

  // Reset state when measurement mode is disabled
  useEffect(() => {
    if (!enabled) {
      setIsPlacing(false);
    }
  }, [enabled]);

  // Calculate measurements whenever points or parameters change
  useEffect(() => {
    if (points.length < 2) {
      setResult(null);
      return;
    }

    const spans: SpanMeasurement[] = [];
    let totalStraight = 0;
    let totalWithSag = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const distanceMeters = calculateDistance(points[i].latlng, points[i + 1].latlng);
      const distanceFeet = distanceMeters * FEET_PER_METER;
      const sagFactor = calculateSagFactor(distanceFeet, sagPercentage);
      const withSag = distanceFeet * sagFactor;

      spans.push({
        from: i,
        to: i + 1,
        straightDistance: Math.round(distanceFeet),
        withSag: Math.round(withSag),
      });

      totalStraight += distanceFeet;
      totalWithSag += withSag;
    }

    // Count slack loops and splice points
    const slackLoopCount = points.filter((p) => p.isSlackLoop).length;
    const splicePointCount = points.filter((p) => p.isSplicePoint).length;

    const slackLoopTotal = slackLoopCount * slackLoopFeet;
    const spliceSlackTotal = splicePointCount * spliceSlackFeet;

    const measurement: MeasurementResult = {
      straightLineDistance: Math.round(totalStraight),
      distanceWithSag: Math.round(totalWithSag),
      slackLoopTotal,
      spliceSlackTotal,
      totalCableRequired: Math.round(totalWithSag + slackLoopTotal + spliceSlackTotal),
      spans,
    };

    setResult(measurement);

    if (onMeasurementComplete) {
      onMeasurementComplete(measurement);
    }
  }, [points, sagPercentage, slackLoopFeet, spliceSlackFeet, onMeasurementComplete]);

  const handleMapClick = useCallback((latlng: L.LatLng) => {
    const newPoint: MeasurementPoint = {
      id: `point-${Date.now()}`,
      latlng,
      isSlackLoop: false,
      isSplicePoint: false,
    };
    setPoints((prev) => [...prev, newPoint]);
  }, []);

  const toggleSlackLoop = useCallback((pointId: string) => {
    setPoints((prev) =>
      prev.map((p) => (p.id === pointId ? { ...p, isSlackLoop: !p.isSlackLoop } : p))
    );
  }, []);

  const toggleSplicePoint = useCallback((pointId: string) => {
    setPoints((prev) =>
      prev.map((p) => (p.id === pointId ? { ...p, isSplicePoint: !p.isSplicePoint } : p))
    );
  }, []);

  const removePoint = useCallback((pointId: string) => {
    setPoints((prev) => prev.filter((p) => p.id !== pointId));
  }, []);

  const clearAll = useCallback(() => {
    setPoints([]);
    setResult(null);
  }, []);

  const undoLastPoint = useCallback(() => {
    setPoints((prev) => prev.slice(0, -1));
  }, []);

  if (!enabled) return null;

  // Line positions for the polyline
  const linePositions = points.map((p) => [p.latlng.lat, p.latlng.lng] as [number, number]);

  return (
    <>
      {/* Map click handler */}
      <MapClickHandler onMapClick={handleMapClick} enabled={isPlacing} />

      {/* Measurement line */}
      {points.length >= 2 && (
        <Polyline
          positions={linePositions}
          pathOptions={{
            color: "#3b82f6",
            weight: 3,
            opacity: 0.8,
            dashArray: "10, 5",
          }}
        />
      )}

      {/* Measurement markers */}
      {points.map((point, index) => (
        <Marker
          key={point.id}
          position={point.latlng}
          icon={createMeasurementIcon(index, point.isSlackLoop, point.isSplicePoint)}
        >
          <Popup>
            <div className="p-1 min-w-[180px]">
              <div className="font-medium mb-2">Point {index + 1}</div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={point.isSlackLoop}
                    onCheckedChange={() => toggleSlackLoop(point.id)}
                  />
                  <span>Slack Loop (+{slackLoopFeet} ft)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={point.isSplicePoint}
                    onCheckedChange={() => toggleSplicePoint(point.id)}
                  />
                  <span>Splice Point (+{spliceSlackFeet} ft)</span>
                </label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removePoint(point.id)}
                className="w-full mt-2 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove Point
              </Button>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Measurement Control Panel */}
      <div className="absolute bottom-4 left-4 z-[1000] w-72 bg-white/98 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-blue-50/50">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <Ruler className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-semibold text-sm text-slate-900">
              Cable Measurement
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={undoLastPoint}
              disabled={points.length === 0}
              className="h-7 w-7 p-0 hover:bg-blue-100"
              title="Undo last point"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={points.length === 0}
              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              title="Clear all points"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b border-slate-100">
          <Button
            onClick={() => setIsPlacing(!isPlacing)}
            variant={isPlacing ? "default" : "outline"}
            size="sm"
            className={cn(
              "w-full h-9",
              isPlacing && "bg-blue-500 hover:bg-blue-600"
            )}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isPlacing ? "Click map to add points..." : "Add Measurement Points"}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="p-3 space-y-3">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-1.5 text-sm">
              <div className="bg-slate-50 p-2 rounded-lg">
                <div className="text-slate-500 text-xs">Straight Line</div>
                <div className="font-semibold text-slate-800">
                  {result.straightLineDistance.toLocaleString()} ft
                </div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <div className="text-slate-500 text-xs">With Sag (+{sagPercentage}%)</div>
                <div className="font-semibold text-slate-800">
                  {result.distanceWithSag.toLocaleString()} ft
                </div>
              </div>
              <div className="bg-orange-50 p-2 rounded-lg border border-orange-100">
                <div className="text-orange-600 text-xs">
                  Slack Loops ({points.filter((p) => p.isSlackLoop).length}x)
                </div>
                <div className="font-semibold text-orange-700">
                  +{result.slackLoopTotal.toLocaleString()} ft
                </div>
              </div>
              <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                <div className="text-red-600 text-xs">
                  Splice Slack ({points.filter((p) => p.isSplicePoint).length}x)
                </div>
                <div className="font-semibold text-red-700">
                  +{result.spliceSlackTotal.toLocaleString()} ft
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-blue-600 text-xs font-medium uppercase tracking-wide">
                    Total Cable Required
                  </div>
                  <div className="text-2xl font-bold text-blue-700">
                    {result.totalCableRequired.toLocaleString()} ft
                  </div>
                  <div className="text-xs text-blue-500 mt-0.5">
                    ≈ {(result.totalCableRequired / 5280).toFixed(2)} miles
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Calculator className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Span Details */}
            {result.spans.length > 0 && (
              <div className="text-xs">
                <div className="font-medium text-slate-600 mb-1.5">Span Details:</div>
                <div className="max-h-20 overflow-y-auto space-y-1 pr-1">
                  {result.spans.map((span, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-slate-500 bg-slate-50 px-2 py-1.5 rounded-lg"
                    >
                      <span className="text-slate-600 font-medium">
                        {span.from + 1} → {span.to + 1}
                      </span>
                      <span>
                        {span.straightDistance.toLocaleString()} → {span.withSag.toLocaleString()} ft
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="border-t border-slate-100">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between p-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span className="font-medium">Calculation Settings</span>
            {showSettings ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showSettings && (
            <div className="px-3 pb-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Sag Percentage (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={sagPercentage}
                  onChange={(e) => setSagPercentage(parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
                <p className="text-xs text-slate-400">
                  Typical: 2-3% for aerial fiber
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Slack Loop (ft each)</Label>
                <Input
                  type="number"
                  step="5"
                  min="0"
                  max="100"
                  value={slackLoopFeet}
                  onChange={(e) => setSlackLoopFeet(parseInt(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
                <p className="text-xs text-slate-400">
                  Typical: 20-50 ft per loop
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Splice Case Slack (ft each)</Label>
                <Input
                  type="number"
                  step="5"
                  min="0"
                  max="200"
                  value={spliceSlackFeet}
                  onChange={(e) => setSpliceSlackFeet(parseInt(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
                <p className="text-xs text-slate-400">
                  Typical: 50-100 ft per splice
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSagPercentage(DEFAULT_SAG_PERCENTAGE);
                  setSlackLoopFeet(DEFAULT_SLACK_LOOP_FEET);
                  setSpliceSlackFeet(DEFAULT_SPLICE_SLACK_FEET);
                }}
                className="w-full h-8 text-xs"
              >
                Reset to Defaults
              </Button>
            </div>
          )}
        </div>

        {/* Instructions */}
        {points.length === 0 && !result && (
          <div className="p-3 bg-slate-50 border-t border-slate-100">
            <p className="text-xs text-slate-500 leading-relaxed">
              Click <span className="font-medium text-slate-600">&quot;Add Measurement Points&quot;</span> then click on the map to place
              pole/attachment points. Click markers to add slack loops or splice points.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// Standalone component for the measurement button in the map toolbar
export function MeasurementButton({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      className={cn(
        "bg-white/90 backdrop-blur-sm shadow-md",
        enabled && "bg-blue-100 text-blue-700"
      )}
    >
      <Ruler className="h-4 w-4" />
    </Button>
  );
}
