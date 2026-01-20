"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { JobPlanData } from "../../job-lifecycle-view";

interface RouteStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function RouteStep({ job, updateJob, canEdit }: RouteStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="jobName">Job Name *</Label>
        <Input
          id="jobName"
          type="text"
          value={job.jobName}
          onChange={(e) => updateJob({ jobName: e.target.value })}
          placeholder="Enter job name"
          className="h-12 rounded-xl"
          disabled={!canEdit}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startPoleId">Start Pole ID *</Label>
          <Input
            id="startPoleId"
            type="text"
            value={job.startPoleId}
            onChange={(e) => updateJob({ startPoleId: e.target.value })}
            placeholder="e.g., P-001"
            className="h-12 rounded-xl"
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endPoleId">End Pole ID *</Label>
          <Input
            id="endPoleId"
            type="text"
            value={job.endPoleId}
            onChange={(e) => updateJob({ endPoleId: e.target.value })}
            placeholder="e.g., P-050"
            className="h-12 rounded-xl"
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="totalDistance">Total Distance (ft) *</Label>
        <Input
          id="totalDistance"
          type="number"
          value={job.totalDistance || ""}
          onChange={(e) => updateJob({ totalDistance: Number(e.target.value) || 0 })}
          placeholder="Enter total distance in feet"
          className="h-12 rounded-xl"
          min="0"
          disabled={!canEdit}
        />
        <p className="text-xs text-slate-500">
          This will auto-populate the strand footage and calculate fiber footage in Materials.
        </p>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <p className="text-sm text-slate-500">
          <span className="text-red-500">*</span> Required fields. Job Name and Route Details
          are required before the job can be saved.
        </p>
      </div>
    </div>
  );
}
