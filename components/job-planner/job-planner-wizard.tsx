"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ClipboardCheck,
  MapPin,
  Package,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Car,
  TreePine,
  Bug,
  Waves,
  Printer,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JobPlannerData {
  // Step 1: Permits
  rmpPermitApproved: boolean;
  sesdPermitApproved: boolean;
  makeReadyComplete: boolean;
  easementsClear: boolean;

  // Step 2: Route
  jobName: string;
  startPoleId: string;
  endPoleId: string;
  totalDistance: number;

  // Step 3: Materials
  strandFootage: number;
  fiberFootage: number;
  deadEnds: number;
  tangents: number;
  anchors: number;

  // Step 4: Hazards
  trafficControl: boolean;
  treeTrimming: boolean;
  animalHazards: boolean;
  waterRailCrossing: boolean;
  foremanNotes: string;
}

const initialData: JobPlannerData = {
  rmpPermitApproved: false,
  sesdPermitApproved: false,
  makeReadyComplete: false,
  easementsClear: false,
  jobName: "",
  startPoleId: "",
  endPoleId: "",
  totalDistance: 0,
  strandFootage: 0,
  fiberFootage: 0,
  deadEnds: 0,
  tangents: 0,
  anchors: 0,
  trafficControl: false,
  treeTrimming: false,
  animalHazards: false,
  waterRailCrossing: false,
  foremanNotes: "",
};

const steps = [
  { id: 1, name: "Red Light Check", icon: ClipboardCheck },
  { id: 2, name: "Route Details", icon: MapPin },
  { id: 3, name: "Materials", icon: Package },
  { id: 4, name: "Hazards", icon: AlertTriangle },
];

interface JobPlannerWizardProps {
  onComplete?: (jobId: string) => void;
  redirectPath?: string;
}

export function JobPlannerWizard({ onComplete, redirectPath = "/manager/jobs" }: JobPlannerWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<JobPlannerData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate fiber footage when total distance changes
  useEffect(() => {
    if (data.totalDistance > 0) {
      setData((prev) => ({
        ...prev,
        strandFootage: prev.strandFootage || prev.totalDistance,
        fiberFootage: Math.round(prev.totalDistance * 1.1),
      }));
    }
  }, [data.totalDistance]);

  const allPermitsChecked =
    data.rmpPermitApproved &&
    data.sesdPermitApproved &&
    data.makeReadyComplete &&
    data.easementsClear;

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return allPermitsChecked;
      case 2:
        return (
          data.jobName.trim() !== "" &&
          data.startPoleId.trim() !== "" &&
          data.endPoleId.trim() !== "" &&
          data.totalDistance > 0
        );
      case 3:
        return data.strandFootage > 0 && data.fiberFootage > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/job-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          status: "READY", // Jobs created through wizard start as Ready
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create job plan");
      }

      const jobPlan = await response.json();
      
      if (onComplete) {
        onComplete(jobPlan.id);
      } else {
        router.push(`${redirectPath}?job=${jobPlan.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job plan");
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateData = (updates: Partial<JobPlannerData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 no-print">
        <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Job Planner</h1>
              <p className="text-slate-500 text-sm sm:text-base">Create a job packet</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-2xl mx-auto space-y-6">
        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 no-print">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-600">
              Step {currentStep} of 4
            </span>
            <span className="text-sm text-slate-500">{steps[currentStep - 1].name}</span>
          </div>
          <div className="flex gap-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "h-2 flex-1 rounded-full transition-colors",
                  step.id <= currentStep ? "bg-orange-500" : "bg-slate-200"
                )}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
          {currentStep === 1 && (
            <Step1RedLightCheck
              data={data}
              updateData={updateData}
              allChecked={allPermitsChecked}
            />
          )}
          {currentStep === 2 && <Step2RouteDetails data={data} updateData={updateData} />}
          {currentStep === 3 && <Step3Materials data={data} updateData={updateData} />}
          {currentStep === 4 && <Step4Hazards data={data} updateData={updateData} />}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 no-print">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className="flex-1 h-12 rounded-xl"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceedFromStep(currentStep) || isSubmitting}
            className="flex-1 h-12 rounded-xl bg-orange-500 hover:bg-orange-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : currentStep === 4 ? (
              <>
                Create Job
                <CheckCircle2 className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Step 1: Red Light Check
function Step1RedLightCheck({
  data,
  updateData,
  allChecked,
}: {
  data: JobPlannerData;
  updateData: (updates: Partial<JobPlannerData>) => void;
  allChecked: boolean;
}) {
  const checks = [
    { id: "rmpPermitApproved", label: "RMP Permit Approved", checked: data.rmpPermitApproved },
    { id: "sesdPermitApproved", label: "SESD Permit Approved", checked: data.sesdPermitApproved },
    { id: "makeReadyComplete", label: "Make-Ready Complete", checked: data.makeReadyComplete },
    { id: "easementsClear", label: "Easements Clear", checked: data.easementsClear },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
          <ClipboardCheck className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Red Light Check</h2>
          <p className="text-sm text-slate-500">Verify all requirements before proceeding</p>
        </div>
      </div>

      {!allChecked && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">STOP: Job not ready. All items must be checked.</span>
        </div>
      )}

      <div className="space-y-4">
        {checks.map((check) => (
          <label
            key={check.id}
            className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <Checkbox
              checked={check.checked}
              onCheckedChange={(checked) =>
                updateData({ [check.id]: checked === true })
              }
            />
            <span className="font-medium text-slate-700">{check.label}</span>
            {check.checked && (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto" />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

// Step 2: Route Details
function Step2RouteDetails({
  data,
  updateData,
}: {
  data: JobPlannerData;
  updateData: (updates: Partial<JobPlannerData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <MapPin className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Route Details</h2>
          <p className="text-sm text-slate-500">Enter the job route information</p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="jobName">Job Name</Label>
          <Input
            id="jobName"
            type="text"
            value={data.jobName}
            onChange={(e) => updateData({ jobName: e.target.value })}
            placeholder="Enter job name"
            className="h-12 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startPoleId">Start Pole ID</Label>
            <Input
              id="startPoleId"
              type="text"
              value={data.startPoleId}
              onChange={(e) => updateData({ startPoleId: e.target.value })}
              placeholder="e.g., P-001"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endPoleId">End Pole ID</Label>
            <Input
              id="endPoleId"
              type="text"
              value={data.endPoleId}
              onChange={(e) => updateData({ endPoleId: e.target.value })}
              placeholder="e.g., P-050"
              className="h-12 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalDistance">Total Distance (ft)</Label>
          <Input
            id="totalDistance"
            type="number"
            value={data.totalDistance || ""}
            onChange={(e) => updateData({ totalDistance: Number(e.target.value) || 0 })}
            placeholder="Enter total distance in feet"
            className="h-12 rounded-xl"
            min="0"
          />
        </div>
      </div>
    </div>
  );
}

// Step 3: Materials
function Step3Materials({
  data,
  updateData,
}: {
  data: JobPlannerData;
  updateData: (updates: Partial<JobPlannerData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Package className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Materials</h2>
          <p className="text-sm text-slate-500">Calculate required materials</p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="strandFootage">Strand Footage</Label>
            <Input
              id="strandFootage"
              type="number"
              value={data.strandFootage || ""}
              onChange={(e) => updateData({ strandFootage: Number(e.target.value) || 0 })}
              placeholder="Defaults to total distance"
              className="h-12 rounded-xl"
              min="0"
            />
            <p className="text-xs text-slate-400">Defaults to total distance</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiberFootage">Fiber Footage</Label>
            <Input
              id="fiberFootage"
              type="number"
              value={data.fiberFootage || ""}
              onChange={(e) => updateData({ fiberFootage: Number(e.target.value) || 0 })}
              placeholder="Auto-calculated"
              className="h-12 rounded-xl bg-slate-50"
              min="0"
            />
            <p className="text-xs text-slate-400">Auto: Distance × 1.1 (10% slack)</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <p className="text-sm font-medium text-slate-700 mb-4">Hardware Counts</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadEnds">Dead-ends</Label>
              <Input
                id="deadEnds"
                type="number"
                value={data.deadEnds || ""}
                onChange={(e) => updateData({ deadEnds: Number(e.target.value) || 0 })}
                placeholder="0"
                className="h-12 rounded-xl"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tangents">Tangents</Label>
              <Input
                id="tangents"
                type="number"
                value={data.tangents || ""}
                onChange={(e) => updateData({ tangents: Number(e.target.value) || 0 })}
                placeholder="0"
                className="h-12 rounded-xl"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anchors">Anchors</Label>
              <Input
                id="anchors"
                type="number"
                value={data.anchors || ""}
                onChange={(e) => updateData({ anchors: Number(e.target.value) || 0 })}
                placeholder="0"
                className="h-12 rounded-xl"
                min="0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 4: Hazards
function Step4Hazards({
  data,
  updateData,
}: {
  data: JobPlannerData;
  updateData: (updates: Partial<JobPlannerData>) => void;
}) {
  const hazards = [
    { id: "trafficControl", label: "Traffic Control Required", icon: Car, checked: data.trafficControl },
    { id: "treeTrimming", label: "Tree Trimming Required", icon: TreePine, checked: data.treeTrimming },
    { id: "animalHazards", label: "Animal Hazards", icon: Bug, checked: data.animalHazards },
    { id: "waterRailCrossing", label: "Water/Rail Crossing", icon: Waves, checked: data.waterRailCrossing },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Hazards</h2>
          <p className="text-sm text-slate-500">Identify potential hazards and notes</p>
        </div>
      </div>

      <div className="space-y-3">
        {hazards.map((hazard) => (
          <label
            key={hazard.id}
            className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <Checkbox
              checked={hazard.checked}
              onCheckedChange={(checked) =>
                updateData({ [hazard.id]: checked === true })
              }
            />
            <hazard.icon className="h-5 w-5 text-slate-500" />
            <span className="font-medium text-slate-700">{hazard.label}</span>
          </label>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <Label htmlFor="foremanNotes">Foreman Notes</Label>
        <Textarea
          id="foremanNotes"
          value={data.foremanNotes}
          onChange={(e) => updateData({ foremanNotes: e.target.value })}
          placeholder="Enter any additional notes or special instructions..."
          className="min-h-[120px] rounded-xl"
        />
      </div>
    </div>
  );
}

// Job Card Summary
function JobCardSummary({
  data,
  onBack,
  onReset,
  onPrint,
}: {
  data: JobPlannerData;
  onBack: () => void;
  onReset: () => void;
  onPrint: () => void;
}) {
  const activeHazards = [
    data.trafficControl && "Traffic Control",
    data.treeTrimming && "Tree Trimming",
    data.animalHazards && "Animal Hazards",
    data.waterRailCrossing && "Water/Rail Crossing",
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white -m-4 sm:-m-6 lg:-m-8">
      {/* Header - hidden on print */}
      <div className="bg-white border-b border-slate-100 no-print">
        <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Job Packet Ready</h1>
              <p className="text-slate-500 text-sm sm:text-base">Review and print your job packet</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-2xl mx-auto space-y-6">
        {/* Job Card - the printable ticket */}
        <div className="job-card bg-white rounded-2xl shadow-sm border-2 border-slate-200 overflow-hidden">
          {/* Ticket Header */}
          <div className="bg-slate-900 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">Job Packet</p>
                <h2 className="text-xl font-bold">{data.jobName}</h2>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs">Generated</p>
                <p className="font-medium">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6 space-y-6">
            {/* Route Section */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-semibold">
                Route Information
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Start Pole</p>
                  <p className="font-semibold text-slate-900">{data.startPoleId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">End Pole</p>
                  <p className="font-semibold text-slate-900">{data.endPoleId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total Distance</p>
                  <p className="font-semibold text-slate-900">{data.totalDistance.toLocaleString()} ft</p>
                </div>
              </div>
            </div>

            {/* Materials Section */}
            <div className="border-t border-dashed border-slate-200 pt-6">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-semibold">
                Materials Required
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Strand</p>
                  <p className="font-semibold text-slate-900">{data.strandFootage.toLocaleString()} ft</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Fiber (w/ slack)</p>
                  <p className="font-semibold text-slate-900">{data.fiberFootage.toLocaleString()} ft</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center bg-slate-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-slate-900">{data.deadEnds}</p>
                  <p className="text-xs text-slate-500">Dead-ends</p>
                </div>
                <div className="text-center bg-slate-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-slate-900">{data.tangents}</p>
                  <p className="text-xs text-slate-500">Tangents</p>
                </div>
                <div className="text-center bg-slate-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-slate-900">{data.anchors}</p>
                  <p className="text-xs text-slate-500">Anchors</p>
                </div>
              </div>
            </div>

            {/* Hazards Section */}
            {activeHazards.length > 0 && (
              <div className="border-t border-dashed border-slate-200 pt-6">
                <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-semibold">
                  Hazards & Requirements
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activeHazards.map((hazard) => (
                    <span
                      key={hazard as string}
                      className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium"
                    >
                      {hazard}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            {data.foremanNotes && (
              <div className="border-t border-dashed border-slate-200 pt-6">
                <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-semibold">
                  Foreman Notes
                </h3>
                <p className="text-slate-700 whitespace-pre-wrap">{data.foremanNotes}</p>
              </div>
            )}

            {/* Permits Checklist */}
            <div className="border-t border-dashed border-slate-200 pt-6">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-semibold">
                Permits Verified
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>RMP Permit</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>SESD Permit</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Make-Ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Easements</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Footer */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
            <p className="text-xs text-slate-400 text-center">
              CrewKit Job Packet • {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons - hidden on print */}
        <div className="flex gap-3 no-print">
          <Button variant="outline" onClick={onBack} className="h-12 rounded-xl">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            onClick={onPrint}
            className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print / Save PDF
          </Button>
          <Button variant="outline" onClick={onReset} className="h-12 rounded-xl">
            <RotateCcw className="h-4 w-4 mr-2" />
            New Job
          </Button>
        </div>
      </div>
    </div>
  );
}
