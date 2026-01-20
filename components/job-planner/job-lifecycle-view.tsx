"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { JobPhaseSidebar, steps } from "./job-phase-sidebar";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  Menu,
  X,
  Pencil,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Planning Steps
import { PermitsStep } from "./steps/planning/permits-step";
import { RouteStep } from "./steps/planning/route-step";
import { MaterialsStep } from "./steps/planning/materials-step";
import { HazardsStep } from "./steps/planning/hazards-step";
import { CrewStep } from "./steps/planning/crew-step";
import { SchedulingStep } from "./steps/planning/scheduling-step";

// Construction Steps
import { DailyProgressStep } from "./steps/construction/daily-progress-step";
import { MaterialUsageStep } from "./steps/construction/material-usage-step";
import { CrewHoursStep } from "./steps/construction/crew-hours-step";
import { IssuesStep } from "./steps/construction/issues-step";

// Reporting Steps
import { CompletionSummaryStep } from "./steps/reporting/completion-summary-step";
import { AsBuiltStep } from "./steps/reporting/as-built-step";
import { SignoffStep } from "./steps/reporting/signoff-step";
import { LessonsStep } from "./steps/reporting/lessons-step";
import { HoursSummaryStep } from "./steps/reporting/hours-summary-step";

// Type for permit documents
interface PermitDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

// Type for job permits
interface JobPermit {
  id: string;
  isApproved: boolean;
  notes: string | null;
  permitType: {
    id: string;
    name: string;
    description: string | null;
  };
  documents: PermitDocument[];
}

export interface JobPlanData {
  id: string;
  // Planning - Permits (legacy fields for backwards compatibility)
  rmpPermitApproved: boolean;
  sesdPermitApproved: boolean;
  makeReadyComplete: boolean;
  easementsClear: boolean;
  // Dynamic permits
  permits?: JobPermit[];
  // Planning - Route
  jobName: string;
  startPoleId: string;
  endPoleId: string;
  totalDistance: number;
  // Planning - Materials
  strandFootage: number;
  fiberFootage: number;
  deadEnds: number;
  tangents: number;
  anchors: number;
  // Planning - Hazards
  trafficControl: boolean;
  treeTrimming: boolean;
  animalHazards: boolean;
  waterRailCrossing: boolean;
  foremanNotes: string | null;
  // Planning - Scheduling
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  estimatedDuration: number | null;
  durationUnit: string | null;
  // Construction - Actuals
  actualFootage: number;
  actualPolesComplete: number;
  actualStrandUsed: number;
  actualFiberUsed: number;
  actualDeadEnds: number;
  actualTangents: number;
  actualAnchors: number;
  totalCrewHours: number;
  // Reporting
  foremanSignoff: boolean;
  signoffDate: string | null;
  lessonsLearned: string | null;
  completedAt: string | null;
  // Meta
  status: string;
  createdAt: string;
  updatedAt: string;
  assignments: Array<{
    id: string;
    userId: string;
    user: { id: string; name: string | null; email: string };
  }>;
}

interface JobLifecycleViewProps {
  jobId: string;
  backUrl: string;
}

export function JobLifecycleView({ jobId, backUrl }: JobLifecycleViewProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [job, setJob] = useState<JobPlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [currentStep, setCurrentStep] = useState("permits");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Partial<JobPlanData>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  const canEdit =
    session?.user?.role === "MANAGER" ||
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUPERUSER";

  // Fetch job data
  const fetchJob = useCallback(async () => {
    try {
      const response = await fetch(`/api/job-plans/${jobId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job");
      }
      const data = await response.json();
      setJob(data);
      calculateCompletedSteps(data);
    } catch (error) {
      console.error("Error fetching job:", error);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Cleanup: flush pending saves on unmount
  useEffect(() => {
    return () => {
      // Clear any pending debounce timer
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Flush any pending updates before unmount (fire-and-forget)
      if (Object.keys(pendingUpdatesRef.current).length > 0) {
        fetch(`/api/job-plans/${jobId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingUpdatesRef.current),
          // Use keepalive to ensure request completes even after page unload
          keepalive: true,
        }).catch(() => {
          // Silently fail on unmount - nothing we can do
        });
      }
    };
  }, [jobId]);

  // Calculate which steps are complete
  const calculateCompletedSteps = (jobData: JobPlanData) => {
    const completed = new Set<string>();

    // Permits - all 4 must be checked
    if (
      jobData.rmpPermitApproved &&
      jobData.sesdPermitApproved &&
      jobData.makeReadyComplete &&
      jobData.easementsClear
    ) {
      completed.add("permits");
    }

    // Route - required fields filled
    if (
      jobData.jobName &&
      jobData.startPoleId &&
      jobData.endPoleId &&
      jobData.totalDistance > 0
    ) {
      completed.add("route");
    }

    // Materials - strand and fiber > 0
    if (jobData.strandFootage > 0 && jobData.fiberFootage > 0) {
      completed.add("materials");
    }

    // Hazards - always considered "complete" (all optional)
    completed.add("hazards");

    // Crew - has at least one assignment
    if (jobData.assignments && jobData.assignments.length > 0) {
      completed.add("crew");
    }

    // Scheduling - has start date
    if (jobData.plannedStartDate) {
      completed.add("scheduling");
    }

    // Construction steps - complete if any progress logged
    if (jobData.actualFootage > 0 || jobData.actualPolesComplete > 0) {
      completed.add("daily-progress");
    }
    if (
      jobData.actualStrandUsed > 0 ||
      jobData.actualFiberUsed > 0 ||
      jobData.actualDeadEnds > 0 ||
      jobData.actualTangents > 0 ||
      jobData.actualAnchors > 0
    ) {
      completed.add("material-usage");
    }
    if (jobData.totalCrewHours > 0) {
      completed.add("crew-hours");
    }
    // Issues - considered complete (optional)
    completed.add("issues");

    // Reporting
    if (jobData.actualFootage > 0) {
      completed.add("completion-summary");
      completed.add("as-built");
    }
    if (jobData.foremanSignoff) {
      completed.add("signoff");
    }
    if (jobData.lessonsLearned) {
      completed.add("lessons");
    }
    if (jobData.totalCrewHours > 0) {
      completed.add("hours-summary");
    }

    setCompletedSteps(completed);
  };

  // Auto-save with debounce and batched updates (ClickUp-style)
  const autoSave = useCallback(
    (updates: Partial<JobPlanData>) => {
      if (!job) return;

      // Merge new updates into pending queue (accumulate all changes)
      pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

      // Clear existing timer to reset debounce
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setSaveStatus("saving");

      // Debounce the actual save
      saveTimeoutRef.current = setTimeout(async () => {
        // Abort any in-flight request (superseded by this one)
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Grab all pending updates and clear the queue
        const updatesToSave = { ...pendingUpdatesRef.current };
        pendingUpdatesRef.current = {};

        try {
          const response = await fetch(`/api/job-plans/${jobId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatesToSave),
            signal: abortControllerRef.current.signal,
          });

          if (!response.ok) {
            throw new Error("Failed to save");
          }

          const updatedJob = await response.json();
          setJob(updatedJob);
          calculateCompletedSteps(updatedJob);
          setSaveStatus("saved");

          // Reset to idle after showing "saved"
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (error: unknown) {
          // Ignore aborted requests (they were superseded)
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          console.error("Error saving:", error);
          // Re-queue failed updates for retry (merge with any new pending updates)
          pendingUpdatesRef.current = { ...updatesToSave, ...pendingUpdatesRef.current };
          setSaveStatus("idle");
        }
      }, 500);
    },
    [job, jobId]
  );

  // Update job locally and trigger auto-save
  const updateJob = useCallback(
    (updates: Partial<JobPlanData>) => {
      if (!job) return;
      const newJob = { ...job, ...updates };
      setJob(newJob);
      calculateCompletedSteps(newJob);
      autoSave(updates);
    },
    [job, autoSave]
  );

  // Refresh data (for logs)
  const refreshJob = useCallback(async () => {
    const response = await fetch(`/api/job-plans/${jobId}`);
    if (response.ok) {
      const data = await response.json();
      setJob(data);
      calculateCompletedSteps(data);
    }
  }, [jobId]);

  const handleStepChange = (stepId: string) => {
    setCurrentStep(stepId);
    setMobileMenuOpen(false);
  };

  // Handle name editing
  const startEditingName = () => {
    if (!canEdit || !job) return;
    setEditedName(job.jobName);
    setIsEditingName(true);
    // Focus input after render
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const saveNameEdit = () => {
    if (!job || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }
    if (editedName.trim() !== job.jobName) {
      updateJob({ jobName: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const cancelNameEdit = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveNameEdit();
    } else if (e.key === "Escape") {
      cancelNameEdit();
    }
  };

  // Render current step content
  const renderStepContent = () => {
    if (!job) return null;

    const stepProps = {
      job,
      updateJob,
      refreshJob,
      canEdit,
    };

    switch (currentStep) {
      // Planning
      case "permits":
        return <PermitsStep {...stepProps} />;
      case "route":
        return <RouteStep {...stepProps} />;
      case "materials":
        return <MaterialsStep {...stepProps} />;
      case "hazards":
        return <HazardsStep {...stepProps} />;
      case "crew":
        return <CrewStep {...stepProps} />;
      case "scheduling":
        return <SchedulingStep {...stepProps} />;
      // Construction
      case "daily-progress":
        return <DailyProgressStep {...stepProps} />;
      case "material-usage":
        return <MaterialUsageStep {...stepProps} />;
      case "crew-hours":
        return <CrewHoursStep {...stepProps} />;
      case "issues":
        return <IssuesStep {...stepProps} />;
      // Reporting
      case "completion-summary":
        return <CompletionSummaryStep {...stepProps} />;
      case "as-built":
        return <AsBuiltStep {...stepProps} />;
      case "signoff":
        return <SignoffStep {...stepProps} />;
      case "lessons":
        return <LessonsStep {...stepProps} />;
      case "hours-summary":
        return <HoursSummaryStep {...stepProps} />;
      default:
        return <div>Step not found</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Job not found</p>
        <Button onClick={() => router.push(backUrl)}>Go Back</Button>
      </div>
    );
  }

  const currentStepInfo = steps.find((s) => s.id === currentStep);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(backUrl)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    ref={nameInputRef}
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    onBlur={saveNameEdit}
                    className="h-8 text-base font-semibold"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={saveNameEdit}
                  >
                    <Check className="h-4 w-4 text-emerald-600" />
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    "group flex items-center gap-2",
                    canEdit && "cursor-pointer"
                  )}
                  onClick={canEdit ? startEditingName : undefined}
                >
                  <h1 className="font-semibold text-slate-900 truncate">
                    {job.jobName}
                  </h1>
                  {canEdit && (
                    <Pencil className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500">
                {job.startPoleId} → {job.endPoleId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save Status */}
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600">Saved</span>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 bg-white border-r border-slate-200 fixed left-[var(--sidebar-width,16rem)] top-[calc(4rem+1px)] bottom-0 overflow-y-auto z-20">
          <JobPhaseSidebar
            currentStep={currentStep}
            onStepChange={handleStepChange}
            completedSteps={completedSteps}
          />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
            <aside
              className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pt-4">
                <JobPhaseSidebar
                  currentStep={currentStep}
                  onStepChange={handleStepChange}
                  completedSteps={completedSteps}
                  jobName={job.jobName}
                />
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-72 min-h-[calc(100vh-4rem)]">
          <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Step Header */}
            <div className="mb-6">
              {currentStepInfo && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <currentStepInfo.icon className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {currentStepInfo.name}
                    </h2>
                    <p className="text-sm text-slate-500 capitalize">
                      {currentStepInfo.phase} Phase
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              {renderStepContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
