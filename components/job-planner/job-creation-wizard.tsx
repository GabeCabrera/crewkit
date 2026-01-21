"use client";

import { useState, useEffect } from "react";
import { Loader2, Briefcase, MapPin, FileText, ExternalLink, Hash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectArea {
  id: string;
  name: string;
  prefix: string;
  nextSeq: number;
}

interface JobCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (jobId: string) => void;
  basePath: string;
}

/**
 * Generate a preview of the job name
 * Format: {PREFIX}-{MMYY}-{SEQ}
 */
function generateJobNamePreview(prefix: string, nextSeq: number): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const seq = String(nextSeq).padStart(3, '0');
  return `${prefix}-${month}${year}-${seq}`;
}

export function JobCreationWizard({
  open,
  onOpenChange,
  onSuccess,
}: JobCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Project Areas
  const [projectAreas, setProjectAreas] = useState<ProjectArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");

  // Form state
  const [locationName, setLocationName] = useState("");
  const [vetroProjectUrl, setVetroProjectUrl] = useState("");
  const [totalDistance, setTotalDistance] = useState("");
  const [poleCount, setPoleCount] = useState("");

  // Fetch project areas when dialog opens
  useEffect(() => {
    if (open) {
      setAreasLoading(true);
      fetch("/api/project-areas")
        .then((res) => res.json())
        .then((data) => {
          setProjectAreas(data);
          // Auto-select first area if only one exists
          if (data.length === 1) {
            setSelectedAreaId(data[0].id);
          }
        })
        .catch(console.error)
        .finally(() => setAreasLoading(false));
    }
  }, [open]);

  // Get selected area details
  const selectedArea = projectAreas.find((a) => a.id === selectedAreaId);
  const jobNamePreview = selectedArea
    ? generateJobNamePreview(selectedArea.prefix, selectedArea.nextSeq)
    : null;

  const resetForm = () => {
    setStep(1);
    setSelectedAreaId("");
    setLocationName("");
    setVetroProjectUrl("");
    setTotalDistance("");
    setPoleCount("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!selectedAreaId) {
      setError("Please select a project area");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/job-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectAreaId: selectedAreaId,
          locationName: locationName.trim() || null,
          vetroProjectUrl: vetroProjectUrl.trim() || null,
          totalDistance: totalDistance ? parseFloat(totalDistance) : 0,
          poleCount: poleCount ? parseInt(poleCount) : 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create job");
      }

      const job = await response.json();
      resetForm();
      onOpenChange(false);
      onSuccess(job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            Create New Job
          </DialogTitle>
          <DialogDescription>
            Set up a new job plan with basic details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2">
            <div
              className={`h-2 w-8 rounded-full transition-colors ${
                step >= 1 ? "bg-orange-500" : "bg-slate-200"
              }`}
            />
            <div
              className={`h-2 w-8 rounded-full transition-colors ${
                step >= 2 ? "bg-orange-500" : "bg-slate-200"
              }`}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Project Area Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-4">
                <FileText className="h-4 w-4" />
                Job Identification
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectArea">Project Area *</Label>
                {areasLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading areas...
                  </div>
                ) : projectAreas.length === 0 ? (
                  <div className="bg-amber-50 text-amber-700 text-sm p-3 rounded-lg">
                    No project areas defined. Please ask an admin to create project areas in Settings.
                  </div>
                ) : (
                  <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a project area..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projectAreas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-600">[{area.prefix}]</span>
                            <span>{area.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Job Name Preview */}
              {jobNamePreview && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-1">Job will be named:</p>
                  <p className="font-mono text-lg font-bold text-slate-900">{jobNamePreview}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="locationName" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  Location / Subdivision (Optional)
                </Label>
                <Input
                  id="locationName"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g., Oak Hills Phase 2"
                />
                <p className="text-xs text-slate-500">
                  Specific location within the project area
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Route Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-4">
                <MapPin className="h-4 w-4" />
                Route Details (Optional)
              </div>

              {/* Show selected area info */}
              {selectedArea && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-600 mb-1">Creating job:</p>
                  <p className="font-mono font-bold text-blue-900">{jobNamePreview}</p>
                  {locationName && (
                    <p className="text-sm text-blue-700 mt-1">{locationName}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="vetroProjectUrl" className="flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  Vetro Project URL
                </Label>
                <Input
                  id="vetroProjectUrl"
                  type="url"
                  value={vetroProjectUrl}
                  onChange={(e) => setVetroProjectUrl(e.target.value)}
                  placeholder="https://fibermap.vetro.io/..."
                />
                <p className="text-xs text-slate-500">
                  Link to the route in Vetro FiberMap
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalDistance">Total Footage</Label>
                  <Input
                    id="totalDistance"
                    type="number"
                    value={totalDistance}
                    onChange={(e) => setTotalDistance(e.target.value)}
                    placeholder="e.g., 5000"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poleCount">Pole Count</Label>
                  <Input
                    id="poleCount"
                    type="number"
                    value={poleCount}
                    onChange={(e) => setPoleCount(e.target.value)}
                    placeholder="e.g., 25"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
            >
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
          )}

          {step < 2 ? (
            <Button
              onClick={() => {
                if (!selectedAreaId) {
                  setError("Please select a project area");
                  return;
                }
                setError(null);
                setStep(2);
              }}
              disabled={projectAreas.length === 0}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Job"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
