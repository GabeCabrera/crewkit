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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Planning Steps
import { PermitsStep } from "./steps/planning/permits-step";
import { RouteDesignStep } from "./steps/planning/route-design-step";
import { MaterialsStep } from "./steps/planning/materials-step";
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

// Type for red light check documents
export interface RedLightDocument {
  id: string;
  checkType: string; // "dot_permit" | "row_confirmed" | "power_lines" | "traffic_control"
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

// Type for assembly equipment items
interface AssemblyEquipmentItem {
  id: string;
  quantity: number;
  equipment: {
    id: string;
    name: string;
    sku: string;
    pricePerUnit?: number;
    unitType?: string;
  };
}

// Type for job plan assemblies
export interface JobPlanAssemblyData {
  id: string;
  assemblyId: string | null;  // Optional - may not have matching Assembly record
  quantity: number;
  assemblyType: string;
  isAutoDetected: boolean;
  assembly: {  // Optional - null if no matching Assembly template exists
    id: string;
    name: string;
    description: string | null;
    type: { id: string; name: string } | null;
    category: { id: string; name: string } | null;
    items: AssemblyEquipmentItem[];
  } | null;
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
  
  // Red Light Check - Zone A (Legal)
  redLightDotPermit?: boolean;
  redLightRowConfirmed?: boolean;
  dotPermitNumber?: string | null;
  rowConfirmationNotes?: string | null;
  
  // Red Light Check - Zone B (Safety)
  redLightPowerLines?: boolean;
  redLightTrafficControl?: boolean;
  powerLineNotes?: string | null;
  
  // Red Light Check - Zone C (Design)
  redLightPrintVerified?: boolean;
  printVerificationNotes?: string | null;
  
  // Red Light Master Status
  redLightCleared?: boolean;
  redLightClearedAt?: string | null;
  redLightClearedById?: string | null;
  
  // Red Light Check Documents
  redLightDocuments?: RedLightDocument[];
  
  // Planning - Route
  jobName: string;
  jobNumber: string | null;
  
  // Project Area (standardized naming)
  projectAreaId: string | null;
  projectArea?: {
    id: string;
    name: string;
    prefix: string;
  } | null;
  sequenceNumber: number | null;
  
  locationName: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  vetroProjectUrl: string | null;
  
  // Build Spec
  jobBuildType: "full_build" | "strand_build" | "fiber_build" | "peripheral_build";  // Default: full_build
  primaryMethod: string | null;     // DEPRECATED: "aerial" | "underground" | "both"
  constructionType: string | null;  // DEPRECATED: "new_strand" | "overlash" | "adss" | "ug_dip"
  cableProfile: string | null;      // e.g., "144ct Loose Tube"
  sagTensionSpec: string | null;    // e.g., "NESC Heavy"
  
  // Scope Breakdown
  totalDistance: number;            // Legacy/computed total
  aerialFootage: number;
  undergroundFootage: number;
  slackLoopFootage: number;
  poleCount: number;
  makeReadyRequired: boolean;
  
  // Access & Logistics
  gateCode: string | null;
  poleOwner: string | null;
  trafficControlTier: string | null;  // "none" | "cones" | "flaggers"
  siteContactName: string | null;
  siteContactPhone: string | null;
  
  // Construction Prints
  constructionPrints?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    uploadedAt: string;
  }>;
  
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
  overtimeApproved: boolean;
  customWorkDays: string | null; // JSON array of day numbers for per-job override
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
  // Required assemblies (from map detection or manual entry)
  requiredAssemblies?: JobPlanAssemblyData[];
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
  const [currentStep, setCurrentStep] = useState("route-design");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    // Store jobId in a ref-accessible variable for cleanup
    const currentJobId = jobId;
    
    return () => {
      // Clear any pending debounce timer
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Flush any pending updates before unmount using navigator.sendBeacon
      // This is more reliable than fetch with keepalive for page unload scenarios
      // and won't trigger "message channel closed" errors
      const pendingData = pendingUpdatesRef.current;
      if (Object.keys(pendingData).length > 0) {
        const blob = new Blob([JSON.stringify(pendingData)], { type: "application/json" });
        
        // navigator.sendBeacon is designed for this use case
        // Note: sendBeacon always sends POST, so our API needs to handle this
        // For now, keep using fetch with keepalive which works for PATCH
        fetch(`/api/job-plans/${currentJobId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingData),
          keepalive: true,
        }).catch(() => {
          // Silently fail on unmount - nothing we can do
        });
      }
    };
  }, [jobId]);

  // Calculate Red Light cleared status
  const calculateRedLightCleared = (jobData: JobPlanData): boolean => {
    const zoneACleared = 
      (jobData.redLightDotPermit ?? false) && 
      (jobData.redLightRowConfirmed ?? false);
    
    const zoneBCleared = 
      (jobData.redLightPowerLines ?? false) && 
      (jobData.redLightTrafficControl ?? false);
    
    const zoneCCleared = jobData.redLightPrintVerified ?? false;
    
    return zoneACleared && zoneBCleared && zoneCCleared;
  };

  // Calculate which steps are complete
  const calculateCompletedSteps = (jobData: JobPlanData) => {
    const completed = new Set<string>();

    // Permits (Red Light Check) - all 5 checks must pass
    if (calculateRedLightCleared(jobData)) {
      completed.add("permits");
    }

    // Route Design - required fields filled (combined route + materials)
    if (
      jobData.jobName &&
      (jobData.totalDistance > 0 || jobData.aerialFootage > 0 || jobData.undergroundFootage > 0)
    ) {
      completed.add("route-design");
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

  // Check if trying to navigate to a locked construction step
  const handleStepChange = (stepId: string) => {
    // Get the step info
    const stepInfo = steps.find(s => s.id === stepId);
    
    // Block navigation to construction steps if red light not cleared
    if (stepInfo?.phase === "construction" && job && !calculateRedLightCleared(job)) {
      // Could show a toast here, but the sidebar already shows the locked state
      return;
    }
    
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

    const isAdmin =
      session?.user?.role === "ADMIN" || session?.user?.role === "SUPERUSER";
    
    const stepProps = {
      job,
      updateJob,
      refreshJob,
      canEdit,
      isAdmin,
    };

    switch (currentStep) {
      // Planning
      case "route-design":
        return <RouteDesignStep {...stepProps} />;
      case "bom":
        return <MaterialsStep {...stepProps} />;
      case "permits":
        return <PermitsStep {...stepProps} onNavigate={handleStepChange} />;
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
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <p className="text-slate-500">Job not found</p>
        <Button onClick={() => router.push(backUrl)}>Go Back</Button>
      </div>
    );
  }

  const currentStepInfo = steps.find((s) => s.id === currentStep);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-50">
      {/* Header - offset on desktop to not overlap job phase sidebar */}
      <header className={cn(
        "bg-white border-b border-slate-200 shrink-0 z-30 transition-all duration-200",
        sidebarCollapsed ? "lg:ml-14" : "lg:ml-72"
      )}>
        <div className="flex items-center justify-between px-4 py-3 sm:py-4">
          {/* Left Section: Back + Job Info */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(backUrl)}
              className="shrink-0 -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="min-w-0 flex-1">
              {/* Job Name - Editable */}
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    ref={nameInputRef}
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    onBlur={saveNameEdit}
                    className="h-9 text-lg font-semibold max-w-xs"
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
                    canEdit && "cursor-pointer hover:opacity-80 transition-opacity"
                  )}
                  onClick={canEdit ? startEditingName : undefined}
                >
                  <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                    {job.jobName}
                  </h1>
                  {canEdit && (
                    <Pencil className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </div>
              )}
              
              {/* Meta Info Row - Job Number & Phase */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* Job Number Badge */}
                {job.jobNumber && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 font-mono tracking-tight">
                    {job.jobNumber}
                  </span>
                )}
                
                {/* Phase Indicator */}
                {currentStepInfo && (
                  <>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <span 
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          currentStepInfo.phase === "planning" && "bg-blue-500",
                          currentStepInfo.phase === "construction" && "bg-amber-500",
                          currentStepInfo.phase === "reporting" && "bg-emerald-500"
                        )}
                      />
                      <span className="capitalize">{currentStepInfo.phase}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600 font-medium">{currentStepInfo.name}</span>
                    </span>
                  </>
                )}
                
                {/* Save Status - Inline on mobile */}
                <span className="sm:hidden text-xs">
                  {saveStatus === "saving" && (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </span>
                  )}
                  {saveStatus === "saved" && (
                    <span className="inline-flex items-center gap-1 text-emerald-500">
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Right Section: Status + Menu */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Save Status - Desktop */}
            <div className="hidden sm:flex items-center gap-1.5 text-sm">
              {saveStatus === "saving" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving</span>
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Saved</span>
                </span>
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

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop Sidebar - Collapsible, starts at left edge (no main sidebar in full-bleed mode) */}
        <aside className={cn(
          "hidden lg:flex flex-col bg-white border-r border-slate-200 fixed left-0 top-0 bottom-0 z-40 transition-all duration-200",
          sidebarCollapsed ? "w-14" : "w-72"
        )}>
          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-4 z-50 h-6 w-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-3.5 w-3.5 text-slate-600" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5 text-slate-600" />
            )}
          </button>
          
          <div className={cn("flex-1 overflow-y-auto", sidebarCollapsed && "overflow-hidden")}>
            <JobPhaseSidebar
              currentStep={currentStep}
              onStepChange={handleStepChange}
              completedSteps={completedSteps}
              redLightCleared={calculateRedLightCleared(job)}
              collapsed={sidebarCollapsed}
            />
          </div>
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
                  redLightCleared={calculateRedLightCleared(job)}
                />
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        {(() => {
          // Steps that need full-bleed rendering (no max-width, no card wrapper)
          const FULL_BLEED_STEPS = new Set(["route-design"]);
          const isFullBleed = FULL_BLEED_STEPS.has(currentStep);

          return (
            <main className={cn(
              "flex-1 min-h-0 overflow-hidden transition-all duration-200",
              sidebarCollapsed ? "lg:ml-14" : "lg:ml-72"
            )}>
              {isFullBleed ? (
                // Full-bleed: no wrapper, no card, no padding - content fills space
                renderStepContent()
              ) : (
                // Standard: constrained width with card, scrollable
                <div className="h-full overflow-y-auto">
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
                </div>
              )}
            </main>
          );
        })()}
      </div>
    </div>
  );
}
