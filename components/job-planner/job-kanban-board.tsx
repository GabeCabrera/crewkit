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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const canDrag = !viewOnly && session?.user?.role && ["MANAGER", "ADMIN", "SUPERUSER"].includes(session.user.role);

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
    if (!canDrag) return;
    setDraggedJob(job);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", job.id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: JobPlanStatus) => {
    e.preventDefault();
    if (!canDrag) return;
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: JobPlanStatus) => {
    e.preventDefault();
    if (!canDrag || !draggedJob) return;

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
          <Button variant="outline" size="sm" onClick={fetchJobs}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {onCreateNew && !viewOnly && (
            <Button size="sm" onClick={onCreateNew} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-1" />
              New Job
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
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
                  draggable={canDrag ? true : undefined}
                  onDragStart={(e) => handleDragStart(e, job)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectJob?.(job)}
                  className={cn(
                    "bg-white rounded-lg p-3 shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all",
                    canDrag && "cursor-grab active:cursor-grabbing",
                    draggedJob?.id === job.id && "opacity-50",
                    selectedJobId === job.id && "ring-2 ring-orange-400"
                  )}
                >
                  {/* Drag Handle */}
                  {canDrag && (
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
    </div>
  );
}
