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
  TrendingUp,
  Trash2,
  Edit2,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";

interface ProgressLog {
  id: string;
  date: string;
  footage: number;
  poles: number;
  notes: string | null;
  createdById: string;
  createdAt: string;
}

interface DailyProgressStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  refreshJob: () => Promise<void>;
  canEdit: boolean;
}

export function DailyProgressStep({ job, refreshJob, canEdit }: DailyProgressStepProps) {
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [footage, setFootage] = useState("");
  const [poles, setPoles] = useState("");
  const [notes, setNotes] = useState("");

  // Edit form state
  const [editFootage, setEditFootage] = useState("");
  const [editPoles, setEditPoles] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/progress`);
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
    if (!footage && !poles) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date.toISOString(),
          footage: Number(footage) || 0,
          poles: Number(poles) || 0,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        await fetchLogs();
        await refreshJob();
        // Reset form
        setFootage("");
        setPoles("");
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
  const startEdit = (log: ProgressLog) => {
    setEditingId(log.id);
    setEditFootage(String(log.footage));
    setEditPoles(String(log.poles));
    setEditNotes(log.notes || "");
  };

  // Save edit
  const handleSaveEdit = async (logId: string) => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/progress/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          footage: Number(editFootage) || 0,
          poles: Number(editPoles) || 0,
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
      const response = await fetch(`/api/job-plans/${job.id}/logs/progress/${logId}`, {
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

  const progressPercentage = job.totalDistance > 0 
    ? Math.min((job.actualFootage / job.totalDistance) * 100, 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <TrendingUp className="h-5 w-5 text-orange-600" />
          <h3 className="font-medium text-slate-900">Overall Progress</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {job.actualFootage.toLocaleString()} ft
            </p>
            <p className="text-sm text-slate-500">
              of {job.totalDistance.toLocaleString()} ft planned
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {job.actualPolesComplete}
            </p>
            <p className="text-sm text-slate-500">poles completed</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-white rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1 text-right">
          {progressPercentage.toFixed(1)}% complete
        </p>
      </div>

      {/* Add New Entry */}
      {canEdit && (
        <div className="border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Add Daily Entry</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <DatePicker
                  date={date}
                  onDateChange={(d) => d && setDate(d)}
                  placeholder="Select date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footage">Footage</Label>
                <Input
                  id="footage"
                  type="number"
                  value={footage}
                  onChange={(e) => setFootage(e.target.value)}
                  placeholder="0"
                  className="h-12 rounded-xl"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poles">Poles</Label>
                <Input
                  id="poles"
                  type="number"
                  value={poles}
                  onChange={(e) => setPoles(e.target.value)}
                  placeholder="0"
                  className="h-12 rounded-xl"
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
                placeholder="Any notes about today's progress..."
                className="rounded-xl"
                rows={2}
              />
            </div>

            <Button
              onClick={handleAdd}
              disabled={isAdding || (!footage && !poles)}
              className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600"
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
          Daily Log ({logs.length} entries)
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-500">No progress logged yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-50 rounded-xl p-4"
              >
                {editingId === log.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        value={editFootage}
                        onChange={(e) => setEditFootage(e.target.value)}
                        placeholder="Footage"
                        className="h-10 rounded-lg"
                      />
                      <Input
                        type="number"
                        value={editPoles}
                        onChange={(e) => setEditPoles(e.target.value)}
                        placeholder="Poles"
                        className="h-10 rounded-lg"
                      />
                    </div>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Notes"
                      rows={2}
                      className="rounded-lg"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(log.id)}
                        className="flex-1"
                      >
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
                  // View mode
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(log.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-slate-600">
                        {log.footage.toLocaleString()} ft • {log.poles} poles
                      </p>
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
