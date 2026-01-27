"use client";

import { useState, useEffect, useCallback, use } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Layers,
  Navigation,
  CheckCircle2,
  Circle,
  MapPin,
  X,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Dynamically import the map to avoid SSR issues
const DesignMap = dynamic(
  () => import("@/components/job-planner/design-map").then((mod) => mod.DesignMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    ),
  }
);

interface JobData {
  id: string;
  jobName: string;
  jobNumber: string | null;
  locationLat: number | null;
  locationLng: number | null;
}

interface BOMData {
  fiberSegments: Array<{
    id: string;
    segmentType: string;
    fiberCount: number;
    footage: number;
    geometry?: unknown;
  }>;
  infrastructure: Array<{
    id: string;
    itemType: string;
    quantity: number;
    specs?: string;
    label?: string;
    subPhase?: string;
    location?: { type: "Point"; coordinates: [number, number] };
    isSelected: boolean;
    isCompleted: boolean;
  }>;
  conduitSegments: Array<{
    id: string;
    conduitSize: string;
    footage: number;
    geometry?: unknown;
  }>;
}

interface ProgressStats {
  total: number;
  completed: number;
  byType: Record<string, { total: number; completed: number }>;
}

export default function FieldMapPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [job, setJob] = useState<JobData | null>(null);
  const [bom, setBom] = useState<BOMData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [showLayers, setShowLayers] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(
    new Set(["fiber", "infrastructure", "conduit"])
  );
  const [selectedPhases, setSelectedPhases] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<BOMData["infrastructure"][0] | null>(null);
  
  // Progress stats
  const [progressStats, setProgressStats] = useState<ProgressStats>({
    total: 0,
    completed: 0,
    byType: {},
  });

  // Fetch job and BOM data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch job
        const jobRes = await fetch(`/api/job-plans/${jobId}`);
        if (!jobRes.ok) throw new Error("Job not found");
        const jobData = await jobRes.json();
        setJob(jobData);

        // Fetch BOM
        const bomRes = await fetch(`/api/job-plans/${jobId}/bom`);
        if (bomRes.ok) {
          const bomData = await bomRes.json();
          if (bomData.exists && bomData.bom) {
            setBom(bomData.bom);
            calculateProgress(bomData.bom.infrastructure);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load job data");
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated") {
      fetchData();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [jobId, status, router]);

  // Calculate progress stats
  const calculateProgress = useCallback((infrastructure: BOMData["infrastructure"]) => {
    const stats: ProgressStats = {
      total: infrastructure.length,
      completed: 0,
      byType: {},
    };

    infrastructure.forEach((item) => {
      if (!stats.byType[item.itemType]) {
        stats.byType[item.itemType] = { total: 0, completed: 0 };
      }
      stats.byType[item.itemType].total += item.quantity;
      
      if (item.isCompleted) {
        stats.completed += item.quantity;
        stats.byType[item.itemType].completed += item.quantity;
      }
    });

    setProgressStats(stats);
  }, []);

  // Mark item complete/incomplete
  const toggleItemComplete = useCallback(async (itemId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/job-plans/${jobId}/bom/selection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          infrastructureId: itemId,
          isCompleted: !currentStatus,
        }),
      });

      if (response.ok) {
        // Update local state
        setBom((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            infrastructure: prev.infrastructure.map((item) =>
              item.id === itemId
                ? { ...item, isCompleted: !currentStatus }
                : item
            ),
          };
          calculateProgress(updated.infrastructure);
          return updated;
        });
        setSelectedItem(null);
      }
    } catch (err) {
      console.error("Error updating completion:", err);
    }
  }, [jobId, calculateProgress]);

  // Handle feature click from map
  const handleFeatureClick = useCallback((feature: unknown, layerType: string) => {
    if (layerType === "infrastructure" && bom) {
      const props = (feature as { properties?: { id?: string } }).properties;
      const item = bom.infrastructure.find((i) => i.id === props?.id);
      if (item) {
        setSelectedItem(item);
      }
    }
  }, [bom]);

  // Get unique phases
  const availablePhases = bom
    ? Array.from(new Set(bom.infrastructure.filter((i) => i.subPhase).map((i) => i.subPhase!)))
        .sort()
    : [];

  // Toggle layer visibility
  const toggleLayer = (layer: string) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  // Loading state
  if (isLoading || status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Error state
  if (error || !job) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-100 p-4">
        <p className="text-slate-600">{error || "Job not found"}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  // No BOM
  if (!bom) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-100 p-4">
        <MapPin className="h-12 w-12 text-slate-300" />
        <p className="text-slate-600 text-center">No design data available for this job</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const progressPercent = progressStats.total > 0
    ? Math.round((progressStats.completed / progressStats.total) * 100)
    : 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0 safe-area-inset-top">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="-ml-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-slate-900 truncate">{job.jobName}</h1>
          <p className="text-xs text-slate-500">{job.jobNumber || "Field Map"}</p>
        </div>
        
        {/* Progress Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-600">
            {progressPercent}%
          </span>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 relative">
        <DesignMap
          fiberSegments={bom.fiberSegments as any}
          infrastructure={bom.infrastructure as any}
          conduitSegments={bom.conduitSegments as any}
          center={job.locationLng && job.locationLat ? [job.locationLng, job.locationLat] : undefined}
          visibleLayers={visibleLayers}
          selectedPhases={selectedPhases.size > 0 ? selectedPhases : undefined}
          onFeatureClick={handleFeatureClick}
          style="satellite"
          className="h-full w-full"
        />

        {/* Floating Controls */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setShowLayers(!showLayers)}
            className="h-10 w-10 bg-white shadow-md"
          >
            <Layers className="h-5 w-5" />
          </Button>
          {availablePhases.length > 0 && (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 w-10 bg-white shadow-md"
            >
              <Filter className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Layer Panel */}
        {showLayers && (
          <div className="absolute top-4 left-16 bg-white rounded-xl shadow-lg p-4 min-w-[200px]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-slate-700">Layers</span>
              <button onClick={() => setShowLayers(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { id: "fiber", label: "Fiber Routes" },
                { id: "infrastructure", label: "Infrastructure" },
                { id: "conduit", label: "Conduit" },
              ].map((layer) => (
                <label key={layer.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visibleLayers.has(layer.id)}
                    onChange={() => toggleLayer(layer.id)}
                    className="rounded"
                  />
                  <span className="text-sm text-slate-600">{layer.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Phase Filter Panel */}
        {showFilters && (
          <div className="absolute top-16 left-16 bg-white rounded-xl shadow-lg p-4 min-w-[200px] max-h-60 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-slate-700">Filter by Phase</span>
              <button onClick={() => setShowFilters(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-2">
              {availablePhases.map((phase) => (
                <label key={phase} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedPhases.size === 0 || selectedPhases.has(phase)}
                    onChange={() => {
                      setSelectedPhases((prev) => {
                        const next = new Set(prev);
                        if (next.has(phase)) next.delete(phase);
                        else next.add(phase);
                        return next;
                      });
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-slate-600">Phase {phase}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Selected Item Panel */}
        {selectedItem && (
          <div className="absolute bottom-20 left-4 right-4 bg-white rounded-xl shadow-lg p-4 safe-area-inset-bottom">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-slate-800 capitalize">
                  {selectedItem.itemType.replace("_", " ")}
                </p>
                {selectedItem.label && (
                  <p className="text-sm font-mono text-slate-600">{selectedItem.label}</p>
                )}
                {selectedItem.specs && (
                  <p className="text-xs text-slate-500">{selectedItem.specs}</p>
                )}
                {selectedItem.subPhase && (
                  <p className="text-xs text-slate-400">Phase {selectedItem.subPhase}</p>
                )}
              </div>
              <button onClick={() => setSelectedItem(null)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <Button
              onClick={() => toggleItemComplete(selectedItem.id, selectedItem.isCompleted)}
              className={cn(
                "w-full gap-2",
                selectedItem.isCompleted
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-emerald-500 hover:bg-emerald-600"
              )}
            >
              {selectedItem.isCompleted ? (
                <>
                  <Circle className="h-4 w-4" />
                  Mark as Incomplete
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Complete
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Stats Bar */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 safe-area-inset-bottom">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {Object.entries(progressStats.byType)
              .filter(([type]) => ["pole", "mst", "splice"].includes(type))
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  () => {
                    // Could center map on user location
                  },
                  (err) => console.error(err)
                );
              }
            }}
            className="gap-1 text-blue-600"
          >
            <Navigation className="h-4 w-4" />
            My Location
          </Button>
        </div>
      </div>
    </div>
  );
}
