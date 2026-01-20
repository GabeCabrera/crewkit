"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type JobPlanStatus = "DRAFT" | "READY" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type JobPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type TimeScale = "day" | "week" | "month";

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
  startPoleId: string;
  endPoleId: string;
  totalDistance: number;
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

interface StatusGroup {
  id: JobPlanStatus;
  title: string;
  color: string;
  bgColor: string;
}

const statusGroups: StatusGroup[] = [
  { id: "DRAFT", title: "Draft", color: "bg-slate-400", bgColor: "bg-slate-100" },
  { id: "READY", title: "Ready", color: "bg-emerald-500", bgColor: "bg-emerald-50" },
  { id: "IN_PROGRESS", title: "In Progress", color: "bg-blue-500", bgColor: "bg-blue-50" },
  { id: "COMPLETED", title: "Completed", color: "bg-green-500", bgColor: "bg-green-50" },
  { id: "CANCELLED", title: "Cancelled", color: "bg-red-400", bgColor: "bg-red-50" },
];

const priorityColors: Record<JobPriority, string> = {
  LOW: "border-l-slate-300",
  MEDIUM: "border-l-blue-400",
  HIGH: "border-l-amber-500",
  URGENT: "border-l-red-500",
};

interface JobTimelineViewProps {
  jobs: JobPlan[];
  onSelectJob?: (job: JobPlan) => void;
  onUpdateDates?: (jobId: string, startDate: Date, endDate: Date) => void;
  selectedJobId?: string | null;
}

export function JobTimelineView({
  jobs,
  onSelectJob,
  onUpdateDates,
  selectedJobId,
}: JobTimelineViewProps) {
  const [timeScale, setTimeScale] = useState<TimeScale>("week");
  const [viewStartDate, setViewStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Start from beginning of current week (Sunday)
    const dayOfWeek = today.getDay();
    today.setDate(today.getDate() - dayOfWeek);
    return today;
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<JobPlanStatus>>(
    () => new Set<JobPlanStatus>(["COMPLETED", "CANCELLED"])
  );
  const timelineRef = useRef<HTMLDivElement>(null);

  // Calculate visible date range based on scale
  const { dates, dayWidth } = useMemo(() => {
    const daysToShow = timeScale === "day" ? 7 : timeScale === "week" ? 14 : 30;
    const width = timeScale === "day" ? 120 : timeScale === "week" ? 60 : 30;
    const result: Date[] = [];
    
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(viewStartDate);
      date.setDate(date.getDate() + i);
      result.push(date);
    }
    
    return { dates: result, dayWidth: width };
  }, [viewStartDate, timeScale]);

  // Navigate time
  const navigateTime = useCallback((direction: "prev" | "next") => {
    const days = timeScale === "day" ? 7 : timeScale === "week" ? 14 : 30;
    setViewStartDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === "next" ? days : -days));
      return newDate;
    });
  }, [timeScale]);

  const goToToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    today.setDate(today.getDate() - dayOfWeek);
    setViewStartDate(today);
  }, []);

  const toggleGroup = (status: JobPlanStatus) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  // Group jobs by status
  const groupedJobs = useMemo(() => {
    const groups: Record<JobPlanStatus, JobPlan[]> = {
      DRAFT: [],
      READY: [],
      IN_PROGRESS: [],
      COMPLETED: [],
      CANCELLED: [],
    };
    jobs.forEach((job) => {
      groups[job.status].push(job);
    });
    return groups;
  }, [jobs]);

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Format date for header
  const formatDateHeader = (date: Date) => {
    const day = date.toLocaleDateString("en-US", { weekday: "short" });
    const num = date.getDate();
    return { day, num };
  };

  // Check if date is weekend
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Calculate today's position
  const todayPosition = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startTime = viewStartDate.getTime();
    const todayTime = today.getTime();
    const daysDiff = (todayTime - startTime) / (1000 * 60 * 60 * 24);
    
    if (daysDiff >= 0 && daysDiff < dates.length) {
      return daysDiff * dayWidth;
    }
    return null;
  }, [viewStartDate, dates.length, dayWidth]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateTime("prev")}
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
            onClick={() => navigateTime("next")}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-slate-700 ml-2">
            {viewStartDate.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Time Scale Toggle */}
        <div className="flex items-center rounded-lg bg-white border border-slate-200 p-0.5">
          {(["day", "week", "month"] as TimeScale[]).map((scale) => (
            <button
              key={scale}
              onClick={() => setTimeScale(scale)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                timeScale === scale
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {scale.charAt(0).toUpperCase() + scale.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Container */}
      <div className="flex overflow-hidden">
        {/* Fixed Job Names Column */}
        <div className="w-48 flex-shrink-0 border-r border-slate-200 bg-white z-10">
          {/* Empty header cell */}
          <div className="h-14 border-b border-slate-200 bg-slate-50" />
          
          {/* Job rows */}
          {statusGroups.map((group) => {
            const groupJobs = groupedJobs[group.id];
            const isCollapsed = collapsedGroups.has(group.id);
            
            return (
              <div key={group.id}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-2 text-left text-sm font-semibold border-b border-slate-100",
                    group.bgColor
                  )}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                  <span className={cn("w-2 h-2 rounded-full", group.color)} />
                  <span>{group.title}</span>
                  <span className="text-xs text-slate-500 ml-auto">
                    {groupJobs.length}
                  </span>
                </button>
                
                {/* Job names */}
                {!isCollapsed && groupJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onSelectJob?.(job)}
                    className={cn(
                      "h-12 px-3 flex items-center border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors",
                      "border-l-4",
                      priorityColors[job.priority],
                      selectedJobId === job.id && "bg-orange-50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {job.jobName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {job.startPoleId} → {job.endPoleId}
                      </p>
                    </div>
                    {job.assignments.length > 0 && (
                      <div className="flex items-center text-slate-400 ml-1">
                        <Users className="h-3 w-3" />
                        <span className="text-xs ml-0.5">{job.assignments.length}</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Empty state for group */}
                {!isCollapsed && groupJobs.length === 0 && (
                  <div className="h-12 px-3 flex items-center justify-center text-xs text-slate-400 border-b border-slate-100">
                    No jobs
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Scrollable Timeline Area */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-x-auto"
          style={{ scrollBehavior: "smooth" }}
        >
          <div style={{ minWidth: dates.length * dayWidth }}>
            {/* Date Header */}
            <div className="h-14 flex border-b border-slate-200 bg-slate-50 sticky top-0">
              {dates.map((date, i) => {
                const { day, num } = formatDateHeader(date);
                const weekend = isWeekend(date);
                const today = isToday(date);
                
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-100",
                      weekend && "bg-slate-100/50",
                      today && "bg-orange-50"
                    )}
                    style={{ width: dayWidth }}
                  >
                    <span className={cn(
                      "text-xs",
                      today ? "text-orange-600 font-semibold" : "text-slate-500"
                    )}>
                      {day}
                    </span>
                    <span className={cn(
                      "text-sm font-semibold",
                      today ? "text-orange-600" : "text-slate-700"
                    )}>
                      {num}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Timeline Rows */}
            <div className="relative">
              {/* Today indicator line */}
              {todayPosition !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-20 pointer-events-none"
                  style={{ left: todayPosition + dayWidth / 2 }}
                />
              )}

              {statusGroups.map((group) => {
                const groupJobs = groupedJobs[group.id];
                const isCollapsed = collapsedGroups.has(group.id);
                
                return (
                  <div key={group.id}>
                    {/* Group header row */}
                    <div
                      className={cn(
                        "h-[37px] border-b border-slate-100 flex",
                        group.bgColor
                      )}
                    >
                      {dates.map((date, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex-shrink-0 border-r border-slate-100/50",
                            isWeekend(date) && "bg-slate-100/30"
                          )}
                          style={{ width: dayWidth }}
                        />
                      ))}
                    </div>
                    
                    {/* Job timeline bars */}
                    {!isCollapsed && groupJobs.map((job) => (
                      <TimelineBar
                        key={job.id}
                        job={job}
                        dates={dates}
                        dayWidth={dayWidth}
                        viewStartDate={viewStartDate}
                        onSelect={() => onSelectJob?.(job)}
                        onUpdateDates={onUpdateDates}
                        isSelected={selectedJobId === job.id}
                        statusColor={group.color}
                      />
                    ))}
                    
                    {/* Empty row */}
                    {!isCollapsed && groupJobs.length === 0 && (
                      <div className="h-12 flex border-b border-slate-100">
                        {dates.map((date, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex-shrink-0 border-r border-slate-100",
                              isWeekend(date) && "bg-slate-50/50"
                            )}
                            style={{ width: dayWidth }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Timeline Bar Component
// ============================================
interface TimelineBarProps {
  job: JobPlan;
  dates: Date[];
  dayWidth: number;
  viewStartDate: Date;
  onSelect: () => void;
  onUpdateDates?: (jobId: string, startDate: Date, endDate: Date) => void;
  isSelected: boolean;
  statusColor: string;
}

function TimelineBar({
  job,
  dates,
  dayWidth,
  viewStartDate,
  onSelect,
  onUpdateDates,
  isSelected,
  statusColor,
}: TimelineBarProps) {
  const hasHazards =
    job.trafficControl ||
    job.treeTrimming ||
    job.animalHazards ||
    job.waterRailCrossing;

  const progress =
    job.totalDistance > 0
      ? Math.min(100, (job.actualFootage / job.totalDistance) * 100)
      : 0;

  // Calculate bar position
  const barStyle = useMemo(() => {
    if (!job.plannedStartDate || !job.plannedEndDate) {
      return null;
    }

    const startDate = new Date(job.plannedStartDate);
    const endDate = new Date(job.plannedEndDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const viewStart = viewStartDate.getTime();
    const viewEnd = new Date(dates[dates.length - 1]).getTime();
    const barStart = startDate.getTime();
    const barEnd = endDate.getTime();

    // Check if bar is visible
    if (barEnd < viewStart || barStart > viewEnd) {
      return null;
    }

    // Calculate position
    const dayMs = 1000 * 60 * 60 * 24;
    const startOffset = Math.max(0, (barStart - viewStart) / dayMs);
    const endOffset = Math.min(dates.length, (barEnd - viewStart) / dayMs + 1);
    
    const left = startOffset * dayWidth;
    const width = (endOffset - startOffset) * dayWidth;

    return { left, width };
  }, [job.plannedStartDate, job.plannedEndDate, viewStartDate, dates, dayWidth]);

  // Check if overdue
  const isOverdue = useMemo(() => {
    if (!job.plannedEndDate) return false;
    const endDate = new Date(job.plannedEndDate);
    const today = new Date();
    return endDate < today && job.status !== "COMPLETED";
  }, [job.plannedEndDate, job.status]);

  // Check if job is weekend
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  return (
    <div className="h-12 flex border-b border-slate-100 relative">
      {/* Background grid */}
      {dates.map((date, i) => (
        <div
          key={i}
          className={cn(
            "flex-shrink-0 border-r border-slate-100",
            isWeekend(date) && "bg-slate-50/50"
          )}
          style={{ width: dayWidth }}
        />
      ))}

      {/* Duration bar */}
      {barStyle && (
        <div
          onClick={onSelect}
          className={cn(
            "absolute top-2 h-8 rounded-md cursor-pointer transition-all group",
            "border-2 border-transparent hover:border-orange-400",
            isSelected && "ring-2 ring-orange-400 ring-offset-1",
            isOverdue ? "bg-red-100" : statusColor.replace("bg-", "bg-").replace("-500", "-100").replace("-400", "-100")
          )}
          style={{
            left: barStyle.left + 4,
            width: Math.max(barStyle.width - 8, 24),
          }}
        >
          {/* Progress fill */}
          <div
            className={cn(
              "absolute inset-0 rounded-md transition-all",
              isOverdue ? "bg-red-400" : statusColor
            )}
            style={{
              width: `${progress}%`,
              opacity: 0.8,
            }}
          />

          {/* Bar content */}
          <div className="relative h-full flex items-center px-2 gap-1.5 z-10">
            <span className="text-xs font-medium text-slate-900 truncate flex-1">
              {job.jobName}
            </span>
            {hasHazards && (
              <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0" />
            )}
            {progress > 0 && (
              <span className="text-[10px] font-semibold text-slate-700 flex-shrink-0">
                {Math.round(progress)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* No dates indicator */}
      {!barStyle && !job.plannedStartDate && (
        <div className="absolute inset-x-4 top-2 h-8 flex items-center justify-center">
          <span className="text-xs text-slate-400 italic">No dates set</span>
        </div>
      )}
    </div>
  );
}
