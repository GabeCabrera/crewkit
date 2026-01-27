"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Users,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type JobPlanStatus = "DRAFT" | "READY" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type JobPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Assignment {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface JobPlan {
  id: string;
  jobName: string;
  jobNumber: string | null;
  locationName: string | null;
  totalDistance: number;
  poleCount: number;
  actualFootage: number;
  status: JobPlanStatus;
  priority: JobPriority;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  // Permits
  rmpPermitApproved: boolean;
  sesdPermitApproved: boolean;
  makeReadyComplete: boolean;
  easementsClear: boolean;
  // Hazards
  trafficControl: boolean;
  treeTrimming: boolean;
  animalHazards: boolean;
  waterRailCrossing: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  assignments: Assignment[];
  _count: {
    comments: number;
  };
}

// Priority colors for job blocks
const priorityColors: Record<JobPriority, { bg: string; border: string; text: string }> = {
  URGENT: { bg: "bg-red-100", border: "border-red-400", text: "text-red-800" },
  HIGH: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-800" },
  MEDIUM: { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-800" },
  LOW: { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-700" },
};

// Status colors for the dot indicator
const statusColors: Record<JobPlanStatus, string> = {
  DRAFT: "bg-slate-400",
  READY: "bg-emerald-500",
  IN_PROGRESS: "bg-blue-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-red-400",
};

interface JobCalendarViewProps {
  jobs: JobPlan[];
  onSelectJob?: (job: JobPlan) => void;
  selectedJobId?: string | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function JobCalendarView({
  jobs,
  onSelectJob,
  selectedJobId,
}: JobCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Navigate months
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Get calendar grid data
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Sunday of the week containing first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // End on Saturday of the week containing last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const days: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Get jobs for a specific date
  const getJobsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    
    return jobs.filter((job) => {
      if (!job.plannedStartDate) return false;
      
      const startDate = new Date(job.plannedStartDate).toISOString().split("T")[0];
      const endDate = job.plannedEndDate 
        ? new Date(job.plannedEndDate).toISOString().split("T")[0]
        : startDate;
      
      return dateStr >= startDate && dateStr <= endDate;
    });
  };

  // Check if a job starts on this date
  const jobStartsOnDate = (job: JobPlan, date: Date) => {
    if (!job.plannedStartDate) return false;
    const startDate = new Date(job.plannedStartDate).toISOString().split("T")[0];
    const dateStr = date.toISOString().split("T")[0];
    return startDate === dateStr;
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is in current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Get unscheduled jobs
  const unscheduledJobs = useMemo(() => {
    return jobs.filter((job) => !job.plannedStartDate);
  }, [jobs]);

  // Check if job has hazards
  const hasHazards = (job: JobPlan) => {
    return job.trafficControl || job.treeTrimming || job.animalHazards || job.waterRailCrossing;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth("prev")}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-8 px-3 text-xs"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth("next")}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <h2 className="text-lg font-semibold text-slate-900">
          {currentDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-100 border border-red-400" />
            <span>Urgent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-orange-100 border border-orange-400" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-400" />
            <span>Medium</span>
          </div>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEKDAYS.map((day, idx) => {
          // Work days are Mon-Thu (idx 1-4), non-work are Fri-Sun (idx 0, 5, 6)
          const isWorkDay = idx >= 1 && idx <= 4;
          const isLastCol = idx === 6;
          return (
            <div
              key={day}
              className={cn(
                "py-2.5 text-center text-xs font-semibold uppercase tracking-wide",
                !isLastCol && "border-r border-slate-200",
                isWorkDay ? "text-slate-600" : "text-slate-400 bg-slate-100/60"
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((date, index) => {
          const dayJobs = getJobsForDate(date);
          const today = isToday(date);
          const inMonth = isCurrentMonth(date);
          // Non-work days: Friday (5), Saturday (6), Sunday (0)
          const isNonWorkDay = date.getDay() === 0 || date.getDay() === 5 || date.getDay() === 6;
          const isLastCol = index % 7 === 6;

          return (
            <div
              key={index}
              className={cn(
                "min-h-[100px] border-b border-slate-100 p-1.5",
                !isLastCol && "border-r border-slate-100",
                !inMonth && "bg-slate-50/50",
                isNonWorkDay && inMonth && "bg-slate-100/30",
                today && "bg-orange-50/50"
              )}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    today && "bg-orange-500 text-white",
                    !today && inMonth && "text-slate-700",
                    !today && !inMonth && "text-slate-400"
                  )}
                >
                  {date.getDate()}
                </span>
                {dayJobs.length > 3 && (
                  <span className="text-[10px] text-slate-400">
                    +{dayJobs.length - 3} more
                  </span>
                )}
              </div>

              {/* Job Blocks (show max 3) */}
              <div className="space-y-0.5">
                {dayJobs.slice(0, 3).map((job) => {
                  const colors = priorityColors[job.priority];
                  const startsToday = jobStartsOnDate(job, date);
                  const isSelected = selectedJobId === job.id;

                  return (
                    <button
                      key={job.id}
                      onClick={() => onSelectJob?.(job)}
                      className={cn(
                        "w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate",
                        "border transition-all hover:shadow-sm",
                        colors.bg,
                        colors.border,
                        colors.text,
                        isSelected && "ring-2 ring-orange-400 ring-offset-1",
                        !startsToday && "opacity-60 border-dashed"
                      )}
                      title={`${job.jobName}${job.locationName ? ` - ${job.locationName}` : ""}`}
                    >
                      <div className="flex items-center gap-1">
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusColors[job.status])} />
                        <span className="truncate">{job.jobName}</span>
                        {hasHazards(job) && (
                          <AlertTriangle className="h-2.5 w-2.5 text-amber-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled Jobs Section */}
      {unscheduledJobs.length > 0 && (
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Unscheduled Jobs ({unscheduledJobs.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {unscheduledJobs.map((job) => {
              const colors = priorityColors[job.priority];
              const isSelected = selectedJobId === job.id;

              return (
                <button
                  key={job.id}
                  onClick={() => onSelectJob?.(job)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium",
                    "border transition-all hover:shadow-sm",
                    colors.bg,
                    colors.border,
                    colors.text,
                    isSelected && "ring-2 ring-orange-400 ring-offset-1"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", statusColors[job.status])} />
                  <span>{job.jobName}</span>
                  {job.locationName && (
                    <>
                      <MapPin className="h-3 w-3 opacity-60" />
                      <span className="opacity-75 truncate max-w-[100px]">{job.locationName}</span>
                    </>
                  )}
                  {job.assignments.length > 0 && (
                    <div className="flex items-center gap-0.5 opacity-60">
                      <Users className="h-3 w-3" />
                      <span>{job.assignments.length}</span>
                    </div>
                  )}
                  {hasHazards(job) && (
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
