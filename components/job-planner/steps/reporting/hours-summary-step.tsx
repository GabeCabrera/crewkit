"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Clock, Loader2, Users, RefreshCw, AlertCircle, Calendar, X } from "lucide-react";
import type { JobPlanData } from "../../job-lifecycle-view";
import { ReportExportButton } from "./report-export-button";
import type { JobReportData, HoursLogData } from "@/lib/report-export";

export interface HoursLog {
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
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Date filter state
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch logs
  const fetchLogs = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      }
      setError(null);
      const response = await fetch(`/api/job-plans/${job.id}/logs/hours`);
      if (!response.ok) {
        throw new Error(`Failed to fetch hours: ${response.statusText}`);
      }
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError(err instanceof Error ? err.message : "Failed to load hours data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [job.id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = () => {
    fetchLogs(true);
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = dateFrom || dateTo;

  // Filter logs by date range
  const filteredLogs = useMemo(() => {
    if (!dateFrom && !dateTo) return logs;
    
    return logs.filter((log) => {
      const logDate = new Date(log.date).toISOString().split('T')[0];
      if (dateFrom && logDate < dateFrom) return false;
      if (dateTo && logDate > dateTo) return false;
      return true;
    });
  }, [logs, dateFrom, dateTo]);

  // Calculate filtered totals
  const filteredTotalHours = useMemo(() => 
    filteredLogs.reduce((sum, log) => sum + log.hours, 0),
    [filteredLogs]
  );

  // Group filtered logs by user
  const byUser = useMemo(() => filteredLogs.reduce((acc, log) => {
    const key = log.userName || log.userId;
    if (!acc[key]) {
      acc[key] = { totalHours: 0, entries: 0 };
    }
    acc[key].totalHours += log.hours;
    acc[key].entries += 1;
    return acc;
  }, {} as Record<string, { totalHours: number; entries: number }>), [filteredLogs]);

  // Group filtered logs by date - use ISO date string as key for proper sorting
  const byDate = useMemo(() => filteredLogs.reduce((acc, log) => {
    // Normalize to date-only ISO string (YYYY-MM-DD) for consistent grouping
    const dateObj = new Date(log.date);
    const dateKey = dateObj.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = 0;
    }
    acc[dateKey] += log.hours;
    return acc;
  }, {} as Record<string, number>), [filteredLogs]);

  // Sort by actual date values, then format for display
  const sortedDates = useMemo(() => Object.entries(byDate)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([isoDate, hours]) => ({
      isoDate,
      displayDate: new Date(isoDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      hours,
    })), [byDate]);

  const crewCount = Object.keys(byUser).length;
  // Use filtered total when filters are active, otherwise use job total
  const displayTotalHours = hasActiveFilters ? filteredTotalHours : job.totalCrewHours;
  const avgHoursPerPerson = crewCount > 0 ? displayTotalHours / crewCount : 0;

  // Calculate productivity (always based on job totals for consistency)
  const productivityRate = job.totalCrewHours > 0 
    ? job.actualFootage / job.totalCrewHours 
    : 0;

  // Convert data for export
  const reportData: JobReportData = useMemo(() => ({
    id: job.id,
    jobName: job.jobName,
    jobNumber: job.jobNumber,
    locationName: job.locationName,
    locationAddress: job.locationAddress,
    status: job.status,
    totalDistance: job.totalDistance,
    strandFootage: job.strandFootage,
    fiberFootage: job.fiberFootage,
    deadEnds: job.deadEnds,
    tangents: job.tangents,
    anchors: job.anchors,
    poleCount: job.poleCount,
    actualFootage: job.actualFootage,
    actualPolesComplete: job.actualPolesComplete,
    actualStrandUsed: job.actualStrandUsed,
    actualFiberUsed: job.actualFiberUsed,
    actualDeadEnds: job.actualDeadEnds,
    actualTangents: job.actualTangents,
    actualAnchors: job.actualAnchors,
    totalCrewHours: job.totalCrewHours,
    foremanSignoff: job.foremanSignoff,
    signoffDate: job.signoffDate,
    lessonsLearned: job.lessonsLearned,
    completedAt: job.completedAt,
  }), [job]);

  // Convert hours logs for export (use filtered logs if filters are active)
  const exportHoursLogs: HoursLogData[] = useMemo(() => 
    filteredLogs.map((log) => ({
      id: log.id,
      date: log.date,
      userId: log.userId,
      userName: log.userName,
      hours: log.hours,
      notes: log.notes,
    })), 
    [filteredLogs]
  );

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Hours Summary</h3>
            <p className="text-sm text-slate-500">
              Crew hours breakdown for this job
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              hasActiveFilters 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="h-4 w-4" />
            {hasActiveFilters ? 'Filtered' : 'Filter'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <ReportExportButton 
            job={reportData} 
            reportType="hours-summary" 
            hoursLogs={exportHoursLogs}
          />
        </div>
      </div>

      {/* Date Filters */}
      {showFilters && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <p className="mt-3 text-xs text-slate-500">
              Showing {filteredLogs.length} of {logs.length} entries ({filteredTotalHours.toLocaleString()} hours)
            </p>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <Clock className="h-5 w-5 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{displayTotalHours.toLocaleString()}</p>
          <p className="text-xs text-blue-100">
            {hasActiveFilters ? 'Filtered Hours' : 'Total Hours'}
          </p>
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

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-900">Failed to load hours data</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-3 text-sm font-medium text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : !error && filteredLogs.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-6 text-center">
          <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            {hasActiveFilters ? 'No hours match the selected date range' : 'No hours logged yet'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {hasActiveFilters 
              ? 'Try adjusting your date filters or clear them to see all hours.'
              : 'Hours will appear here once crew members log their time in the Construction phase.'
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : !error && (
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
                        {displayTotalHours > 0 ? ((data.totalHours / displayTotalHours) * 100).toFixed(0) : 0}%
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
                  {sortedDates.map(({ isoDate, displayDate, hours }) => {
                    const percentage = displayTotalHours > 0 ? (hours / displayTotalHours) * 100 : 0;
                    return (
                      <div key={isoDate} className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 w-16 shrink-0">
                          {displayDate}
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
