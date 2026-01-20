"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JobCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (jobId: string) => void;
  basePath?: string;
}

interface PermitType {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
}

interface SelectedPermit {
  permitTypeId: string;
  permitTypeName: string;
  isApproved: boolean;
}

interface RouteData {
  jobName: string;
  startPoleId: string;
  endPoleId: string;
  totalDistance: number;
}

const initialRouteData: RouteData = {
  jobName: "",
  startPoleId: "",
  endPoleId: "",
  totalDistance: 0,
};

export function JobCreationWizard({
  open,
  onOpenChange,
  onSuccess,
  basePath = "/admin/jobs",
}: JobCreationWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [routeData, setRouteData] = useState<RouteData>(initialRouteData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permits state
  const [permitTypes, setPermitTypes] = useState<PermitType[]>([]);
  const [selectedPermits, setSelectedPermits] = useState<SelectedPermit[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [customTypeName, setCustomTypeName] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);

  // Fetch permit types when dialog opens
  useEffect(() => {
    if (open) {
      fetchPermitTypes();
    }
  }, [open]);

  const fetchPermitTypes = async () => {
    setIsLoadingTypes(true);
    try {
      const response = await fetch("/api/permit-types");
      if (response.ok) {
        const data = await response.json();
        setPermitTypes(data);
        
        // Auto-add default permit types
        const defaults = data.filter((t: PermitType) => t.isDefault);
        setSelectedPermits(
          defaults.map((t: PermitType) => ({
            permitTypeId: t.id,
            permitTypeName: t.name,
            isApproved: false,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching permit types:", error);
    } finally {
      setIsLoadingTypes(false);
    }
  };

  // Validation
  const allPermitsApproved = selectedPermits.length > 0 && selectedPermits.every((p) => p.isApproved);
  const hasAtLeastOnePermit = selectedPermits.length > 0;

  const routeComplete =
    routeData.jobName.trim() !== "" &&
    routeData.startPoleId.trim() !== "" &&
    routeData.endPoleId.trim() !== "" &&
    routeData.totalDistance > 0;

  const canProceedToStep2 = hasAtLeastOnePermit && allPermitsApproved;
  const canSubmit = canProceedToStep2 && routeComplete;

  // Get available permit types (not already selected)
  const availableTypes = permitTypes.filter(
    (type) => !selectedPermits.some((p) => p.permitTypeId === type.id)
  );

  // Handlers
  const handleAddPermit = () => {
    if (!selectedTypeId) return;

    const type = permitTypes.find((t) => t.id === selectedTypeId);
    if (type) {
      setSelectedPermits((prev) => [
        ...prev,
        { permitTypeId: type.id, permitTypeName: type.name, isApproved: false },
      ]);
      setSelectedTypeId("");
    }
  };

  const handleCreateCustomType = async () => {
    if (!customTypeName.trim()) return;

    try {
      const response = await fetch("/api/permit-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customTypeName.trim() }),
      });

      if (response.ok) {
        const newType = await response.json();
        setPermitTypes((prev) => [...prev, newType]);
        setSelectedPermits((prev) => [
          ...prev,
          { permitTypeId: newType.id, permitTypeName: newType.name, isApproved: false },
        ]);
        setCustomTypeName("");
        setIsAddingCustom(false);
      }
    } catch (error) {
      console.error("Error creating custom permit type:", error);
    }
  };

  const handleRemovePermit = (permitTypeId: string) => {
    setSelectedPermits((prev) => prev.filter((p) => p.permitTypeId !== permitTypeId));
  };

  const handleToggleApproval = (permitTypeId: string) => {
    setSelectedPermits((prev) =>
      prev.map((p) =>
        p.permitTypeId === permitTypeId ? { ...p, isApproved: !p.isApproved } : p
      )
    );
  };

  const handleRouteChange = (field: keyof RouteData, value: string | number) => {
    setRouteData((prev) => ({ ...prev, [field]: value }));
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
    setRouteData(initialRouteData);
    setSelectedPermits([]);
    setSelectedTypeId("");
    setCustomTypeName("");
    setIsAddingCustom(false);
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Create the job
      const jobResponse = await fetch("/api/job-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobName: routeData.jobName.trim(),
          startPoleId: routeData.startPoleId.trim(),
          endPoleId: routeData.endPoleId.trim(),
          totalDistance: routeData.totalDistance,
          strandFootage: routeData.totalDistance,
          fiberFootage: Math.round(routeData.totalDistance * 1.1),
        }),
      });

      if (!jobResponse.ok) {
        const errorData = await jobResponse.json();
        throw new Error(errorData.error || "Failed to create job");
      }

      const job = await jobResponse.json();

      // Step 2: Add permits to the job
      for (const permit of selectedPermits) {
        // Add permit
        const addResponse = await fetch(`/api/job-plans/${job.id}/permits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permitTypeId: permit.permitTypeId }),
        });

        if (addResponse.ok) {
          const addedPermit = await addResponse.json();
          
          // Update approval status if approved
          if (permit.isApproved) {
            await fetch(`/api/job-plans/${job.id}/permits?permitId=${addedPermit.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isApproved: true }),
            });
          }
        }
      }

      // Reset wizard state
      handleClose();

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
              ? "Add and verify all required permits before creating the job."
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
                : allPermitsApproved
                ? "bg-emerald-500 text-white"
                : "bg-slate-200 text-slate-600"
            )}
          >
            {allPermitsApproved && step === 2 ? (
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
                !hasAtLeastOnePermit
                  ? "text-amber-600 bg-amber-50"
                  : allPermitsApproved
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-red-600 bg-red-50"
              )}
            >
              {allPermitsApproved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="font-medium">
                {!hasAtLeastOnePermit
                  ? "Add at least one permit to continue."
                  : allPermitsApproved
                  ? "All permits verified. Ready to proceed."
                  : `${selectedPermits.filter((p) => p.isApproved).length} of ${selectedPermits.length} permits approved.`}
              </span>
            </div>

            {/* Add Permit Section */}
            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              <label className="text-xs font-medium text-slate-500">Add Permit</label>
              {!isAddingCustom ? (
                <div className="flex gap-2">
                  <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                    <SelectTrigger className="flex-1 bg-white h-10">
                      <SelectValue placeholder="Select permit type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">+ Create Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (selectedTypeId === "__custom__") {
                        setIsAddingCustom(true);
                        setSelectedTypeId("");
                      } else {
                        handleAddPermit();
                      }
                    }}
                    disabled={!selectedTypeId}
                    size="icon"
                    className="bg-orange-500 hover:bg-orange-600 h-10 w-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={customTypeName}
                    onChange={(e) => setCustomTypeName(e.target.value)}
                    placeholder="Custom permit name..."
                    className="flex-1 h-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateCustomType();
                      if (e.key === "Escape") {
                        setIsAddingCustom(false);
                        setCustomTypeName("");
                      }
                    }}
                  />
                  <Button
                    onClick={handleCreateCustomType}
                    disabled={!customTypeName.trim()}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsAddingCustom(false);
                      setCustomTypeName("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Permits List */}
            {isLoadingTypes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selectedPermits.map((permit) => (
                  <div
                    key={permit.permitTypeId}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-colors",
                      permit.isApproved
                        ? "bg-emerald-50 border border-emerald-200"
                        : "bg-slate-50 border border-slate-200"
                    )}
                  >
                    <Checkbox
                      checked={permit.isApproved}
                      onCheckedChange={() => handleToggleApproval(permit.permitTypeId)}
                    />
                    <span className="font-medium text-slate-700 flex-1">
                      {permit.permitTypeName}
                    </span>
                    <CheckCircle2
                      className={cn(
                        "h-5 w-5 transition-all duration-200",
                        permit.isApproved
                          ? "text-emerald-500 opacity-100"
                          : "text-slate-200 opacity-50"
                      )}
                    />
                    <button
                      onClick={() => handleRemovePermit(permit.permitTypeId)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {selectedPermits.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    No permits added yet. Select from the dropdown above.
                  </div>
                )}
              </div>
            )}
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
                value={routeData.jobName}
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
                  value={routeData.startPoleId}
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
                  value={routeData.endPoleId}
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
                value={routeData.totalDistance || ""}
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
