"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Hash, FileText, Ruler, Milestone, Pencil, Check, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";

interface RouteStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
  onNavigate?: (stepId: string) => void;
}

export function RouteStep({ job, updateJob, canEdit, onNavigate }: RouteStepProps) {
  const hasVetroLink = job.vetroProjectUrl && job.vetroProjectUrl.trim() !== "";
  
  // Click-to-edit state for job name
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(job.jobName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSave = () => {
    if (editedName.trim()) {
      updateJob({ jobName: editedName.trim() });
    } else {
      setEditedName(job.jobName); // Revert if empty
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setEditedName(job.jobName);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === "Escape") {
      handleNameCancel();
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* IDENTITY HEADER - Anchored at top */}
      {/* ============================================ */}
      <div className="space-y-4">
        {/* Job Name - Click to Edit Title */}
        <div className="pb-4 border-b border-slate-200">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                ref={nameInputRef}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={handleNameSave}
                className="text-2xl font-bold h-12 px-3"
                placeholder="Enter job name..."
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNameSave}
                className="h-10 w-10 shrink-0"
              >
                <Check className="h-5 w-5 text-emerald-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNameCancel}
                className="h-10 w-10 shrink-0"
              >
                <X className="h-5 w-5 text-slate-400" />
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "group flex items-center gap-3",
                canEdit && "cursor-pointer"
              )}
              onClick={() => canEdit && setIsEditingName(true)}
            >
              <h1 className="text-2xl font-bold text-slate-900">
                {job.jobName || "Untitled Job"}
              </h1>
              {canEdit && (
                <Pencil className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          )}
          <p className="text-sm text-slate-500 mt-1">
            This is the primary identifier for this job
          </p>
        </div>

        {/* Job Number & Location - Side by Side */}
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

      {/* ============================================ */}
      {/* DESIGN SOURCE - Where the data comes from */}
      {/* ============================================ */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white border border-violet-200 flex items-center justify-center">
              <FileText className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <span className="font-semibold text-slate-700">Design Source</span>
              <p className="text-xs text-slate-500">Reference to the approved route design</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 bg-white">
          <div className="space-y-2">
            <Label htmlFor="vetroProjectUrl" className="text-sm font-medium">
              Link to Vetro Design
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
                  Open
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Paste the direct browser link to the approved route design
            </p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* CONSTRUCTION SCOPE - Commit to numbers */}
      {/* ============================================ */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
              <Ruler className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <span className="font-semibold text-slate-700">Construction Scope</span>
              <p className="text-xs text-slate-500">Define the work to be completed</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalDistance" className="text-sm font-medium flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5 text-slate-400" />
                Total Route Length (ft) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="totalDistance"
                type="number"
                value={job.totalDistance || ""}
                onChange={(e) =>
                  updateJob({ totalDistance: Number(e.target.value) || 0 })
                }
                placeholder="e.g., 12500"
                className="h-11 rounded-lg"
                min="0"
                disabled={!canEdit}
              />
              <p className="text-xs text-slate-500">
                Total aerial/underground footage for this job
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="poleCount" className="text-sm font-medium flex items-center gap-1.5">
                <Milestone className="h-3.5 w-3.5 text-slate-400" />
                Total Pole Attachments
              </Label>
              <Input
                id="poleCount"
                type="number"
                value={job.poleCount || ""}
                onChange={(e) =>
                  updateJob({ poleCount: Number(e.target.value) || 0 })
                }
                placeholder="e.g., 45"
                className="h-11 rounded-lg"
                min="0"
                disabled={!canEdit}
              />
              <p className="text-xs text-slate-500">
                Number of poles requiring attachment work
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Route length will auto-populate strand footage in the Materials step.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* CONTINUE NAVIGATION */}
      {/* ============================================ */}
      {onNavigate && job.jobName && job.totalDistance > 0 && (
        <div className="pt-4 border-t border-slate-200">
          <Button
            onClick={() => onNavigate("permits")}
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white gap-2"
          >
            Continue to Red Light Check
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
