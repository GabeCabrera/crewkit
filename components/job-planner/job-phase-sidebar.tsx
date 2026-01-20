"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  Package,
  AlertTriangle,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Phase = "planning" | "construction" | "reporting";

export interface Step {
  id: string;
  name: string;
  icon: React.ElementType;
  phase: Phase;
}

export const phases: { id: Phase; name: string; color: string }[] = [
  { id: "planning", name: "Planning", color: "text-blue-600" },
  { id: "construction", name: "Construction", color: "text-orange-600" },
  { id: "reporting", name: "Reporting", color: "text-green-600" },
];

export const steps: Step[] = [
  // Planning Phase
  { id: "permits", name: "Red Light Check", icon: ClipboardCheck, phase: "planning" },
  { id: "route", name: "Route Details", icon: MapPin, phase: "planning" },
  { id: "materials", name: "Materials", icon: Package, phase: "planning" },
  { id: "hazards", name: "Hazards", icon: AlertTriangle, phase: "planning" },
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
}

export function JobPhaseSidebar({
  currentStep,
  onStepChange,
  completedSteps = new Set(),
  jobName,
  className,
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
    return steps.filter((step) => step.phase === phase);
  };

  const getPhaseProgress = (phase: Phase) => {
    const phaseSteps = getStepsForPhase(phase);
    const completed = phaseSteps.filter((step) => completedSteps.has(step.id)).length;
    return { completed, total: phaseSteps.length };
  };

  const currentPhase = steps.find((s) => s.id === currentStep)?.phase;

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

          return (
            <div key={phase.id} className="mb-1">
              {/* Phase Header */}
              <button
                onClick={() => togglePhase(phase.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors",
                  "hover:bg-slate-50",
                  isActivePhase && "bg-slate-50"
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
                <span className="ml-auto text-xs text-slate-400">
                  {progress.completed}/{progress.total}
                </span>
              </button>

              {/* Steps */}
              {isExpanded && (
                <div className="ml-4 border-l border-slate-200">
                  {phaseSteps.map((step) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = completedSteps.has(step.id);

                    return (
                      <button
                        key={step.id}
                        onClick={() => onStepChange(step.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                          "hover:bg-slate-50 text-sm",
                          isActive && "bg-orange-50 border-l-2 border-orange-500 -ml-[1px]",
                          !isActive && "ml-0"
                        )}
                      >
                        {/* Status Indicator */}
                        <div className="relative">
                          {isCompleted ? (
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
                            isActive ? "text-orange-600" : "text-slate-400"
                          )}
                        />

                        {/* Step Name */}
                        <span
                          className={cn(
                            "flex-1 truncate",
                            isActive
                              ? "font-medium text-orange-900"
                              : isCompleted
                              ? "text-slate-600"
                              : "text-slate-500"
                          )}
                        >
                          {step.name}
                        </span>
                      </button>
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
