"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  createContext,
  useContext,
  useCallback,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Users,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

// ============================================
// Types
// ============================================
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
  rmpPermitApproved: boolean;
  sesdPermitApproved: boolean;
  makeReadyComplete: boolean;
  easementsClear: boolean;
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

// ============================================
// Constants
// ============================================
const priorityColors: Record<JobPriority, { bg: string; border: string; text: string }> = {
  URGENT: { bg: "bg-red-100", border: "border-red-400", text: "text-red-800" },
  HIGH: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-800" },
  MEDIUM: { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-800" },
  LOW: { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-700" },
};

const statusColors: Record<JobPlanStatus, string> = {
  DRAFT: "bg-slate-400",
  READY: "bg-emerald-500",
  IN_PROGRESS: "bg-blue-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-red-400",
};

const statusConfig: Record<JobPlanStatus, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: "bg-slate-100", text: "text-slate-600", label: "Draft" },
  READY: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Ready" },
  IN_PROGRESS: { bg: "bg-blue-100", text: "text-blue-700", label: "Active" },
  COMPLETED: { bg: "bg-green-100", text: "text-green-700", label: "Done" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-600", label: "Cancelled" },
};

const priorityDot: Record<JobPriority, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-blue-400",
  LOW: "bg-slate-300",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STORAGE_KEY = "jobsSplitSize";

// ============================================
// Hover Context
// ============================================
interface JobHoverContextType {
  hoveredJobId: string | null;
  setHoveredJobId: (id: string | null) => void;
  hoverSource: "list" | "calendar" | null;
  setHoverSource: (source: "list" | "calendar" | null) => void;
}

const JobHoverContext = createContext<JobHoverContextType>({
  hoveredJobId: null,
  setHoveredJobId: () => {},
  hoverSource: null,
  setHoverSource: () => {},
});

// ============================================
// Custom Hooks
// ============================================
function usePersistentState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersistentState = useCallback(
    (value: T) => {
      setState(value);
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Ignore storage errors
      }
    },
    [key]
  );

  return [state, setPersistentState];
}

function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

// ============================================
// Helper Functions
// ============================================
function hasHazards(job: JobPlan): boolean {
  return job.trafficControl || job.treeTrimming || job.animalHazards || job.waterRailCrossing;
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dateStr: string | null, status: JobPlanStatus): boolean {
  if (!dateStr || status === "COMPLETED" || status === "CANCELLED") return false;
  return new Date(dateStr) < new Date();
}

// ============================================
// Main Component
// ============================================
interface CombinedJobsViewProps {
  jobs: JobPlan[];
  onSelectJob?: (job: JobPlan) => void;
  selectedJobId?: string | null;
}

export function CombinedJobsView({
  jobs,
  onSelectJob,
  selectedJobId,
}: CombinedJobsViewProps) {
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  const [hoverSource, setHoverSource] = useState<"list" | "calendar" | null>(null);
  const [splitSize, setSplitSize] = usePersistentState(STORAGE_KEY, 40);

  const handleLayoutChange = useCallback(
    (sizes: number[]) => {
      if (sizes[0]) {
        setSplitSize(sizes[0]);
      }
    },
    [setSplitSize]
  );

  return (
    <JobHoverContext.Provider
      value={{ hoveredJobId, setHoveredJobId, hoverSource, setHoverSource }}
    >
      <div className="h-full bg-white rounded-xl border border-slate-200 overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          onLayout={handleLayoutChange}
          className="h-full"
        >
          <ResizablePanel defaultSize={splitSize} minSize={25} maxSize={60}>
            <SyncedListView
              jobs={jobs}
              onSelectJob={onSelectJob}
              selectedJobId={selectedJobId}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel minSize={40}>
            <SyncedCalendarView
              jobs={jobs}
              onSelectJob={onSelectJob}
              selectedJobId={selectedJobId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </JobHoverContext.Provider>
  );
}

// ============================================
// Synced List View
// ============================================
interface SyncedListViewProps {
  jobs: JobPlan[];
  onSelectJob?: (job: JobPlan) => void;
  selectedJobId?: string | null;
}

function SyncedListView({ jobs, onSelectJob, selectedJobId }: SyncedListViewProps) {
  const { hoveredJobId, setHoveredJobId, hoverSource, setHoverSource } =
    useContext(JobHoverContext);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort jobs: scheduled first (by date), then unscheduled
  const sortedJobs = useMemo(() => {
    const scheduled = jobs
      .filter((job) => job.plannedStartDate)
      .sort((a, b) => {
        const dateA = new Date(a.plannedStartDate!).getTime();
        const dateB = new Date(b.plannedStartDate!).getTime();
        return dateA - dateB;
      });
    const unscheduled = jobs.filter((job) => !job.plannedStartDate);
    return { scheduled, unscheduled };
  }, [jobs]);

  // Debounced scroll into view
  const scrollToJob = useDebouncedCallback((jobId: string) => {
    const row = rowRefs.current.get(jobId);
    if (row && containerRef.current) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 150);

  // Auto-scroll when hover comes from calendar
  useEffect(() => {
    if (hoveredJobId && hoverSource === "calendar") {
      scrollToJob(hoveredJobId);
    }
  }, [hoveredJobId, hoverSource, scrollToJob]);

  const handleMouseEnter = useCallback(
    (jobId: string) => {
      setHoverSource("list");
      setHoveredJobId(jobId);
    },
    [setHoverSource, setHoveredJobId]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredJobId(null);
    setHoverSource(null);
  }, [setHoveredJobId, setHoverSource]);

  const setRowRef = useCallback((jobId: string, el: HTMLElement | null) => {
    if (el) {
      rowRefs.current.set(jobId, el);
    } else {
      rowRefs.current.delete(jobId);
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wide shrink-0">
        <div className="w-1" />
        <div className="w-14">Status</div>
        <div className="flex-1">Job</div>
        <div className="w-16 text-right">Date</div>
      </div>

      {/* Scrollable List */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {/* Scheduled Jobs */}
        {sortedJobs.scheduled.map((job) => (
          <SyncedJobRow
            key={job.id}
            job={job}
            onSelect={() => onSelectJob?.(job)}
            isSelected={selectedJobId === job.id}
            isHovered={hoveredJobId === job.id}
            onMouseEnter={() => handleMouseEnter(job.id)}
            onMouseLeave={handleMouseLeave}
            setRef={(el) => setRowRef(job.id, el)}
          />
        ))}

        {/* Unscheduled Section */}
        {sortedJobs.unscheduled.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-slate-100 border-y border-slate-200 text-[10px] font-medium text-slate-500 uppercase tracking-wide sticky top-0 z-10">
              Unscheduled ({sortedJobs.unscheduled.length})
            </div>
            {sortedJobs.unscheduled.map((job) => (
              <SyncedJobRow
                key={job.id}
                job={job}
                onSelect={() => onSelectJob?.(job)}
                isSelected={selectedJobId === job.id}
                isHovered={hoveredJobId === job.id}
                onMouseEnter={() => handleMouseEnter(job.id)}
                onMouseLeave={handleMouseLeave}
                setRef={(el) => setRowRef(job.id, el)}
              />
            ))}
          </>
        )}

        {/* Empty State */}
        {jobs.length === 0 && (
          <div className="py-8 text-center text-slate-400">
            <p className="text-sm">No jobs found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Synced Job Row
// ============================================
interface SyncedJobRowProps {
  job: JobPlan;
  onSelect: () => void;
  isSelected: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  setRef: (el: HTMLElement | null) => void;
}

function SyncedJobRow({
  job,
  onSelect,
  isSelected,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  setRef,
}: SyncedJobRowProps) {
  const status = statusConfig[job.status];
  const priorityColor = priorityDot[job.priority];
  const formattedDateStr = formatDate(job.plannedStartDate);
  const isOverdueJob = isOverdue(job.plannedEndDate, job.status);

  return (
    <button
      ref={setRef}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 border-b border-slate-100 text-left transition-all duration-150",
        "hover:bg-slate-50 focus:outline-none focus:bg-slate-50",
        isSelected && "bg-orange-50 hover:bg-orange-50",
        isHovered && !isSelected && "bg-blue-50 scale-[1.01] shadow-sm"
      )}
    >
      {/* Priority Indicator */}
      <div className={cn("w-1 h-6 rounded-full flex-shrink-0", priorityColor)} />

      {/* Status Badge */}
      <span
        className={cn(
          "text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 w-12 text-center",
          status.bg,
          status.text
        )}
      >
        {status.label}
      </span>

      {/* Job Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-xs text-slate-900 truncate">{job.jobName}</p>
        <p className="text-[10px] text-slate-500 truncate">
          {job.locationName || `${job.totalDistance.toLocaleString()} ft`}
        </p>
      </div>

      {/* Date */}
      <div className="w-16 text-right flex-shrink-0">
        {formattedDateStr ? (
          <span
            className={cn(
              "text-xs",
              isOverdueJob ? "text-red-600 font-medium" : "text-slate-600"
            )}
          >
            {formattedDateStr}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </div>

      {/* Hazard Icon */}
      {hasHazards(job) && (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
      )}
    </button>
  );
}

// ============================================
// Synced Calendar View
// ============================================
interface SyncedCalendarViewProps {
  jobs: JobPlan[];
  onSelectJob?: (job: JobPlan) => void;
  selectedJobId?: string | null;
}

function SyncedCalendarView({
  jobs,
  onSelectJob,
  selectedJobId,
}: SyncedCalendarViewProps) {
  const { hoveredJobId, setHoveredJobId, hoverSource, setHoverSource } =
    useContext(JobHoverContext);
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Navigate months
  const navigateMonth = useCallback((direction: "prev" | "next") => {
    setIsTransitioning(true);
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
      return newDate;
    });
    setTimeout(() => setIsTransitioning(false), 200);
  }, []);

  const goToToday = useCallback(() => {
    setIsTransitioning(true);
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setTimeout(() => setIsTransitioning(false), 200);
  }, []);

  // Auto-navigate to hovered job's month when hover comes from list
  useEffect(() => {
    if (hoveredJobId && hoverSource === "list") {
      const job = jobs.find((j) => j.id === hoveredJobId);
      if (job?.plannedStartDate) {
        const jobDate = new Date(job.plannedStartDate);
        if (
          jobDate.getMonth() !== currentDate.getMonth() ||
          jobDate.getFullYear() !== currentDate.getFullYear()
        ) {
          setIsTransitioning(true);
          setCurrentDate(new Date(jobDate.getFullYear(), jobDate.getMonth(), 1));
          setTimeout(() => setIsTransitioning(false), 200);
        }
      }
    }
  }, [hoveredJobId, hoverSource, jobs, currentDate]);

  // Get hovered job's date for highlighting
  const hoveredJobDate = useMemo(() => {
    if (!hoveredJobId) return null;
    const job = jobs.find((j) => j.id === hoveredJobId);
    if (job?.plannedStartDate) {
      return new Date(job.plannedStartDate).toISOString().split("T")[0];
    }
    return null;
  }, [hoveredJobId, jobs]);

  // Get calendar grid data
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
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
  const getJobsForDate = useCallback(
    (date: Date) => {
      const dateStr = date.toISOString().split("T")[0];
      return jobs.filter((job) => {
        if (!job.plannedStartDate) return false;
        const startDate = new Date(job.plannedStartDate).toISOString().split("T")[0];
        const endDate = job.plannedEndDate
          ? new Date(job.plannedEndDate).toISOString().split("T")[0]
          : startDate;
        return dateStr >= startDate && dateStr <= endDate;
      });
    },
    [jobs]
  );

  const jobStartsOnDate = useCallback((job: JobPlan, date: Date) => {
    if (!job.plannedStartDate) return false;
    const startDate = new Date(job.plannedStartDate).toISOString().split("T")[0];
    const dateStr = date.toISOString().split("T")[0];
    return startDate === dateStr;
  }, []);

  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  const isCurrentMonth = useCallback(
    (date: Date) => {
      return date.getMonth() === currentDate.getMonth();
    },
    [currentDate]
  );

  const handleJobHover = useCallback(
    (jobId: string | null) => {
      if (jobId) {
        setHoverSource("calendar");
        setHoveredJobId(jobId);
      } else {
        setHoveredJobId(null);
        setHoverSource(null);
      }
    },
    [setHoverSource, setHoveredJobId]
  );

  // Unscheduled jobs
  const unscheduledJobs = useMemo(() => {
    return jobs.filter((job) => !job.plannedStartDate);
  }, [jobs]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth("prev")}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="h-7 px-2 text-xs"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth("next")}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="text-sm font-semibold text-slate-900">
          {currentDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h2>

        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-red-100 border border-red-400" />
            <span>Urgent</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-orange-100 border border-orange-400" />
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
        {WEEKDAYS.map((day, idx) => {
          const isWorkDay = idx >= 1 && idx <= 4;
          const isLastCol = idx === 6;
          return (
            <div
              key={day}
              className={cn(
                "py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide",
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
      <div
        className={cn(
          "flex-1 overflow-y-auto transition-opacity duration-200",
          isTransitioning && "opacity-50"
        )}
      >
        <div className="grid grid-cols-7 min-h-full">
          {calendarDays.map((date, index) => {
            const dayJobs = getJobsForDate(date);
            const today = isToday(date);
            const inMonth = isCurrentMonth(date);
            const isNonWorkDay =
              date.getDay() === 0 || date.getDay() === 5 || date.getDay() === 6;
            const isLastCol = index % 7 === 6;
            const dateStr = date.toISOString().split("T")[0];
            const isHighlightedDate = hoveredJobDate === dateStr;

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[80px] border-b border-slate-100 p-1",
                  !isLastCol && "border-r border-slate-100",
                  !inMonth && "bg-slate-50/50",
                  isNonWorkDay && inMonth && "bg-slate-100/30",
                  today && "bg-orange-50/50",
                  isHighlightedDate && "bg-blue-100/50 ring-1 ring-inset ring-blue-300"
                )}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={cn(
                      "text-[10px] font-medium w-5 h-5 flex items-center justify-center rounded-full",
                      today && "bg-orange-500 text-white",
                      !today && inMonth && "text-slate-700",
                      !today && !inMonth && "text-slate-400"
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {dayJobs.length > 2 && (
                    <span className="text-[9px] text-slate-400">
                      +{dayJobs.length - 2}
                    </span>
                  )}
                </div>

                {/* Job Blocks */}
                <div className="space-y-0.5">
                  {dayJobs.slice(0, 2).map((job) => {
                    const colors = priorityColors[job.priority];
                    const startsToday = jobStartsOnDate(job, date);
                    const isSelected = selectedJobId === job.id;
                    const isHovered = hoveredJobId === job.id;

                    return (
                      <button
                        key={job.id}
                        onClick={() => onSelectJob?.(job)}
                        onMouseEnter={() => handleJobHover(job.id)}
                        onMouseLeave={() => handleJobHover(null)}
                        className={cn(
                          "w-full text-left px-1 py-0.5 rounded text-[9px] font-medium truncate",
                          "border transition-all duration-150",
                          colors.bg,
                          colors.border,
                          colors.text,
                          isSelected && "ring-2 ring-orange-400 ring-offset-1",
                          isHovered && !isSelected && "ring-2 ring-blue-400 scale-105 shadow-sm",
                          !startsToday && "opacity-60 border-dashed"
                        )}
                        title={job.jobName}
                      >
                        <div className="flex items-center gap-0.5">
                          <span
                            className={cn(
                              "w-1 h-1 rounded-full flex-shrink-0",
                              statusColors[job.status]
                            )}
                          />
                          <span className="truncate">{job.jobName}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unscheduled Jobs */}
      {unscheduledJobs.length > 0 && (
        <div className="border-t border-slate-200 p-2 bg-slate-50 shrink-0">
          <h3 className="text-[10px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Unscheduled ({unscheduledJobs.length})
          </h3>
          <div className="flex flex-wrap gap-1">
            {unscheduledJobs.slice(0, 6).map((job) => {
              const colors = priorityColors[job.priority];
              const isSelected = selectedJobId === job.id;
              const isHovered = hoveredJobId === job.id;

              return (
                <button
                  key={job.id}
                  onClick={() => onSelectJob?.(job)}
                  onMouseEnter={() => handleJobHover(job.id)}
                  onMouseLeave={() => handleJobHover(null)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-medium",
                    "border transition-all duration-150",
                    colors.bg,
                    colors.border,
                    colors.text,
                    isSelected && "ring-2 ring-orange-400",
                    isHovered && !isSelected && "ring-2 ring-blue-400 scale-105"
                  )}
                >
                  {job.jobName}
                </button>
              );
            })}
            {unscheduledJobs.length > 6 && (
              <span className="text-[9px] text-slate-400 px-1 py-0.5">
                +{unscheduledJobs.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
