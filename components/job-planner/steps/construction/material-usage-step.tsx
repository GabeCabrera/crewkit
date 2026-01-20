"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Plus,
  Loader2,
  Boxes,
  Trash2,
  Edit2,
  X,
  Check,
} from "lucide-react";
import type { JobPlanData } from "../../job-lifecycle-view";

interface MaterialLog {
  id: string;
  date: string;
  strand: number | null;
  fiber: number | null;
  deadEnds: number | null;
  tangents: number | null;
  anchors: number | null;
  notes: string | null;
  createdById: string;
  createdAt: string;
}

interface MaterialUsageStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  refreshJob: () => Promise<void>;
  canEdit: boolean;
}

export function MaterialUsageStep({ job, refreshJob, canEdit }: MaterialUsageStepProps) {
  const [logs, setLogs] = useState<MaterialLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [strand, setStrand] = useState("");
  const [fiber, setFiber] = useState("");
  const [deadEnds, setDeadEnds] = useState("");
  const [tangents, setTangents] = useState("");
  const [anchors, setAnchors] = useState("");
  const [notes, setNotes] = useState("");

  // Edit form state
  const [editStrand, setEditStrand] = useState("");
  const [editFiber, setEditFiber] = useState("");
  const [editDeadEnds, setEditDeadEnds] = useState("");
  const [editTangents, setEditTangents] = useState("");
  const [editAnchors, setEditAnchors] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/materials`);
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
    if (!strand && !fiber && !deadEnds && !tangents && !anchors) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date.toISOString(),
          strand: Number(strand) || null,
          fiber: Number(fiber) || null,
          deadEnds: Number(deadEnds) || null,
          tangents: Number(tangents) || null,
          anchors: Number(anchors) || null,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        await fetchLogs();
        await refreshJob();
        // Reset form
        setStrand("");
        setFiber("");
        setDeadEnds("");
        setTangents("");
        setAnchors("");
        setNotes("");
        setDate(new Date());
      }
    } catch (error) {
      console.error("Error adding log:", error);
    } finally {
      setIsAdding(false);
    }
  };

  // Start editing
  const startEdit = (log: MaterialLog) => {
    setEditingId(log.id);
    setEditStrand(String(log.strand || ""));
    setEditFiber(String(log.fiber || ""));
    setEditDeadEnds(String(log.deadEnds || ""));
    setEditTangents(String(log.tangents || ""));
    setEditAnchors(String(log.anchors || ""));
    setEditNotes(log.notes || "");
  };

  // Save edit
  const handleSaveEdit = async (logId: string) => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/materials/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strand: Number(editStrand) || null,
          fiber: Number(editFiber) || null,
          deadEnds: Number(editDeadEnds) || null,
          tangents: Number(editTangents) || null,
          anchors: Number(editAnchors) || null,
          notes: editNotes || null,
        }),
      });

      if (response.ok) {
        await fetchLogs();
        await refreshJob();
        setEditingId(null);
      }
    } catch (error) {
      console.error("Error updating log:", error);
    }
  };

  // Delete log
  const handleDelete = async (logId: string) => {
    setDeletingId(logId);
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/materials/${logId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchLogs();
        await refreshJob();
      }
    } catch (error) {
      console.error("Error deleting log:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Calculate usage percentages
  const strandUsage = job.strandFootage > 0 ? (job.actualStrandUsed / job.strandFootage) * 100 : 0;
  const fiberUsage = job.fiberFootage > 0 ? (job.actualFiberUsed / job.fiberFootage) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Usage Summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <Boxes className="h-5 w-5 text-emerald-600" />
          <h3 className="font-medium text-slate-900">Material Usage Summary</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-lg font-bold text-slate-900">
              {job.actualStrandUsed.toLocaleString()} ft
            </p>
            <p className="text-xs text-slate-500">
              Strand ({strandUsage.toFixed(0)}% of {job.strandFootage.toLocaleString()})
            </p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">
              {job.actualFiberUsed.toLocaleString()} ft
            </p>
            <p className="text-xs text-slate-500">
              Fiber ({fiberUsage.toFixed(0)}% of {job.fiberFootage.toLocaleString()})
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="flex gap-4 text-sm">
              <span className="text-slate-600">
                <strong>{job.actualDeadEnds}</strong>/{job.deadEnds} Dead-ends
              </span>
              <span className="text-slate-600">
                <strong>{job.actualTangents}</strong>/{job.tangents} Tangents
              </span>
              <span className="text-slate-600">
                <strong>{job.actualAnchors}</strong>/{job.anchors} Anchors
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Entry */}
      {canEdit && (
        <div className="border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Log Material Usage</h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <DatePicker
                date={date}
                onDateChange={(d) => d && setDate(d)}
                placeholder="Select date"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="strand">Strand (ft)</Label>
                <Input
                  id="strand"
                  type="number"
                  value={strand}
                  onChange={(e) => setStrand(e.target.value)}
                  placeholder="0"
                  className="h-10 rounded-xl"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiber">Fiber (ft)</Label>
                <Input
                  id="fiber"
                  type="number"
                  value={fiber}
                  onChange={(e) => setFiber(e.target.value)}
                  placeholder="0"
                  className="h-10 rounded-xl"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadEnds">Dead-ends</Label>
                <Input
                  id="deadEnds"
                  type="number"
                  value={deadEnds}
                  onChange={(e) => setDeadEnds(e.target.value)}
                  placeholder="0"
                  className="h-10 rounded-xl"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tangents">Tangents</Label>
                <Input
                  id="tangents"
                  type="number"
                  value={tangents}
                  onChange={(e) => setTangents(e.target.value)}
                  placeholder="0"
                  className="h-10 rounded-xl"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="anchors">Anchors</Label>
                <Input
                  id="anchors"
                  type="number"
                  value={anchors}
                  onChange={(e) => setAnchors(e.target.value)}
                  placeholder="0"
                  className="h-10 rounded-xl"
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about materials used..."
                className="rounded-xl"
                rows={2}
              />
            </div>

            <Button
              onClick={handleAdd}
              disabled={isAdding || (!strand && !fiber && !deadEnds && !tangents && !anchors)}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Entry
            </Button>
          </div>
        </div>
      )}

      {/* Log History */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">
          Usage Log ({logs.length} entries)
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-500">No material usage logged yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="bg-slate-50 rounded-xl p-4">
                {editingId === log.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        value={editStrand}
                        onChange={(e) => setEditStrand(e.target.value)}
                        placeholder="Strand"
                        className="h-9 text-sm"
                      />
                      <Input
                        type="number"
                        value={editFiber}
                        onChange={(e) => setEditFiber(e.target.value)}
                        placeholder="Fiber"
                        className="h-9 text-sm"
                      />
                      <Input
                        type="number"
                        value={editDeadEnds}
                        onChange={(e) => setEditDeadEnds(e.target.value)}
                        placeholder="Dead-ends"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(log.id)}>
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(log.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600 mt-1">
                        {log.strand && <span>{log.strand}ft strand</span>}
                        {log.fiber && <span>{log.fiber}ft fiber</span>}
                        {log.deadEnds && <span>{log.deadEnds} dead-ends</span>}
                        {log.tangents && <span>{log.tangents} tangents</span>}
                        {log.anchors && <span>{log.anchors} anchors</span>}
                      </div>
                      {log.notes && (
                        <p className="text-xs text-slate-500 mt-1">{log.notes}</p>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex gap-1">
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
        )}
      </div>
    </div>
  );
}
