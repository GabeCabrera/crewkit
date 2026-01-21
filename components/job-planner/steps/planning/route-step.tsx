"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Hash, Building, Ruler, Milestone } from "lucide-react";
import type { JobPlanData } from "../../job-lifecycle-view";

interface RouteStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function RouteStep({ job, updateJob, canEdit }: RouteStepProps) {
  const hasVetroLink = job.vetroProjectUrl && job.vetroProjectUrl.trim() !== "";

  return (
    <div className="space-y-6">
      {/* Job Identification */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
              <Building className="h-4 w-4 text-slate-500" />
            </div>
            <span className="font-semibold text-slate-700">Job Identification</span>
          </div>
        </div>

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
              <Label htmlFor="jobNumber" className="text-sm font-medium flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-slate-400" />
                Job Number
              </Label>
              <Input
                id="jobNumber"
                type="text"
                value={job.jobNumber || ""}
                onChange={(e) => updateJob({ jobNumber: e.target.value })}
                placeholder="e.g., JOB-2024-001"
                className="h-11 rounded-lg"
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationName" className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                Location / Area
              </Label>
              <Input
                id="locationName"
                type="text"
                value={job.locationName || ""}
                onChange={(e) => updateJob({ locationName: e.target.value })}
                placeholder="e.g., Oak Hills Phase 2"
                className="h-11 rounded-lg"
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vetro FiberMap Link */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white border border-violet-200 flex items-center justify-center">
              <ExternalLink className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <span className="font-semibold text-slate-700">Vetro FiberMap</span>
              <p className="text-xs text-slate-500">Link to your route design in Vetro</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 bg-white">
          <div className="space-y-2">
            <Label htmlFor="vetroProjectUrl" className="text-sm font-medium">
              Vetro Project URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="vetroProjectUrl"
                type="url"
                value={job.vetroProjectUrl || ""}
                onChange={(e) => updateJob({ vetroProjectUrl: e.target.value })}
                placeholder="https://fibermap.vetro.io/..."
                className="h-11 rounded-lg flex-1"
                disabled={!canEdit}
              />
              {hasVetroLink && (
                <Button
                  variant="outline"
                  size="default"
                  className="h-11 px-4 gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
                  onClick={() => window.open(job.vetroProjectUrl!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Vetro
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Paste the URL from Vetro FiberMap for quick access to the route design
            </p>
          </div>
        </div>
      </div>

      {/* Route Metrics */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
              <Ruler className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <span className="font-semibold text-slate-700">Route Metrics</span>
              <p className="text-xs text-slate-500">Summary data from Vetro design</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalDistance" className="text-sm font-medium flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5 text-slate-400" />
                Total Footage *
              </Label>
              <Input
                id="totalDistance"
                type="number"
                value={job.totalDistance || ""}
                onChange={(e) =>
                  updateJob({ totalDistance: Number(e.target.value) || 0 })
                }
                placeholder="Enter total footage"
                className="h-11 rounded-lg"
                min="0"
                disabled={!canEdit}
              />
              <p className="text-xs text-slate-500">
                Total route length in feet from Vetro
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="poleCount" className="text-sm font-medium flex items-center gap-1.5">
                <Milestone className="h-3.5 w-3.5 text-slate-400" />
                Pole Count
              </Label>
              <Input
                id="poleCount"
                type="number"
                value={job.poleCount || ""}
                onChange={(e) =>
                  updateJob({ poleCount: Number(e.target.value) || 0 })
                }
                placeholder="Number of poles"
                className="h-11 rounded-lg"
                min="0"
                disabled={!canEdit}
              />
              <p className="text-xs text-slate-500">
                Number of poles in this job
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              <span className="text-red-500">*</span> Required fields. Total footage will auto-populate strand footage in Materials.
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">
          Using Vetro FiberMap
        </h4>
        <p className="text-sm text-blue-700">
          Your crew can access the full route design, measurements, and pole details directly in Vetro FiberMap on their devices. 
          Paste the project link above for quick access.
        </p>
      </div>
    </div>
  );
}
