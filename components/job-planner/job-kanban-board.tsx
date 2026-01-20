"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  MapPin,
  Users,
  MessageSquare,
  GripVertical,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type JobPlanStatus = "DRAFT" | "READY" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

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
  status: JobPlanStatus;
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

interface Column {
  id: JobPlanStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
}

const columns: Column[] = [
  { id: "DRAFT", title: "Draft", icon: <FileText className="h-4 w-4" />, color: "bg-slate-100 border-slate-300" },
  { id: "READY", title: "Ready", icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-emerald-50 border-emerald-300" },
  { id: "IN_PROGRESS", title: "In Progress", icon: <Clock className="h-4 w-4" />, color: "bg-blue-50 border-blue-300" },
  { id: "COMPLETED", title: "Completed", icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-green-50 border-green-300" },
  { id: "CANCELLED", title: "Cancelled", icon: <XCircle className="h-4 w-4" />, color: "bg-red-50 border-red-300" },
];

interface JobKanbanBoardProps {
  onCreateNew?: () => void;
  onSelectJob?: (job: JobPlan) => void;
  selectedJobId?: string | null;
  viewOnly?: boolean;
}

// Mobile detection hook
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}

export function JobKanbanBoard({
  onCreateNew,
  onSelectJob,
  selectedJobId,
  viewOnly = false,
}: JobKanbanBoardProps) {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<JobPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedJob, setDraggedJob] = useState<JobPlan | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<JobPlanStatus | null>(null);
  const isMobile = useIsMobile();

  const canEdit = !viewOnly && !!session?.user?.role && ["MANAGER", "ADMIN", "SUPERUSER"].includes(session.user.role);

  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/job-plans");
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const updateJobStatus = async (jobId: string, newStatus: JobPlanStatus) => {
    try {
      const response = await fetch(`/api/job-plans/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId ? { ...job, status: newStatus } : job
          )
        );
      }
    } catch (error) {
      console.error("Error updating job status:", error);
    }
  };

  const handleDragStart = (e: React.DragEvent, job: JobPlan) => {
    if (!canEdit) return;
    setDraggedJob(job);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", job.id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: JobPlanStatus) => {
    e.preventDefault();
    if (!canEdit) return;
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: JobPlanStatus) => {
    e.preventDefault();
    if (!canEdit || !draggedJob) return;

    if (draggedJob.status !== columnId) {
      updateJobStatus(draggedJob.id, columnId);
    }

    setDraggedJob(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedJob(null);
    setDragOverColumn(null);
  };

  const getJobsByStatus = (status: JobPlanStatus) => {
    return jobs.filter((job) => job.status === status);
  };

  const hasHazards = (job: JobPlan) => {
    return job.trafficControl || job.treeTrimming || job.animalHazards || job.waterRailCrossing;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Job Board</h2>
          <span className="text-sm text-slate-500">({jobs.length} jobs)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchJobs} className="h-10 px-3">
            <RefreshCw className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {onCreateNew && !viewOnly && (
            <Button size="sm" onClick={onCreateNew} className="h-10 px-3 bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">New Job</span>
            </Button>
          )}
        </div>
      </div>

      {/* Conditional View: Mobile List or Desktop Kanban */}
      {isMobile ? (
        <MobileListView
          jobs={jobs}
          columns={columns}
          onSelectJob={onSelectJob}
          onStatusChange={updateJobStatus}
          selectedJobId={selectedJobId}
          canEdit={canEdit}
          hasHazards={hasHazards}
        />
      ) : (
        <DesktopKanbanView
          columns={columns}
          getJobsByStatus={getJobsByStatus}
          onSelectJob={onSelectJob}
          selectedJobId={selectedJobId}
          canEdit={canEdit}
          hasHazards={hasHazards}
          draggedJob={draggedJob}
          dragOverColumn={dragOverColumn}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          handleDragEnd={handleDragEnd}
        />
      )}
    </div>
  );
}

// ============================================
// Desktop Kanban View Component
// ============================================
interface DesktopKanbanViewProps {
  columns: Column[];
  getJobsByStatus: (status: JobPlanStatus) => JobPlan[];
  onSelectJob?: (job: JobPlan) => void;
  selectedJobId?: string | null;
  canEdit: boolean;
  hasHazards: (job: JobPlan) => boolean;
  draggedJob: JobPlan | null;
  dragOverColumn: JobPlanStatus | null;
  handleDragStart: (e: React.DragEvent, job: JobPlan) => void;
  handleDragOver: (e: React.DragEvent, columnId: JobPlanStatus) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, columnId: JobPlanStatus) => void;
  handleDragEnd: () => void;
}

function DesktopKanbanView({
  columns,
  getJobsByStatus,
  onSelectJob,
  selectedJobId,
  canEdit,
  hasHazards,
  draggedJob,
  dragOverColumn,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragEnd,
}: DesktopKanbanViewProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className={cn(
            "flex-shrink-0 w-72 rounded-xl border-2 transition-colors",
            column.color,
            dragOverColumn === column.id && "ring-2 ring-orange-400"
          )}
          onDragOver={(e) => handleDragOver(e, column.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          {/* Column Header */}
          <div className="p-3 border-b border-slate-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {column.icon}
                <span className="font-medium text-sm">{column.title}</span>
              </div>
              <span className="text-xs text-slate-500 bg-white/50 px-2 py-0.5 rounded-full">
                {getJobsByStatus(column.id).length}
              </span>
            </div>
          </div>

          {/* Column Content */}
          <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
            {getJobsByStatus(column.id).map((job) => (
              <div
                key={job.id}
                draggable={canEdit ? true : undefined}
                onDragStart={(e) => handleDragStart(e, job)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectJob?.(job)}
                className={cn(
                  "bg-white rounded-lg p-3 shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all",
                  canEdit && "cursor-grab active:cursor-grabbing",
                  draggedJob?.id === job.id && "opacity-50",
                  selectedJobId === job.id && "ring-2 ring-orange-400"
                )}
              >
                {/* Drag Handle */}
                {canEdit && (
                  <div className="flex items-center justify-center mb-2 text-slate-300">
                    <GripVertical className="h-4 w-4" />
                  </div>
                )}

                {/* Job Name */}
                <h3 className="font-medium text-sm text-slate-900 mb-2 line-clamp-1">
                  {job.jobName}
                </h3>

                {/* Route Info */}
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">
                    {job.startPoleId} → {job.endPoleId}
                  </span>
                </div>

                {/* Distance */}
                <div className="text-xs text-slate-500 mb-2">
                  {job.totalDistance.toLocaleString()} ft
                </div>

                {/* Hazards indicator */}
                {hasHazards(job) && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 mb-2">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Hazards</span>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  {/* Assigned Users */}
                  <div className="flex items-center gap-1">
                    {job.assignments.length > 0 ? (
                      <div className="flex -space-x-1">
                        {job.assignments.slice(0, 3).map((assignment) => (
                          <div
                            key={assignment.id}
                            className="h-6 w-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-medium"
                            title={assignment.user.name || assignment.user.email}
                          >
                            {(assignment.user.name || assignment.user.email)[0].toUpperCase()}
                          </div>
                        ))}
                        {job.assignments.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[10px] font-medium">
                            +{job.assignments.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Users className="h-3 w-3" />
                        <span>Unassigned</span>
                      </div>
                    )}
                  </div>

                  {/* Comments Count */}
                  {job._count.comments > 0 && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <MessageSquare className="h-3 w-3" />
                      <span>{job._count.comments}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {getJobsByStatus(column.id).length === 0 && (
              <div className="flex items-center justify-center h-24 text-xs text-slate-400">
                No jobs
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Mobile List View Component
// ============================================
interface MobileListViewProps {
  jobs: JobPlan[];
  columns: Column[];
  onSelectJob?: (job: JobPlan) => void;
  onStatusChange: (jobId: string, newStatus: JobPlanStatus) => void;
  selectedJobId?: string | null;
  canEdit: boolean;
  hasHazards: (job: JobPlan) => boolean;
}

function MobileListView({
  jobs,
  columns,
  onSelectJob,
  onStatusChange,
  selectedJobId,
  canEdit,
  hasHazards,
}: MobileListViewProps) {
  // Track which sections are expanded - active statuses expanded by default
  const [expandedSections, setExpandedSections] = useState<Record<JobPlanStatus, boolean>>({
    DRAFT: true,
    READY: true,
    IN_PROGRESS: true,
    COMPLETED: false,
    CANCELLED: false,
  });

  const toggleSection = (status: JobPlanStatus) => {
    setExpandedSections((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const getJobsByStatus = (status: JobPlanStatus) => {
    return jobs.filter((job) => job.status === status);
  };

  return (
    <div className="space-y-3">
      {columns.map((column) => {
        const columnJobs = getJobsByStatus(column.id);
        const isExpanded = expandedSections[column.id];

        return (
          <div
            key={column.id}
            className={cn(
              "rounded-xl border-2 overflow-hidden transition-colors",
              column.color
            )}
          >
            {/* Section Header - Tap target 44px+ */}
            <button
              onClick={() => toggleSection(column.id)}
              className="w-full p-4 flex items-center justify-between min-h-[52px] active:bg-black/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8">
                  {column.icon}
                </div>
                <span className="font-semibold text-base">{column.title}</span>
                <span className="text-sm text-slate-500 bg-white/60 px-2.5 py-0.5 rounded-full">
                  {columnJobs.length}
                </span>
              </div>
              <div className="w-8 h-8 flex items-center justify-center">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Section Content - Animated */}
            <div
              className={cn(
                "transition-all duration-200 ease-in-out overflow-hidden",
                isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="px-3 pb-3 space-y-3">
                {columnJobs.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400">
                    No jobs in this status
                  </div>
                ) : (
                  columnJobs.map((job) => (
                    <MobileJobCard
                      key={job.id}
                      job={job}
                      columns={columns}
                      onSelect={() => onSelectJob?.(job)}
                      onStatusChange={onStatusChange}
                      isSelected={selectedJobId === job.id}
                      canEdit={canEdit}
                      hasHazards={hasHazards(job)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Mobile Job Card Component
// ============================================
interface MobileJobCardProps {
  job: JobPlan;
  columns: Column[];
  onSelect: () => void;
  onStatusChange: (jobId: string, newStatus: JobPlanStatus) => void;
  isSelected: boolean;
  canEdit: boolean;
  hasHazards: boolean;
}

function MobileJobCard({
  job,
  columns,
  onSelect,
  onStatusChange,
  isSelected,
  canEdit,
  hasHazards,
}: MobileJobCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl p-4 shadow-sm border border-slate-200 transition-all",
        isSelected && "ring-2 ring-orange-400"
      )}
    >
      {/* Tappable area for job selection - min 44px */}
      <div
        onClick={onSelect}
        className="cursor-pointer active:bg-slate-50 -m-4 p-4 mb-0 pb-3"
      >
        {/* Job Name */}
        <h3 className="font-semibold text-base text-slate-900 mb-2">
          {job.jobName}
        </h3>

        {/* Route and Distance Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <MapPin className="h-4 w-4" />
            <span>{job.startPoleId} → {job.endPoleId}</span>
          </div>
          <span className="text-sm text-slate-500">
            {job.totalDistance.toLocaleString()} ft
          </span>
        </div>

        {/* Hazards Badge */}
        {hasHazards && (
          <div className="inline-flex items-center gap-1.5 text-sm text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Hazards</span>
          </div>
        )}

        {/* Assignees and Comments */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {job.assignments.length > 0 ? (
              <div className="flex -space-x-1.5">
                {job.assignments.slice(0, 4).map((assignment) => (
                  <div
                    key={assignment.id}
                    className="h-7 w-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-medium"
                  >
                    {(assignment.user.name || assignment.user.email)[0].toUpperCase()}
                  </div>
                ))}
                {job.assignments.length > 4 && (
                  <div className="h-7 w-7 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-xs font-medium">
                    +{job.assignments.length - 4}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                <Users className="h-4 w-4" />
                <span>Unassigned</span>
              </div>
            )}
          </div>

          {job._count.comments > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <MessageSquare className="h-4 w-4" />
              <span>{job._count.comments}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Change Dropdown - Only if can edit */}
      {canEdit && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Status:</span>
            <Select
              value={job.status}
              onValueChange={(value) => onStatusChange(job.id, value as JobPlanStatus)}
            >
              <SelectTrigger className="w-36 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.id} className="py-2.5">
                    {col.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
