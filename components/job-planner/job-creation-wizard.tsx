"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ClipboardCheck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JobCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (jobId: string) => void;
  basePath?: string;
}

interface WizardData {
  // Step 1 - Permits
  rmpPermitApproved: boolean;
  sesdPermitApproved: boolean;
  makeReadyComplete: boolean;
  easementsClear: boolean;
  // Step 2 - Route
  jobName: string;
  startPoleId: string;
  endPoleId: string;
  totalDistance: number;
}

const initialData: WizardData = {
  rmpPermitApproved: false,
  sesdPermitApproved: false,
  makeReadyComplete: false,
  easementsClear: false,
  jobName: "",
  startPoleId: "",
  endPoleId: "",
  totalDistance: 0,
};

const permitChecks = [
  { id: "rmpPermitApproved", label: "RMP Permit Approved" },
  { id: "sesdPermitApproved", label: "SESD Permit Approved" },
  { id: "makeReadyComplete", label: "Make-Ready Complete" },
  { id: "easementsClear", label: "Easements Clear" },
] as const;

export function JobCreationWizard({
  open,
  onOpenChange,
  onSuccess,
  basePath = "/admin/jobs",
}: JobCreationWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const allPermitsChecked =
    data.rmpPermitApproved &&
    data.sesdPermitApproved &&
    data.makeReadyComplete &&
    data.easementsClear;

  const routeComplete =
    data.jobName.trim() !== "" &&
    data.startPoleId.trim() !== "" &&
    data.endPoleId.trim() !== "" &&
    data.totalDistance > 0;

  const canProceedToStep2 = allPermitsChecked;
  const canSubmit = allPermitsChecked && routeComplete;

  // Handlers
  const handlePermitChange = (id: keyof WizardData, checked: boolean) => {
    setData((prev) => ({ ...prev, [id]: checked }));
  };

  const handleRouteChange = (field: keyof WizardData, value: string | number) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (canProceedToStep2) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleClose = () => {
    // Reset state when closing
    setStep(1);
    setData(initialData);
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/job-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Permits
          rmpPermitApproved: data.rmpPermitApproved,
          sesdPermitApproved: data.sesdPermitApproved,
          makeReadyComplete: data.makeReadyComplete,
          easementsClear: data.easementsClear,
          // Route
          jobName: data.jobName.trim(),
          startPoleId: data.startPoleId.trim(),
          endPoleId: data.endPoleId.trim(),
          totalDistance: data.totalDistance,
          // Auto-calculate materials from distance
          strandFootage: data.totalDistance,
          fiberFootage: Math.round(data.totalDistance * 1.1),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create job");
      }

      const job = await response.json();

      // Reset wizard state
      setStep(1);
      setData(initialData);
      onOpenChange(false);

      // Callback or navigate
      if (onSuccess) {
        onSuccess(job.id);
      } else {
        router.push(`${basePath}/${job.id}`);
      }
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
            {step === 1 ? (
              <>
                <ClipboardCheck className="h-5 w-5 text-orange-500" />
                Red Light Check
              </>
            ) : (
              <>
                <MapPin className="h-5 w-5 text-orange-500" />
                Route Details
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Verify all permits and prerequisites before creating the job."
              : "Enter the job route information."}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
              step === 1
                ? "bg-orange-500 text-white"
                : allPermitsChecked
                ? "bg-emerald-500 text-white"
                : "bg-slate-200 text-slate-600"
            )}
          >
            {allPermitsChecked && step === 2 ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              "1"
            )}
          </div>
          <div className="w-12 h-0.5 bg-slate-200">
            <div
              className={cn(
                "h-full bg-orange-500 transition-all",
                step === 2 ? "w-full" : "w-0"
              )}
            />
          </div>
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
              step === 2
                ? "bg-orange-500 text-white"
                : "bg-slate-200 text-slate-600"
            )}
          >
            2
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: Permits */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Status Banner */}
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all duration-300",
                allPermitsChecked
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-amber-600 bg-amber-50"
              )}
            >
              {allPermitsChecked ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="font-medium">
                {allPermitsChecked
                  ? "All permits verified. Ready to proceed."
                  : "All items must be checked to continue."}
              </span>
            </div>

            {/* Permit Checkboxes */}
            <div className="space-y-2">
              {permitChecks.map((check) => (
                <label
                  key={check.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <Checkbox
                    checked={data[check.id]}
                    onCheckedChange={(checked) =>
                      handlePermitChange(check.id, checked === true)
                    }
                  />
                  <span className="font-medium text-slate-700 flex-1">
                    {check.label}
                  </span>
                  <CheckCircle2
                    className={cn(
                      "h-5 w-5 transition-all duration-200",
                      data[check.id]
                        ? "text-emerald-500 opacity-100"
                        : "text-transparent opacity-0"
                    )}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Route Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobName">Job Name *</Label>
              <Input
                id="jobName"
                type="text"
                value={data.jobName}
                onChange={(e) => handleRouteChange("jobName", e.target.value)}
                placeholder="Enter job name"
                className="h-12"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startPoleId">Start Pole ID *</Label>
                <Input
                  id="startPoleId"
                  type="text"
                  value={data.startPoleId}
                  onChange={(e) => handleRouteChange("startPoleId", e.target.value)}
                  placeholder="e.g., P-001"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endPoleId">End Pole ID *</Label>
                <Input
                  id="endPoleId"
                  type="text"
                  value={data.endPoleId}
                  onChange={(e) => handleRouteChange("endPoleId", e.target.value)}
                  placeholder="e.g., P-050"
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalDistance">Total Distance (ft) *</Label>
              <Input
                id="totalDistance"
                type="number"
                value={data.totalDistance || ""}
                onChange={(e) =>
                  handleRouteChange("totalDistance", Number(e.target.value) || 0)
                }
                placeholder="Enter total distance in feet"
                className="h-12"
                min="0"
              />
              <p className="text-xs text-slate-500">
                Materials will be auto-calculated based on distance.
              </p>
            </div>

            {/* Validation Status */}
            {!routeComplete && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Please fill in all required fields.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedToStep2}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
