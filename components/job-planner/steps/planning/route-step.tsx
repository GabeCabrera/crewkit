"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Map, Info, Ruler, Layers, Upload } from "lucide-react";
import type { JobPlanData } from "../../job-lifecycle-view";
import { RouteMapView, type MapConfig } from "../../map";

interface RouteStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function RouteStep({ job, updateJob, canEdit }: RouteStepProps) {
  const [showDetails, setShowDetails] = useState(true);
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load map config from job data
  useEffect(() => {
    const loadMapConfig = async () => {
      setIsLoadingMap(true);
      try {
        const response = await fetch(`/api/job-plans/${job.id}/map`);
        if (response.ok) {
          const config = await response.json();
          setMapConfig(config);
        }
      } catch (error) {
        console.error("Error loading map config:", error);
      } finally {
        setIsLoadingMap(false);
      }
    };

    if (job.id) {
      loadMapConfig();
    }
  }, [job.id]);

  // Debounced map config save
  const handleMapConfigChange = useCallback(
    (config: MapConfig) => {
      setMapConfig(config);
      
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save to avoid excessive API calls
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/job-plans/${job.id}/map`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              center: config.center,
              zoom: config.zoom,
            }),
          });
        } catch (error) {
          console.error("Error saving map config:", error);
        }
      }, 1000);
    },
    [job.id]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Route Details Section - Collapsible */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-100/80 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
              <Info className="h-4 w-4 text-slate-500" />
            </div>
            <span className="font-semibold text-slate-700">Route Details</span>
          </div>
          {showDetails ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>

        {showDetails && (
          <div className="p-4 space-y-4 bg-white">
            <div className="space-y-2">
              <Label htmlFor="jobName" className="text-sm font-medium">Job Name *</Label>
              <Input
                id="jobName"
                type="text"
                value={job.jobName}
                onChange={(e) => updateJob({ jobName: e.target.value })}
                placeholder="Enter job name"
                className="h-11 rounded-lg"
                disabled={!canEdit}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startPoleId" className="text-sm font-medium">Start Pole ID *</Label>
                <Input
                  id="startPoleId"
                  type="text"
                  value={job.startPoleId}
                  onChange={(e) => updateJob({ startPoleId: e.target.value })}
                  placeholder="e.g., P-001"
                  className="h-11 rounded-lg"
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endPoleId" className="text-sm font-medium">End Pole ID *</Label>
                <Input
                  id="endPoleId"
                  type="text"
                  value={job.endPoleId}
                  onChange={(e) => updateJob({ endPoleId: e.target.value })}
                  placeholder="e.g., P-050"
                  className="h-11 rounded-lg"
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalDistance" className="text-sm font-medium">Total Distance (ft) *</Label>
              <Input
                id="totalDistance"
                type="number"
                value={job.totalDistance || ""}
                onChange={(e) =>
                  updateJob({ totalDistance: Number(e.target.value) || 0 })
                }
                placeholder="Enter total distance in feet"
                className="h-11 rounded-lg"
                min="0"
                disabled={!canEdit}
              />
              <p className="text-xs text-slate-500">
                This will auto-populate the strand footage and calculate fiber
                footage in Materials.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                <span className="text-red-500">*</span> Required fields
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Map Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center">
              <Map className="h-4 w-4 text-orange-600" />
            </div>
            <span className="font-semibold text-slate-700">Route Map</span>
          </div>
          {isLoadingMap && (
            <span className="text-xs text-slate-400">Loading map...</span>
          )}
        </div>

        <RouteMapView
          jobId={job.id}
          initialConfig={mapConfig || undefined}
          onConfigChange={handleMapConfigChange}
          canEdit={canEdit}
        />

        {/* Map Features Info */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">
            Map Features
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <Upload className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-700">KMZ/KML Upload</div>
                <div className="text-xs text-slate-500">Import route data from GIS applications</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-700">Multiple Layers</div>
                <div className="text-xs text-slate-500">Toggle visibility of different data layers</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <Ruler className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-700">Cable Measurement</div>
                <div className="text-xs text-slate-500">Calculate cable with sag, slack loops & splices</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <Map className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-700">Base Maps</div>
                <div className="text-xs text-slate-500">Street, Satellite, Hybrid, Topographic</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
