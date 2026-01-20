"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Plus,
  Loader2,
  Clock,
  Trash2,
  Edit2,
  X,
  Check,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface HoursLog {
  id: string;
  date: string;
  userId: string;
  userName: string | null;
  hours: number;
  notes: string | null;
  createdById: string;
  createdAt: string;
}

interface CrewHoursStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  refreshJob: () => Promise<void>;
  canEdit: boolean;
}

export function CrewHoursStep({ job, refreshJob, canEdit }: CrewHoursStepProps) {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<HoursLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");

  // User search
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Edit form state
  const [editHours, setEditHours] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/hours`);
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

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const users = await response.json();
        setSearchResults(users);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchUsers(userSearch);
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearch, searchUsers]);

  // Default to current user for field workers
  useEffect(() => {
    if (session?.user && session.user.role === "FIELD" && !selectedUser) {
      setSelectedUser({
        id: session.user.id!,
        name: session.user.name || null,
        email: session.user.email!,
      });
    }
  }, [session, selectedUser]);

  // Add new log
  const handleAdd = async () => {
    if (!selectedUser || !hours) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/hours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date.toISOString(),
          userId: selectedUser.id,
          userName: selectedUser.name || selectedUser.email,
          hours: Number(hours) || 0,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        await fetchLogs();
        await refreshJob();
        // Reset form (keep user selection for convenience)
        setHours("");
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
  const startEdit = (log: HoursLog) => {
    setEditingId(log.id);
    setEditHours(String(log.hours));
    setEditNotes(log.notes || "");
  };

  // Save edit
  const handleSaveEdit = async (logId: string) => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/hours/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hours: Number(editHours) || 0,
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
      const response = await fetch(`/api/job-plans/${job.id}/logs/hours/${logId}`, {
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

  // Group logs by user
  const logsByUser = logs.reduce((acc, log) => {
    const key = log.userName || log.userId;
    if (!acc[key]) {
      acc[key] = { logs: [], totalHours: 0 };
    }
    acc[key].logs.push(log);
    acc[key].totalHours += log.hours;
    return acc;
  }, {} as Record<string, { logs: HoursLog[]; totalHours: number }>);

  return (
    <div className="space-y-6">
      {/* Hours Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <Clock className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium text-slate-900">Total Crew Hours</h3>
        </div>

        <p className="text-3xl font-bold text-slate-900">
          {job.totalCrewHours.toLocaleString()} hours
        </p>

        {Object.keys(logsByUser).length > 0 && (
          <div className="mt-3 pt-3 border-t border-blue-100">
            <p className="text-xs text-slate-500 mb-2">By crew member:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(logsByUser).map(([name, data]) => (
                <span
                  key={name}
                  className="px-2 py-1 bg-white rounded text-xs text-slate-600"
                >
                  {name}: {data.totalHours}h
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add New Entry */}
      {canEdit && (
        <div className="border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Log Hours</h3>

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
                <Label htmlFor="hours">Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g., 8"
                  className="h-12 rounded-xl"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>

            {/* User Selection */}
            <div className="space-y-2">
              <Label>Crew Member</Label>
              {selectedUser ? (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {selectedUser.name?.[0] || selectedUser.email[0].toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {selectedUser.name || selectedUser.email}
                    </span>
                  </div>
                  {session?.user?.role !== "FIELD" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(null)}
                    >
                      Change
                    </Button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search crew member..."
                    className="pl-10 h-12 rounded-xl"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                  )}

                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setUserSearch("");
                            setSearchResults([]);
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left"
                        >
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-slate-600">
                              {user.name?.[0] || user.email[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {user.name || user.email}
                            </p>
                            {user.name && (
                              <p className="text-xs text-slate-500">{user.email}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Work description..."
                className="rounded-xl"
                rows={2}
              />
            </div>

            <Button
              onClick={handleAdd}
              disabled={isAdding || !selectedUser || !hours}
              className="w-full h-12 rounded-xl bg-blue-500 hover:bg-blue-600"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Log Hours
            </Button>
          </div>
        </div>
      )}

      {/* Log History */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">
          Hours Log ({logs.length} entries)
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-500">No hours logged yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="bg-slate-50 rounded-xl p-4">
                {editingId === log.id ? (
                  <div className="space-y-3">
                    <Input
                      type="number"
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                      placeholder="Hours"
                      className="h-10"
                      step="0.5"
                    />
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Notes"
                      rows={2}
                    />
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
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {log.userName || "Unknown"}
                        </p>
                        <span className="text-xs text-slate-400">•</span>
                        <p className="text-sm text-slate-600">
                          {new Date(log.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-slate-900">
                        {log.hours} hours
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
