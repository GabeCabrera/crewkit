"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  X,
  Printer,
  MapPin,
  Package,
  AlertTriangle,
  CheckCircle2,
  Users,
  UserPlus,
  Trash2,
  Car,
  TreePine,
  Bug,
  Waves,
  Maximize2,
  Info,
  FileText,
  Image as ImageIcon,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobComments } from "./job-comments";
import { cn } from "@/lib/utils";
import { getAvailableStatusOptions, JobPlanStatus } from "@/lib/validations";

interface Assignment {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  assignedBy: {
    id: string;
    name: string | null;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface PermitDocument {
  id: string;
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

interface JobPlanDetail {
  id: string;
  jobName: string;
  jobNumber: string | null;
  locationName: string | null;
  vetroProjectUrl: string | null;
  totalDistance: number;
  poleCount: number;
  strandFootage: number;
  fiberFootage: number;
  deadEnds: number;
  tangents: number;
  anchors: number;
  // Legacy permit fields (kept for backwards compatibility)
  rmpPermitApproved: boolean;
  sesdPermitApproved: boolean;
  makeReadyComplete: boolean;
  easementsClear: boolean;
  // Dynamic permits
  permits?: JobPermit[];
  trafficControl: boolean;
  treeTrimming: boolean;
  animalHazards: boolean;
  waterRailCrossing: boolean;
  foremanNotes: string | null;
  plannedStartDate: string | null;
  status: JobPlanStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  assignments: Assignment[];
}

interface JobDetailPanelProps {
  jobId: string;
  onClose: () => void;
  onUpdate?: () => void;
  basePath?: string; // e.g., "/admin/jobs" or "/manager/jobs"
}

const statusOptions: { value: JobPlanStatus; label: string; color: string }[] = [
  { value: "DRAFT", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "READY", label: "Ready", color: "bg-emerald-100 text-emerald-700" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-green-100 text-green-700" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-700" },
];

export function JobDetailPanel({ jobId, onClose, onUpdate, basePath = "/admin/jobs" }: JobDetailPanelProps) {
  const { data: session } = useSession();
  const [job, setJob] = useState<JobPlanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [expandedPermits, setExpandedPermits] = useState<Set<string>>(new Set());

  const canManage = session?.user?.role && ["MANAGER", "ADMIN", "SUPERUSER"].includes(session.user.role);

  // Get available status options based on current job state
  const availableStatuses = useMemo(() => {
    if (!job) return [];
    return getAvailableStatusOptions({
      status: job.status,
      rmpPermitApproved: job.rmpPermitApproved,
      sesdPermitApproved: job.sesdPermitApproved,
      makeReadyComplete: job.makeReadyComplete,
      easementsClear: job.easementsClear,
      // Include dynamic permits for validation
      permits: job.permits?.map(p => ({ id: p.id, isApproved: p.isApproved })),
      jobName: job.jobName,
      jobNumber: job.jobNumber,
      locationName: job.locationName,
      vetroProjectUrl: job.vetroProjectUrl,
      totalDistance: job.totalDistance,
      poleCount: job.poleCount,
      plannedStartDate: job.plannedStartDate,
      assignments: job.assignments,
    });
  }, [job]);

  const fetchJob = useCallback(async () => {
    try {
      const response = await fetch(`/api/job-plans/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setJob(data);
      }
    } catch (error) {
      console.error("Error fetching job:", error);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users/search?limit=50");
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  useEffect(() => {
    fetchJob();
    if (canManage) {
      fetchUsers();
    }
  }, [fetchJob, fetchUsers, canManage]);

  const updateStatus = async (newStatus: JobPlanStatus) => {
    setStatusError(null);
    try {
      const response = await fetch(`/api/job-plans/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setJob((prev) => prev ? { ...prev, status: newStatus } : null);
        onUpdate?.();
      } else {
        const errorData = await response.json();
        setStatusError(errorData.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      setStatusError("Failed to update status");
    }
  };

  const assignUser = async () => {
    if (!selectedUserId) return;
    setIsAssigning(true);

    try {
      const response = await fetch(`/api/job-plans/${jobId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [selectedUserId] }),
      });

      if (response.ok) {
        fetchJob();
        setSelectedUserId("");
        onUpdate?.();
      }
    } catch (error) {
      console.error("Error assigning user:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  const removeAssignment = async (userId: string) => {
    try {
      const response = await fetch(`/api/job-plans/${jobId}/assign?userId=${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchJob();
        onUpdate?.();
      }
    } catch (error) {
      console.error("Error removing assignment:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-slate-400">Job not found</div>
        </div>
      </div>
    );
  }

  const activeHazards = [
    job.trafficControl && { icon: Car, label: "Traffic Control" },
    job.treeTrimming && { icon: TreePine, label: "Tree Trimming" },
    job.animalHazards && { icon: Bug, label: "Animal Hazards" },
    job.waterRailCrossing && { icon: Waves, label: "Water/Rail Crossing" },
  ].filter(Boolean) as { icon: typeof Car; label: string }[];

  const unassignedUsers = availableUsers.filter(
    (user) => !job.assignments.some((a) => a.user.id === user.id)
  );

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-slate-50 no-print">
        <h2 className="text-lg font-semibold text-slate-900 truncate pr-4">
          {job.jobName}
        </h2>
        <div className="flex items-center gap-2">
          <Link href={`${basePath}/${jobId}`}>
            <Button variant="outline" size="sm" title="Open full view">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Status */}
          <div className="no-print">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Status
            </label>
            {canManage ? (
              <Select value={job.status} onValueChange={updateStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => {
                    const availability = availableStatuses.find(s => s.status === option.value);
                    const isDisabled = availability ? !availability.available : false;
                    
                    return (
                      <SelectItem 
                        key={option.value}
                        value={option.value} 
                        disabled={isDisabled}
                        className={cn(isDisabled && "opacity-50")}
                      >
                        <div className="flex items-center gap-2">
                          <Badge className={cn("font-normal", option.color)}>
                            {option.label}
                          </Badge>
                          {isDisabled && (
                            <Info className="h-3 w-3 text-slate-400" />
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Badge className={cn("mt-1", statusOptions.find(s => s.value === job.status)?.color)}>
                {statusOptions.find(s => s.value === job.status)?.label}
              </Badge>
            )}
            {/* Status Error Message */}
            {statusError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {statusError}
                </p>
              </div>
            )}
          </div>

          {/* Route Information */}
          <div className="job-card">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Route Information</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Location</p>
                <p className="font-medium">{job.locationName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Distance</p>
                <p className="font-medium">{job.totalDistance.toLocaleString()} ft</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Poles</p>
                <p className="font-medium">{job.poleCount || "—"}</p>
              </div>
            </div>
          </div>

          {/* Materials */}
          <div className="job-card">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Materials Required</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-500">Strand</p>
                <p className="font-medium">{job.strandFootage.toLocaleString()} ft</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-500">Fiber (w/ slack)</p>
                <p className="font-medium">{job.fiberFootage.toLocaleString()} ft</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center bg-slate-50 rounded-lg p-2">
                <p className="text-lg font-bold">{job.deadEnds}</p>
                <p className="text-xs text-slate-500">Dead-ends</p>
              </div>
              <div className="text-center bg-slate-50 rounded-lg p-2">
                <p className="text-lg font-bold">{job.tangents}</p>
                <p className="text-xs text-slate-500">Tangents</p>
              </div>
              <div className="text-center bg-slate-50 rounded-lg p-2">
                <p className="text-lg font-bold">{job.anchors}</p>
                <p className="text-xs text-slate-500">Anchors</p>
              </div>
            </div>
          </div>

          {/* Hazards */}
          {activeHazards.length > 0 && (
            <div className="job-card">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Hazards & Requirements</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeHazards.map((hazard) => (
                  <Badge key={hazard.label} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <hazard.icon className="h-3 w-3 mr-1" />
                    {hazard.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Foreman Notes */}
          {job.foremanNotes && (
            <div className="job-card">
              <p className="text-xs text-slate-500 mb-1">Foreman Notes</p>
              <p className="text-sm whitespace-pre-wrap">{job.foremanNotes}</p>
            </div>
          )}

          {/* Permits */}
          <div className="job-card">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Permits</span>
              {job.permits && job.permits.length > 0 && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {job.permits.filter(p => p.isApproved).length}/{job.permits.length} approved
                </Badge>
              )}
            </div>
            
            {job.permits && job.permits.length > 0 ? (
              <div className="space-y-2">
                {job.permits.map((permit) => {
                  const isExpanded = expandedPermits.has(permit.id);
                  const hasDocuments = permit.documents.length > 0;
                  
                  return (
                    <div
                      key={permit.id}
                      className={cn(
                        "rounded-lg border overflow-hidden",
                        permit.isApproved ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"
                      )}
                    >
                      <div 
                        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-slate-50"
                        onClick={() => {
                          setExpandedPermits(prev => {
                            const next = new Set(prev);
                            if (next.has(permit.id)) {
                              next.delete(permit.id);
                            } else {
                              next.add(permit.id);
                            }
                            return next;
                          });
                        }}
                      >
                        <CheckCircle2 className={cn(
                          "h-4 w-4 shrink-0",
                          permit.isApproved ? "text-emerald-500" : "text-slate-300"
                        )} />
                        <span className={cn(
                          "text-sm flex-1",
                          permit.isApproved ? "text-slate-700" : "text-slate-500"
                        )}>
                          {permit.permitType.name}
                        </span>
                        {hasDocuments && (
                          <span className="text-xs text-slate-400">
                            {permit.documents.length} doc{permit.documents.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {(hasDocuments || permit.notes) && (
                          isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )
                        )}
                      </div>
                      
                      {isExpanded && (hasDocuments || permit.notes) && (
                        <div className="border-t border-slate-200 p-2 bg-white space-y-2">
                          {permit.notes && (
                            <p className="text-xs text-slate-600">{permit.notes}</p>
                          )}
                          {hasDocuments && (
                            <div className="space-y-1">
                              {permit.documents.map((doc) => (
                                <a
                                  key={doc.id}
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 text-sm"
                                >
                                  {doc.fileType.startsWith("image/") ? (
                                    <ImageIcon className="h-4 w-4 text-slate-400" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-slate-400" />
                                  )}
                                  <span className="flex-1 truncate text-slate-600">{doc.fileName}</span>
                                  <Download className="h-3 w-3 text-slate-400" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Fallback to legacy permit fields if no dynamic permits
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: "RMP Permit", checked: job.rmpPermitApproved },
                  { label: "SESD Permit", checked: job.sesdPermitApproved },
                  { label: "Make-Ready", checked: job.makeReadyComplete },
                  { label: "Easements", checked: job.easementsClear },
                ].map((permit) => (
                  <div key={permit.label} className="flex items-center gap-2">
                    <CheckCircle2 className={cn(
                      "h-4 w-4",
                      permit.checked ? "text-emerald-500" : "text-slate-300"
                    )} />
                    <span className={permit.checked ? "text-slate-700" : "text-slate-400"}>
                      {permit.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignments */}
          <div className="no-print">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium">Assigned Team</span>
            </div>

            {job.assignments.length > 0 ? (
              <div className="space-y-2 mb-3">
                {job.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium">
                        {(assignment.user.name || assignment.user.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {assignment.user.name || assignment.user.email}
                        </p>
                        <p className="text-xs text-slate-500">{assignment.user.email}</p>
                      </div>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAssignment(assignment.user.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 mb-3">No team members assigned</p>
            )}

            {canManage && unassignedUsers.length > 0 && (
              <div className="flex gap-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select user to assign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={assignUser}
                  disabled={!selectedUserId || isAssigning}
                  size="sm"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="no-print border-t pt-4">
            <JobComments jobPlanId={jobId} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-slate-50 no-print">
        <p className="text-xs text-slate-400">
          Created by {job.createdBy.name || job.createdBy.email} on{" "}
          {new Date(job.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
