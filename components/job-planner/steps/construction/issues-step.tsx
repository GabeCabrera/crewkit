"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Loader2,
  AlertCircle,
  Trash2,
  Edit2,
  X,
  Check,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";

interface IssueLog {
  id: string;
  date: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  resolved: boolean;
  resolvedAt: string | null;
  createdById: string;
  createdAt: string;
}

interface IssuesStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  refreshJob: () => Promise<void>;
  canEdit: boolean;
}

export function IssuesStep({ job, refreshJob, canEdit }: IssuesStepProps) {
  const [logs, setLogs] = useState<IssueLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");

  // Edit form state
  const [editDescription, setEditDescription] = useState("");
  const [editSeverity, setEditSeverity] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [editResolved, setEditResolved] = useState(false);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/issues`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [job.id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Add new log
  const handleAdd = async () => {
    if (!description.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date.toISOString(),
          description,
          severity,
        }),
      });

      if (response.ok) {
        await fetchLogs();
        // Reset form
        setDescription("");
        setSeverity("MEDIUM");
        setDate(new Date());
      }
    } catch (error) {
      console.error("Error adding log:", error);
    } finally {
      setIsAdding(false);
    }
  };

  // Start editing
  const startEdit = (log: IssueLog) => {
    setEditingId(log.id);
    setEditDescription(log.description);
    setEditSeverity(log.severity);
    setEditResolved(log.resolved);
  };

  // Save edit
  const handleSaveEdit = async (logId: string) => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/issues/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDescription,
          severity: editSeverity,
          resolved: editResolved,
        }),
      });

      if (response.ok) {
        await fetchLogs();
        setEditingId(null);
      }
    } catch (error) {
      console.error("Error updating log:", error);
    }
  };

  // Toggle resolved status
  const toggleResolved = async (log: IssueLog) => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/issues/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolved: !log.resolved,
        }),
      });

      if (response.ok) {
        await fetchLogs();
      }
    } catch (error) {
      console.error("Error toggling resolved:", error);
    }
  };

  // Delete log
  const handleDelete = async (logId: string) => {
    setDeletingId(logId);
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/issues/${logId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchLogs();
      }
    } catch (error) {
      console.error("Error deleting log:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "HIGH":
        return "text-red-600 bg-red-50";
      case "MEDIUM":
        return "text-amber-600 bg-amber-50";
      case "LOW":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-slate-600 bg-slate-50";
    }
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case "HIGH":
        return <AlertCircle className="h-4 w-4" />;
      case "MEDIUM":
        return <AlertTriangle className="h-4 w-4" />;
      case "LOW":
        return <Info className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const openIssues = logs.filter((l) => !l.resolved);
  const resolvedIssues = logs.filter((l) => l.resolved);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {logs.filter((l) => l.severity === "HIGH" && !l.resolved).length}
          </p>
          <p className="text-xs text-red-600">High Priority</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">
            {openIssues.length}
          </p>
          <p className="text-xs text-amber-600">Open Issues</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">
            {resolvedIssues.length}
          </p>
          <p className="text-xs text-emerald-600">Resolved</p>
        </div>
      </div>

      {/* Add New Issue */}
      {canEdit && (
        <div className="border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Report Issue</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <DatePicker
                  date={date}
                  onDateChange={(d) => d && setDate(d)}
                  placeholder="Select date"
                />
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={severity}
                  onValueChange={(v) => setSeverity(v as typeof severity)}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">
                      <span className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-500" />
                        Low
                      </span>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        High
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue or blocker..."
                className="rounded-xl"
                rows={3}
              />
            </div>

            <Button
              onClick={handleAdd}
              disabled={isAdding || !description.trim()}
              className="w-full h-12 rounded-xl bg-red-500 hover:bg-red-600"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Report Issue
            </Button>
          </div>
        </div>
      )}

      {/* Open Issues */}
      {openIssues.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3">
            Open Issues ({openIssues.length})
          </h3>
          <div className="space-y-2">
            {openIssues.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "rounded-xl p-4 border-l-4",
                  log.severity === "HIGH"
                    ? "bg-red-50 border-red-500"
                    : log.severity === "MEDIUM"
                    ? "bg-amber-50 border-amber-500"
                    : "bg-blue-50 border-blue-500"
                )}
              >
                {editingId === log.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                    />
                    <Select
                      value={editSeverity}
                      onValueChange={(v) => setEditSeverity(v as typeof editSeverity)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={editResolved}
                        onCheckedChange={(c) => setEditResolved(c === true)}
                      />
                      <span className="text-sm">Mark as resolved</span>
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(log.id)}>
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                            getSeverityColor(log.severity)
                          )}
                        >
                          {getSeverityIcon(log.severity)}
                          {log.severity}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(log.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{log.description}</p>
                    </div>

                    {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleResolved(log)}
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(log)}
                          className="h-8 w-8 text-slate-400 hover:text-slate-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(log.id)}
                          disabled={deletingId === log.id}
                          className="h-8 w-8 text-slate-400 hover:text-red-500"
                        >
                          {deletingId === log.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Issues */}
      {resolvedIssues.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3">
            Resolved ({resolvedIssues.length})
          </h3>
          <div className="space-y-2">
            {resolvedIssues.map((log) => (
              <div
                key={log.id}
                className="bg-slate-50 rounded-xl p-4 opacity-75"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-600">
                        <Check className="h-3 w-3" />
                        Resolved
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(log.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-through">
                      {log.description}
                    </p>
                  </div>

                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleResolved(log)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-6 text-center">
          <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No issues reported</p>
          <p className="text-xs text-slate-400 mt-1">
            Report any blockers or problems encountered during construction
          </p>
        </div>
      ) : null}
    </div>
  );
}
