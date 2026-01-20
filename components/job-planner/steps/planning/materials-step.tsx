"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { JobPlanData } from "../../job-lifecycle-view";

interface MaterialsStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function MaterialsStep({ job, updateJob, canEdit }: MaterialsStepProps) {
  // Auto-calculate fiber footage when total distance changes (only if not already set)
  useEffect(() => {
    if (job.totalDistance > 0 && job.fiberFootage === 0) {
      updateJob({
        strandFootage: job.strandFootage || job.totalDistance,
        fiberFootage: Math.round(job.totalDistance * 1.1),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.totalDistance]);

  return (
    <div className="space-y-6">
      {/* Footage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="strandFootage">Strand Footage *</Label>
          <Input
            id="strandFootage"
            type="number"
            value={job.strandFootage || ""}
            onChange={(e) => updateJob({ strandFootage: Number(e.target.value) || 0 })}
            placeholder="Defaults to total distance"
            className="h-12 rounded-xl"
            min="0"
            disabled={!canEdit}
          />
          <p className="text-xs text-slate-500">Defaults to total route distance</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fiberFootage">Fiber Footage *</Label>
          <Input
            id="fiberFootage"
            type="number"
            value={job.fiberFootage || ""}
            onChange={(e) => updateJob({ fiberFootage: Number(e.target.value) || 0 })}
            placeholder="Auto-calculated"
            className="h-12 rounded-xl bg-slate-50"
            min="0"
            disabled={!canEdit}
          />
          <p className="text-xs text-slate-500">Auto: Distance × 1.1 (10% slack)</p>
        </div>
      </div>

      {/* Hardware Counts */}
      <div className="border-t border-slate-100 pt-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">Hardware Counts</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="deadEnds">Dead-ends</Label>
            <Input
              id="deadEnds"
              type="number"
              value={job.deadEnds || ""}
              onChange={(e) => updateJob({ deadEnds: Number(e.target.value) || 0 })}
              placeholder="0"
              className="h-12 rounded-xl"
              min="0"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tangents">Tangents</Label>
            <Input
              id="tangents"
              type="number"
              value={job.tangents || ""}
              onChange={(e) => updateJob({ tangents: Number(e.target.value) || 0 })}
              placeholder="0"
              className="h-12 rounded-xl"
              min="0"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="anchors">Anchors</Label>
            <Input
              id="anchors"
              type="number"
              value={job.anchors || ""}
              onChange={(e) => updateJob({ anchors: Number(e.target.value) || 0 })}
              placeholder="0"
              className="h-12 rounded-xl"
              min="0"
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Material estimates help with planning and procurement. Actual usage will be tracked
        during the Construction phase.
      </p>
    </div>
  );
}
