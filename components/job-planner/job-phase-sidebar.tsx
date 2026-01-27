"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  Package,
  Users,
  Calendar,
  TrendingUp,
  Boxes,
  Clock,
  AlertCircle,
  FileText,
  GitCompare,
  CheckSquare,
  Lightbulb,
  Calculator,
  CheckCircle2,
  Circle,
  Lock,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Phase = "planning" | "construction" | "reporting";

export interface Step {
  id: string;
  name: string;
  icon: React.ElementType;
  phase: Phase;
  parentId?: string; // For nested steps
}

export const phases: { id: Phase; name: string; color: string }[] = [
  { id: "planning", name: "Planning", color: "text-blue-600" },
  { id: "construction", name: "Construction", color: "text-orange-600" },
  { id: "reporting", name: "Reporting", color: "text-green-600" },
];

export const steps: Step[] = [
  // Planning Phase
  { id: "route-design", name: "Route Design", icon: Map, phase: "planning" },
  { id: "bom", name: "Bill of Materials", icon: Package, phase: "planning", parentId: "route-design" },
  { id: "permits", name: "Red Light Check", icon: ClipboardCheck, phase: "planning" },
  { id: "crew", name: "Crew Assignment", icon: Users, phase: "planning" },
  { id: "scheduling", name: "Scheduling", icon: Calendar, phase: "planning" },
  // Construction Phase
  { id: "daily-progress", name: "Daily Progress", icon: TrendingUp, phase: "construction" },
  { id: "material-usage", name: "Material Usage", icon: Boxes, phase: "construction" },
  { id: "crew-hours", name: "Crew Hours", icon: Clock, phase: "construction" },
  { id: "issues", name: "Issues/Blockers", icon: AlertCircle, phase: "construction" },
  // Reporting Phase
  { id: "completion-summary", name: "Completion Summary", icon: FileText, phase: "reporting" },
  { id: "as-built", name: "As-Built Docs", icon: GitCompare, phase: "reporting" },
  { id: "signoff", name: "Sign-off", icon: CheckSquare, phase: "reporting" },
  { id: "lessons", name: "Lessons Learned", icon: Lightbulb, phase: "reporting" },
  { id: "hours-summary", name: "Hours Summary", icon: Calculator, phase: "reporting" },
];

interface JobPhaseSidebarProps {
  currentStep: string;
  onStepChange: (stepId: string) => void;
  completedSteps?: Set<string>;
  jobName?: string;
  className?: string;
  /** When false, construction tabs are disabled (Red Light Check not cleared) */
  redLightCleared?: boolean;
  /** When true, shows only icons in a compact strip */
  collapsed?: boolean;
}

export function JobPhaseSidebar({
  currentStep,
  onStepChange,
  completedSteps = new Set(),
  jobName,
  className,
  redLightCleared = true,
  collapsed = false,
}: JobPhaseSidebarProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<Phase>>(
    new Set<Phase>(["planning", "construction", "reporting"])
  );

  const togglePhase = (phase: Phase) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  const getStepsForPhase = (phase: Phase) => {
    // Return top-level steps (no parentId) for this phase
    return steps.filter((step) => step.phase === phase && !step.parentId);
  };

  const getChildSteps = (parentId: string) => {
    return steps.filter((step) => step.parentId === parentId);
  };

  // Check if a step or any of its children is active
  const isStepOrChildActive = (stepId: string) => {
    if (currentStep === stepId) return true;
    const children = getChildSteps(stepId);
    return children.some(child => currentStep === child.id);
  };

  const getPhaseProgress = (phase: Phase) => {
    const phaseSteps = getStepsForPhase(phase);
    const completed = phaseSteps.filter((step) => completedSteps.has(step.id)).length;
    return { completed, total: phaseSteps.length };
  };

  const currentPhase = steps.find((s) => s.id === currentStep)?.phase;

  // Check if a phase is locked (Construction requires Red Light clearance)
  const isPhaseDisabled = (phase: Phase) => {
    return phase === "construction" && !redLightCleared;
  };

  // Collapsed view - icon strip only (excludes nested steps)
  if (collapsed) {
    const topLevelSteps = steps.filter(s => !s.parentId);
    return (
      <div className={cn("flex flex-col h-full py-2", className)}>
        {topLevelSteps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id || isStepOrChildActive(step.id);
          const isCompleted = completedSteps.has(step.id);
          const isStepDisabled = step.phase === "construction" && !redLightCleared;

          return (
            <button
              key={step.id}
              onClick={() => !isStepDisabled && onStepChange(step.id)}
              disabled={isStepDisabled}
              title={isStepDisabled ? "Complete Red Light Check to unlock" : step.name}
              className={cn(
                "w-full flex items-center justify-center py-2.5 transition-colors relative",
                !isStepDisabled && "hover:bg-slate-50",
                isActive && !isStepDisabled && "bg-orange-50",
                isStepDisabled && "opacity-40 cursor-not-allowed"
              )}
            >
              {/* Active indicator */}
              {isActive && !isStepDisabled && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-orange-500 rounded-r" />
              )}
              
              <div className="relative">
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isStepDisabled 
                      ? "text-slate-300" 
                      : isActive 
                        ? "text-orange-600" 
                        : isCompleted
                          ? "text-emerald-500"
                          : "text-slate-400"
                  )}
                />
                {/* Completion dot */}
                {isCompleted && !isActive && (
                  <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-emerald-500 rounded-full border border-white" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Expanded view - full sidebar
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Job Header */}
      {jobName && (
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Job</p>
          <h2 className="font-semibold text-slate-900 truncate">{jobName}</h2>
        </div>
      )}

      {/* Phase Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {phases.map((phase) => {
          const isExpanded = expandedPhases.has(phase.id);
          const phaseSteps = getStepsForPhase(phase.id);
          const progress = getPhaseProgress(phase.id);
          const isActivePhase = currentPhase === phase.id;
          const isDisabled = isPhaseDisabled(phase.id);

          return (
            <div key={phase.id} className="mb-1">
              {/* Phase Header */}
              <button
                onClick={() => togglePhase(phase.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors",
                  "hover:bg-slate-50",
                  isActivePhase && "bg-slate-50",
                  isDisabled && "opacity-60"
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
                <span className={cn("font-semibold text-sm", phase.color)}>
                  {phase.name}
                </span>
                {isDisabled && (
                  <Lock className="h-3.5 w-3.5 text-red-400 ml-1" />
                )}
                <span className="ml-auto text-xs text-slate-400">
                  {progress.completed}/{progress.total}
                </span>
              </button>

              {/* Locked Banner */}
              {isDisabled && isExpanded && (
                <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    Complete Red Light Check to unlock
                  </p>
                </div>
              )}

              {/* Steps */}
              {isExpanded && (
                <div className="ml-4 border-l border-slate-200">
                  {phaseSteps.map((step) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = completedSteps.has(step.id);
                    const isStepDisabled = isDisabled;
                    const childSteps = getChildSteps(step.id);
                    const hasChildren = childSteps.length > 0;
                    const showChildren = hasChildren && isStepOrChildActive(step.id);

                    return (
                      <div key={step.id}>
                        <button
                          onClick={() => !isStepDisabled && onStepChange(step.id)}
                          disabled={isStepDisabled}
                          title={isStepDisabled ? "Complete Red Light Check to unlock" : undefined}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                            "text-sm",
                            !isStepDisabled && "hover:bg-slate-50",
                            isActive && !isStepDisabled && "bg-orange-50 border-l-2 border-orange-500 -ml-[1px]",
                            !isActive && "ml-0",
                            isStepDisabled && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          {/* Status Indicator */}
                          <div className="relative">
                            {isStepDisabled ? (
                              <Lock className="h-4 w-4 text-slate-300" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : isActive ? (
                              <div className="h-4 w-4 rounded-full border-2 border-orange-500 bg-orange-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-slate-300" />
                            )}
                          </div>

                          {/* Step Icon */}
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              isStepDisabled 
                                ? "text-slate-300" 
                                : isActive 
                                  ? "text-orange-600" 
                                  : "text-slate-400"
                            )}
                          />

                          {/* Step Name */}
                          <span
                            className={cn(
                              "flex-1 truncate",
                              isStepDisabled
                                ? "text-slate-400"
                                : isActive
                                  ? "font-medium text-orange-900"
                                  : isCompleted
                                    ? "text-slate-600"
                                    : "text-slate-500"
                            )}
                          >
                            {step.name}
                          </span>
                        </button>

                        {/* Nested Child Steps */}
                        {showChildren && (
                          <div className="ml-6 border-l border-slate-100">
                            {childSteps.map((childStep) => {
                              const ChildIcon = childStep.icon;
                              const isChildActive = currentStep === childStep.id;
                              const isChildCompleted = completedSteps.has(childStep.id);

                              return (
                                <button
                                  key={childStep.id}
                                  onClick={() => !isStepDisabled && onStepChange(childStep.id)}
                                  disabled={isStepDisabled}
                                  className={cn(
                                    "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
                                    "text-xs",
                                    !isStepDisabled && "hover:bg-slate-50",
                                    isChildActive && !isStepDisabled && "bg-orange-50 border-l-2 border-orange-400 -ml-[1px]",
                                    !isChildActive && "ml-0",
                                    isStepDisabled && "opacity-40 cursor-not-allowed"
                                  )}
                                >
                                  {/* Status Indicator */}
                                  <div className="relative">
                                    {isStepDisabled ? (
                                      <Lock className="h-3 w-3 text-slate-300" />
                                    ) : isChildCompleted ? (
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    ) : isChildActive ? (
                                      <div className="h-3 w-3 rounded-full border-2 border-orange-400 bg-orange-400" />
                                    ) : (
                                      <Circle className="h-3 w-3 text-slate-300" />
                                    )}
                                  </div>

                                  {/* Child Step Icon */}
                                  <ChildIcon
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      isStepDisabled 
                                        ? "text-slate-300" 
                                        : isChildActive 
                                          ? "text-orange-500" 
                                          : "text-slate-400"
                                    )}
                                  />

                                  {/* Child Step Name */}
                                  <span
                                    className={cn(
                                      "flex-1 truncate",
                                      isStepDisabled
                                        ? "text-slate-400"
                                        : isChildActive
                                          ? "font-medium text-orange-800"
                                          : isChildCompleted
                                            ? "text-slate-600"
                                            : "text-slate-500"
                                    )}
                                  >
                                    {childStep.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
