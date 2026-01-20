"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Search,
  X,
  Filter,
  Pencil,
  Trash2,
  Copy,
  Calendar,
  Flag,
  ChevronUp,
} from "lucide-react";
import { JobViewSwitcher, ViewMode } from "./job-view-switcher";
import { JobTimelineView } from "./job-timeline-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  startPoleId: string;
  endPoleId: string;
  totalDistance: number;
  actualFootage: number;
  status: JobPlanStatus;
  priority: JobPriority;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
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
  bgColor: string;
}

const columns: Column[] = [
  { id: "DRAFT", title: "Draft", icon: <FileText className="h-4 w-4" />, color: "bg-slate-100 border-slate-300", bgColor: "bg-slate-50" },
  { id: "READY", title: "Ready", icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-emerald-50 border-emerald-300", bgColor: "bg-emerald-25" },
  { id: "IN_PROGRESS", title: "In Progress", icon: <Clock className="h-4 w-4" />, color: "bg-blue-50 border-blue-300", bgColor: "bg-blue-25" },
  { id: "COMPLETED", title: "Completed", icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-green-50 border-green-300", bgColor: "bg-green-25" },
  { id: "CANCELLED", title: "Cancelled", icon: <XCircle className="h-4 w-4" />, color: "bg-red-50 border-red-300", bgColor: "bg-red-25" },
];

const priorityConfig: Record<JobPriority, { border: string; badge: string; label: string }> = {
  URGENT: { border: "border-l-4 border-l-red-500", badge: "bg-red-100 text-red-700", label: "Urgent" },
  HIGH: { border: "border-l-4 border-l-orange-500", badge: "bg-orange-100 text-orange-700", label: "High" },
  MEDIUM: { border: "border-l-4 border-l-blue-400", badge: "", label: "Medium" },
  LOW: { border: "border-l-4 border-l-slate-300", badge: "bg-slate-100 text-slate-600", label: "Low" },
};

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

// localStorage hook for collapsed columns
function useCollapsedColumns() {
  const [collapsed, setCollapsed] = useState<Record<JobPlanStatus, boolean>>({
    DRAFT: false,
    READY: false,
    IN_PROGRESS: false,
    COMPLETED: true,
    CANCELLED: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem("kanban-collapsed-columns");
    if (saved) {
      try {
        setCollapsed(JSON.parse(saved));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  const toggleColumn = (status: JobPlanStatus) => {
    setCollapsed((prev) => {
      const next = { ...prev, [status]: !prev[status] };
      localStorage.setItem("kanban-collapsed-columns", JSON.stringify(next));
      return next;
    });
  };

  return { collapsed, toggleColumn };
}

// Due date helper
function getDueDateStatus(dateStr: string | null): { label: string; className: string } | null {
  if (!dateStr) return null;
  
  const dueDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { label: "Overdue", className: "bg-red-100 text-red-700" };
  } else if (diffDays === 0) {
    return { label: "Due Today", className: "bg-orange-100 text-orange-700" };
  } else if (diffDays <= 3) {
    return { label: `Due in ${diffDays}d`, className: "bg-amber-100 text-amber-700" };
  } else {
    const formatted = dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { label: formatted, className: "bg-slate-100 text-slate-600" };
  }
}

export function JobKanbanBoard({
  onCreateNew,
  onSelectJob,
  selectedJobId,
  viewOnly = false,
}: JobKanbanBoardProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [draggedJob, setDraggedJob] = useState<JobPlan | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<JobPlanStatus | null>(null);
  const isMobile = useIsMobile();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<JobPriority | "ALL">("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [hazardsFilter, setHazardsFilter] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<JobPlan | null>(null);

  // View mode state (persisted in localStorage)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("jobBoardViewMode");
      if (saved === "kanban" || saved === "timeline" || saved === "list") {
        return saved;
      }
    }
    return "kanban";
  });

  // Persist view mode changes
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("jobBoardViewMode", mode);
  };

  // Refs for debounced name update
  const nameUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nameUpdateAbortRef = useRef<AbortController | null>(null);

  const canEdit = !viewOnly && !!session?.user?.role && ["MANAGER", "ADMIN", "SUPERUSER"].includes(session.user.role);
  const canDelete = !viewOnly && !!session?.user?.role && session.user.role !== "FIELD";

  // Fetch jobs with TanStack Query + background refetch
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const response = await fetch("/api/job-plans");
      if (!response.ok) throw new Error("Failed to fetch jobs");
      return response.json() as Promise<JobPlan[]>;
    },
    // Background refetch every 30 seconds for near-real-time updates
    refetchInterval: 30 * 1000,
    // Also refetch when tab becomes visible again
    refetchOnWindowFocus: true,
  });

  // Helper to refresh jobs
  const refetchJobs = () => queryClient.invalidateQueries({ queryKey: ["jobs"] });

  // Get unique assignees for filter dropdown
  const uniqueAssignees = Array.from(
    new Map(
      jobs.flatMap((j) => j.assignments.map((a) => [a.user.id, a.user]))
    ).values()
  );

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !job.jobName.toLowerCase().includes(query) &&
        !job.startPoleId.toLowerCase().includes(query) &&
        !job.endPoleId.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    // Priority filter
    if (priorityFilter !== "ALL" && job.priority !== priorityFilter) {
      return false;
    }
    // Assignee filter
    if (assigneeFilter !== "ALL" && !job.assignments.some((a) => a.user.id === assigneeFilter)) {
      return false;
    }
    // Hazards filter
    if (hazardsFilter && !hasHazards(job)) {
      return false;
    }
    return true;
  });

  const hasActiveFilters = searchQuery || priorityFilter !== "ALL" || assigneeFilter !== "ALL" || hazardsFilter;

  const clearFilters = () => {
    setSearchQuery("");
    setPriorityFilter("ALL");
    setAssigneeFilter("ALL");
    setHazardsFilter(false);
  };

  // Update job status mutation with optimistic update
  const updateStatusMutation = useMutation({
    mutationFn: async ({ jobId, newStatus }: { jobId: string; newStatus: JobPlanStatus }) => {
      const response = await fetch(`/api/job-plans/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onMutate: async ({ jobId, newStatus }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["jobs"] });
      // Snapshot previous value
      const previousJobs = queryClient.getQueryData<JobPlan[]>(["jobs"]);
      // Optimistically update
      queryClient.setQueryData<JobPlan[]>(["jobs"], (old) =>
        old?.map((job) => (job.id === jobId ? { ...job, status: newStatus } : job))
      );
      return { previousJobs };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousJobs) {
        queryClient.setQueryData(["jobs"], context.previousJobs);
      }
      console.error("Error updating job status:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const updateJobStatus = (jobId: string, newStatus: JobPlanStatus) => {
    updateStatusMutation.mutate({ jobId, newStatus });
  };

  // Update job name with debounce (keeping the debounce logic for rapid typing)
  const updateNameMutation = useMutation({
    mutationFn: async ({ jobId, newName }: { jobId: string; newName: string }) => {
      const response = await fetch(`/api/job-plans/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobName: newName }),
        signal: nameUpdateAbortRef.current?.signal,
      });
      if (!response.ok) throw new Error("Failed to update name");
      return response.json();
    },
    onError: (err) => {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Error updating job name:", err);
      refetchJobs();
    },
  });

  const updateJobName = (jobId: string, newName: string) => {
    // Optimistic update (immediate UI feedback)
    queryClient.setQueryData<JobPlan[]>(["jobs"], (old) =>
      old?.map((job) => (job.id === jobId ? { ...job, jobName: newName } : job))
    );

    // Debounce the actual API save
    if (nameUpdateTimeoutRef.current) {
      clearTimeout(nameUpdateTimeoutRef.current);
    }

    nameUpdateTimeoutRef.current = setTimeout(() => {
      if (nameUpdateAbortRef.current) {
        nameUpdateAbortRef.current.abort();
      }
      nameUpdateAbortRef.current = new AbortController();
      updateNameMutation.mutate({ jobId, newName });
    }, 500);
  };

  // Duplicate job mutation
  const duplicateMutation = useMutation({
    mutationFn: async (job: JobPlan) => {
      const response = await fetch(`/api/job-plans/${job.id}/duplicate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to duplicate job");
      return response.json() as Promise<JobPlan>;
    },
    onSuccess: (newJob) => {
      // Add new job to cache immediately
      queryClient.setQueryData<JobPlan[]>(["jobs"], (old) => [newJob, ...(old || [])]);
    },
    onError: (err) => {
      console.error("Error duplicating job:", err);
    },
  });

  const duplicateJob = (job: JobPlan) => {
    duplicateMutation.mutate(job);
  };

  // Delete job mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: async (job: JobPlan) => {
      const response = await fetch(`/api/job-plans/${job.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete job");
      return job.id;
    },
    onMutate: async (job) => {
      await queryClient.cancelQueries({ queryKey: ["jobs"] });
      const previousJobs = queryClient.getQueryData<JobPlan[]>(["jobs"]);
      queryClient.setQueryData<JobPlan[]>(["jobs"], (old) =>
        old?.filter((j) => j.id !== job.id)
      );
      return { previousJobs };
    },
    onError: (err, job, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(["jobs"], context.previousJobs);
      }
      console.error("Error deleting job:", err);
    },
    onSettled: () => {
      setDeleteDialogOpen(false);
      setJobToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const deleteJob = (job: JobPlan) => {
    deleteMutation.mutate(job);
  };

  const handleDragStart = (e: React.DragEvent, job: JobPlan) => {
    if (!canEdit) return;
    setDraggedJob(job);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", job.id);
    // Add scale effect
    const target = e.currentTarget as HTMLElement;
    target.style.transform = "scale(1.02)";
    target.style.opacity = "0.8";
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

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.transform = "";
    target.style.opacity = "";
    setDraggedJob(null);
    setDragOverColumn(null);
  };

  const getJobsByStatus = (status: JobPlanStatus) => {
    return filteredJobs.filter((job) => job.status === status);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <JobViewSwitcher currentView={viewMode} onViewChange={handleViewChange} />
          <span className="text-sm text-slate-500">
            {filteredJobs.length}{hasActiveFilters ? ` of ${jobs.length}` : ""} jobs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetchJobs} className="h-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {onCreateNew && !viewOnly && (
            <Button size="sm" onClick={onCreateNew} className="h-9 bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-1" />
              New Job
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search jobs, poles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn("h-10 gap-2", showFilters && "bg-slate-100")}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="h-5 w-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">
              {[priorityFilter !== "ALL", assigneeFilter !== "ALL", hazardsFilter].filter(Boolean).length}
            </span>
          )}
        </Button>
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border">
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as JobPriority | "ALL")}>
            <SelectTrigger className="w-32 h-9 bg-white">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-40 h-9 bg-white">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Assignees</SelectItem>
              {uniqueAssignees.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={hazardsFilter ? "default" : "outline"}
            size="sm"
            onClick={() => setHazardsFilter(!hazardsFilter)}
            className={cn("h-9 gap-1", hazardsFilter && "bg-amber-500 hover:bg-amber-600")}
          >
            <AlertTriangle className="h-4 w-4" />
            Hazards
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-slate-500">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Conditional View Based on Mode */}
      {viewMode === "timeline" ? (
        <JobTimelineView
          jobs={filteredJobs}
          onSelectJob={onSelectJob}
          selectedJobId={selectedJobId}
        />
      ) : viewMode === "list" || isMobile ? (
        <MobileListView
          jobs={filteredJobs}
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
          onUpdateName={updateJobName}
          onDuplicate={duplicateJob}
          onDelete={(job) => {
            setJobToDelete(job);
            setDeleteDialogOpen(true);
          }}
          selectedJobId={selectedJobId}
          canEdit={canEdit}
          canDelete={canDelete}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{jobToDelete?.jobName}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => jobToDelete && deleteJob(jobToDelete)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  onUpdateName: (jobId: string, name: string) => void;
  onDuplicate: (job: JobPlan) => void;
  onDelete: (job: JobPlan) => void;
  selectedJobId?: string | null;
  canEdit: boolean;
  canDelete: boolean;
  hasHazards: (job: JobPlan) => boolean;
  draggedJob: JobPlan | null;
  dragOverColumn: JobPlanStatus | null;
  handleDragStart: (e: React.DragEvent, job: JobPlan) => void;
  handleDragOver: (e: React.DragEvent, columnId: JobPlanStatus) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, columnId: JobPlanStatus) => void;
  handleDragEnd: (e: React.DragEvent) => void;
}

function DesktopKanbanView({
  columns,
  getJobsByStatus,
  onSelectJob,
  onUpdateName,
  onDuplicate,
  onDelete,
  selectedJobId,
  canEdit,
  canDelete,
  hasHazards,
  draggedJob,
  dragOverColumn,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragEnd,
}: DesktopKanbanViewProps) {
  const { collapsed, toggleColumn } = useCollapsedColumns();

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnJobs = getJobsByStatus(column.id);
        const isCollapsed = collapsed[column.id];

        return (
          <div
            key={column.id}
            className={cn(
              "flex-shrink-0 rounded-xl border-2 transition-all duration-200",
              column.color,
              isCollapsed ? "w-14" : "w-80",
              dragOverColumn === column.id && !isCollapsed && "ring-2 ring-orange-400 ring-offset-2"
            )}
            onDragOver={(e) => !isCollapsed && handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => !isCollapsed && handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div
              className={cn(
                "p-3 border-b border-slate-200/50 cursor-pointer select-none",
                isCollapsed && "flex flex-col items-center py-4"
              )}
              onClick={() => toggleColumn(column.id)}
            >
              <div className={cn("flex items-center justify-between", isCollapsed && "flex-col gap-2")}>
                <div className={cn("flex items-center gap-2", isCollapsed && "flex-col")}>
                  {column.icon}
                  {!isCollapsed && <span className="font-medium text-sm">{column.title}</span>}
                </div>
                <div className={cn("flex items-center gap-1", isCollapsed && "flex-col")}>
                  <span className={cn(
                    "text-xs text-slate-600 bg-white/60 px-2 py-0.5 rounded-full font-medium",
                    isCollapsed && "px-1.5"
                  )}>
                    {columnJobs.length}
                  </span>
                  {!isCollapsed && (
                    <ChevronUp className="h-4 w-4 text-slate-400 rotate-90" />
                  )}
                </div>
              </div>
              {isCollapsed && (
                <span className="text-xs text-slate-500 mt-2 [writing-mode:vertical-rl] rotate-180">
                  {column.title}
                </span>
              )}
            </div>

            {/* Column Content */}
            {!isCollapsed && (
              <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-320px)] overflow-y-auto">
                {/* Drop Placeholder */}
                {dragOverColumn === column.id && draggedJob && draggedJob.status !== column.id && (
                  <div className="h-24 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50/50 flex items-center justify-center text-sm text-orange-500">
                    Drop here
                  </div>
                )}

                {columnJobs.map((job) => (
                  <DesktopJobCard
                    key={job.id}
                    job={job}
                    onSelect={() => onSelectJob?.(job)}
                    onUpdateName={onUpdateName}
                    onDuplicate={() => onDuplicate(job)}
                    onDelete={() => onDelete(job)}
                    isSelected={selectedJobId === job.id}
                    isDragging={draggedJob?.id === job.id}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    hasHazards={hasHazards(job)}
                    handleDragStart={handleDragStart}
                    handleDragEnd={handleDragEnd}
                  />
                ))}

                {columnJobs.length === 0 && !dragOverColumn && (
                  <div className="flex items-center justify-center h-24 text-xs text-slate-400">
                    No jobs
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Desktop Job Card Component
// ============================================
interface DesktopJobCardProps {
  job: JobPlan;
  onSelect: () => void;
  onUpdateName: (jobId: string, name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isSelected: boolean;
  isDragging: boolean;
  canEdit: boolean;
  canDelete: boolean;
  hasHazards: boolean;
  handleDragStart: (e: React.DragEvent, job: JobPlan) => void;
  handleDragEnd: (e: React.DragEvent) => void;
}

function DesktopJobCard({
  job,
  onSelect,
  onUpdateName,
  onDuplicate,
  onDelete,
  isSelected,
  isDragging,
  canEdit,
  canDelete,
  hasHazards,
  handleDragStart,
  handleDragEnd,
}: DesktopJobCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(job.jobName);
  const inputRef = useRef<HTMLInputElement>(null);

  const priority = priorityConfig[job.priority];
  const dueStatus = getDueDateStatus(job.plannedEndDate);
  const progress = job.totalDistance > 0 ? Math.min(100, (job.actualFootage / job.totalDistance) * 100) : 0;

  const handleSaveName = () => {
    if (editName.trim() && editName !== job.jobName) {
      onUpdateName(job.id, editName.trim());
    } else {
      setEditName(job.jobName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setEditName(job.jobName);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => handleDragStart(e, job)}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "bg-white rounded-lg shadow-sm border border-slate-200 transition-all duration-150 relative group",
        priority.border,
        canEdit && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 scale-[1.02] shadow-lg",
        isSelected && "ring-2 ring-orange-400",
        "hover:shadow-md"
      )}
    >
      {/* Hover Actions */}
      {isHovered && canEdit && !isEditing && (
        <div className="absolute -top-2 right-2 flex gap-1 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="h-7 w-7 rounded bg-white shadow border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="h-7 w-7 rounded bg-white shadow border border-slate-200 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-7 w-7 rounded bg-white shadow border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 hover:border-red-300 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="p-3" onClick={isEditing ? undefined : onSelect}>
        {/* Drag Handle */}
        {canEdit && (
          <div className="flex items-center justify-center mb-1.5 text-slate-300">
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        {/* Header Row: Title + Priority */}
        <div className="flex items-start justify-between gap-2 mb-2">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={handleKeyDown}
              className="h-7 text-sm font-medium"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3
              className="font-medium text-sm text-slate-900 line-clamp-2 flex-1 cursor-text"
              onDoubleClick={(e) => {
                if (canEdit) {
                  e.stopPropagation();
                  setIsEditing(true);
                }
              }}
              title="Double-click to edit"
            >
              {job.jobName}
            </h3>
          )}
          {priority.badge && (
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", priority.badge)}>
              {priority.label}
            </span>
          )}
        </div>

        {/* Route Info */}
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            {job.startPoleId} → {job.endPoleId}
          </span>
        </div>

        {/* Distance */}
        <div className="text-xs text-slate-500 mb-2">
          {job.totalDistance.toLocaleString()} ft
        </div>

        {/* Badges Row */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {hasHazards && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              <AlertTriangle className="h-3 w-3" />
              Hazards
            </span>
          )}
          {dueStatus && (
            <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded", dueStatus.className)}>
              <Calendar className="h-3 w-3" />
              {dueStatus.label}
            </span>
          )}
        </div>

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

        {/* Progress Bar - Only for IN_PROGRESS */}
        {job.status === "IN_PROGRESS" && job.totalDistance > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, #f97316 0%, #22c55e ${Math.min(100, progress + 20)}%)`,
                }}
              />
            </div>
          </div>
        )}
      </div>
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
  const priority = priorityConfig[job.priority];
  const dueStatus = getDueDateStatus(job.plannedEndDate);
  const progress = job.totalDistance > 0 ? Math.min(100, (job.actualFootage / job.totalDistance) * 100) : 0;

  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-sm border border-slate-200 transition-all",
        priority.border,
        isSelected && "ring-2 ring-orange-400"
      )}
    >
      <div onClick={onSelect} className="cursor-pointer p-4 pb-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-base text-slate-900">{job.jobName}</h3>
          {priority.badge && (
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded", priority.badge)}>
              {priority.label}
            </span>
          )}
        </div>

        {/* Route and Distance */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <MapPin className="h-4 w-4" />
            <span>{job.startPoleId} → {job.endPoleId}</span>
          </div>
          <span className="text-sm text-slate-500">
            {job.totalDistance.toLocaleString()} ft
          </span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {hasHazards && (
            <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              <AlertTriangle className="h-4 w-4" />
              Hazards
            </span>
          )}
          {dueStatus && (
            <span className={cn("inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full", dueStatus.className)}>
              <Calendar className="h-4 w-4" />
              {dueStatus.label}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {job.status === "IN_PROGRESS" && job.totalDistance > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, #f97316 0%, #22c55e 100%)`,
                }}
              />
            </div>
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

      {/* Status Change */}
      {canEdit && (
        <div className="px-4 pb-4 pt-0">
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
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
