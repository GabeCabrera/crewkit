"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JobPlanData } from "../../job-lifecycle-view";
import type { FiberSegment, InfrastructureItem, ConduitSegment } from "../../design-map";

// Dynamically import DesignWorkspace to avoid SSR issues with Mapbox
const DesignWorkspace = dynamic(
  () => import("../../design-workspace").then((mod) => mod.DesignWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[500px] bg-slate-50 rounded-xl">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    ),
  }
);

interface BOMData {
  id: string;
  importedAt: string;
  sourceFiles: string[];
  fiberSegments: FiberSegment[];
  infrastructure: InfrastructureItem[];
  conduitSegments: ConduitSegment[];
}

interface DesignStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  refreshJob?: () => Promise<void>;
  canEdit: boolean;
}

export function DesignStep({ job, updateJob, refreshJob, canEdit }: DesignStepProps) {
  const [bom, setBom] = useState<BOMData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<{ fiber: string[]; infra: string[] }>({
    fiber: [],
    infra: [],
  });

  // Fetch BOM data
  useEffect(() => {
    async function fetchBom() {
      try {
        const response = await fetch(`/api/job-plans/${job.id}/bom`);
        if (response.ok) {
          const data = await response.json();
          if (data.exists && data.bom) {
            setBom(data.bom);
          }
        }
      } catch (err) {
        console.error("Error fetching BOM:", err);
        setError("Failed to load design data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchBom();
  }, [job.id]);

  // Handle selection change
  const handleSelectionChange = useCallback(
    (selection: { fiber: string[]; infra: string[] }) => {
      setSelectedIds(selection);
    },
    []
  );

  // Save selection
  const handleSaveSelection = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/job-plans/${job.id}/bom/selection`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedInfraIds: selectedIds.infra,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update job with new totals
        if (data.totals) {
          updateJob({
            totalDistance: data.totals.totalFootage,
            fiberFootage: data.totals.fiberFootage,
            poleCount: data.totals.poleCount,
          });
        }
      }
    } catch (err) {
      console.error("Error saving selection:", err);
    } finally {
      setIsSaving(false);
    }
  }, [job.id, selectedIds, updateJob]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // No BOM imported yet
  if (!bom) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <MapPin className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            No Design Data Imported
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Import your GIS shapefiles in the Materials step to visualize the design
            and select which portions to include in this job.
          </p>
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Go to Materials Step
          </Button>
        </div>

        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">How to use Design View</p>
              <ol className="text-sm text-amber-700 mt-2 space-y-1 list-decimal list-inside">
                <li>Go to the <strong>Materials</strong> step</li>
                <li>Upload a ZIP file containing your shapefiles from Vetro/GIS</li>
                <li>Return here to visualize and select design elements</li>
                <li>Filter by SubPhase to narrow down to this specific job</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-xl border border-red-200 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto text-red-400 mb-2" />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Imported from {bom.sourceFiles.length} shapefiles
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={handleSaveSelection}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Selection
          </Button>
        )}
      </div>

      {/* Design Workspace */}
      <div className="h-[600px] rounded-xl overflow-hidden border border-slate-200">
        <DesignWorkspace
          fiberSegments={bom.fiberSegments}
          infrastructure={bom.infrastructure}
          conduitSegments={bom.conduitSegments}
          onSelectionChange={handleSelectionChange}
          onSaveSelection={handleSaveSelection}
          readOnly={!canEdit}
          className="h-full"
        />
      </div>

      {/* Help text */}
      <p className="text-sm text-slate-500">
        Use the sidebar controls to toggle layers, filter by SubPhase, and view totals.
        {canEdit && " Selection tools allow you to draw boundaries to select specific areas."}
      </p>
    </div>
  );
}

export default DesignStep;
