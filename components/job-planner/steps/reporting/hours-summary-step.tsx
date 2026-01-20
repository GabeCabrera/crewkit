"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Loader2, Users } from "lucide-react";
import type { JobPlanData } from "../../job-lifecycle-view";

interface HoursLog {
  id: string;
  date: string;
  userId: string;
  userName: string | null;
  hours: number;
  notes: string | null;
}

interface HoursSummaryStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function HoursSummaryStep({ job }: HoursSummaryStepProps) {
  const [logs, setLogs] = useState<HoursLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Group logs by user
  const byUser = logs.reduce((acc, log) => {
    const key = log.userName || log.userId;
    if (!acc[key]) {
      acc[key] = { totalHours: 0, entries: 0 };
    }
    acc[key].totalHours += log.hours;
    acc[key].entries += 1;
    return acc;
  }, {} as Record<string, { totalHours: number; entries: number }>);

  // Group logs by date
  const byDate = logs.reduce((acc, log) => {
    const dateKey = new Date(log.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    if (!acc[dateKey]) {
      acc[dateKey] = 0;
    }
    acc[dateKey] += log.hours;
    return acc;
  }, {} as Record<string, number>);

  const sortedDates = Object.entries(byDate).sort((a, b) => {
    return new Date(a[0]).getTime() - new Date(b[0]).getTime();
  });

  const crewCount = Object.keys(byUser).length;
  const avgHoursPerPerson = crewCount > 0 ? job.totalCrewHours / crewCount : 0;

  // Calculate productivity
  const productivityRate = job.totalCrewHours > 0 
    ? job.actualFootage / job.totalCrewHours 
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <Clock className="h-5 w-5 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{job.totalCrewHours.toLocaleString()}</p>
          <p className="text-xs text-blue-100">Total Hours</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <Users className="h-5 w-5 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{crewCount}</p>
          <p className="text-xs text-purple-100">Crew Members</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
          <p className="text-2xl font-bold">{avgHoursPerPerson.toFixed(1)}</p>
          <p className="text-xs text-emerald-100">Avg Hours/Person</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <p className="text-2xl font-bold">{productivityRate.toFixed(1)}</p>
          <p className="text-xs text-orange-100">Ft/Hour</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-6 text-center">
          <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No hours logged</p>
        </div>
      ) : (
        <>
          {/* By Crew Member */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-medium text-slate-900">Hours by Crew Member</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {Object.entries(byUser)
                .sort((a, b) => b[1].totalHours - a[1].totalHours)
                .map(([name, data]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {name[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{name}</p>
                        <p className="text-xs text-slate-500">
                          {data.entries} {data.entries === 1 ? "entry" : "entries"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        {data.totalHours.toLocaleString()} hrs
                      </p>
                      <p className="text-xs text-slate-500">
                        {((data.totalHours / job.totalCrewHours) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Hours by Date */}
          {sortedDates.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="font-medium text-slate-900">Hours by Date</h3>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {sortedDates.map(([date, hours]) => {
                    const percentage = (hours / job.totalCrewHours) * 100;
                    return (
                      <div key={date} className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 w-16 shrink-0">
                          {date}
                        </span>
                        <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(percentage, 10)}%` }}
                          >
                            <span className="text-xs text-white font-medium">
                              {hours}h
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Note */}
      <p className="text-sm text-slate-500">
        Hours are tracked from the Crew Hours step in the Construction phase.
        Productivity rate is calculated as total footage completed divided by total crew hours.
      </p>
    </div>
  );
}
