"use client";

import { useState, useEffect } from "react";
import { FileText, TrendingUp, TrendingDown, Minus, ClipboardList, ExternalLink, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";
import { ReportExportButton } from "./report-export-button";
import type { JobReportData } from "@/lib/report-export";

interface FieldLogSummary {
  count: number;
  totalHours: number;
  totalFootage: number;
  totalPoles: number;
  dates: string[];
}

interface FieldLog {
  id: string;
  date: string;
  location: string;
  workersNames: string[];
  workerCount: number;
  hoursWorked: number;
  strandHungFootage: number | null;
  fiberLashedFootage: number | null;
  fiberPulledFootage: number | null;
  polesAttached: number | null;
  notes: string | null;
  syncedAt: string | null;
  submittedBy: string;
}

interface CompletionSummaryStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function CompletionSummaryStep({ job }: CompletionSummaryStepProps) {
  const [fieldLogs, setFieldLogs] = useState<FieldLog[]>([]);
  const [fieldLogSummary, setFieldLogSummary] = useState<FieldLogSummary | null>(null);
  const [loadingFieldLogs, setLoadingFieldLogs] = useState(true);

  // Fetch linked field logs
  useEffect(() => {
    const fetchFieldLogs = async () => {
      try {
        const response = await fetch(`/api/job-plans/${job.id}/field-logs`);
        if (response.ok) {
          const data = await response.json();
          setFieldLogs(data.logs || []);
          setFieldLogSummary(data.summary || null);
        }
      } catch (error) {
        console.error("Error fetching field logs:", error);
      } finally {
        setLoadingFieldLogs(false);
      }
    };
    fetchFieldLogs();
  }, [job.id]);
  // Convert JobPlanData to JobReportData for export
  const reportData: JobReportData = {
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
  };
  // Calculate variances
  const footageVariance = job.actualFootage - job.totalDistance;
  const footageVariancePercent = job.totalDistance > 0 
    ? ((job.actualFootage / job.totalDistance) * 100) - 100 
    : 0;

  const strandVariance = job.actualStrandUsed - job.strandFootage;
  const fiberVariance = job.actualFiberUsed - job.fiberFootage;
  const deadEndsVariance = job.actualDeadEnds - job.deadEnds;
  const tangentsVariance = job.actualTangents - job.tangents;
  const anchorsVariance = job.actualAnchors - job.anchors;

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return "text-red-600";
    if (variance < 0) return "text-emerald-600";
    return "text-slate-600";
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4" />;
    if (variance < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const formatVariance = (variance: number, suffix = "") => {
    const sign = variance > 0 ? "+" : "";
    return `${sign}${variance.toLocaleString()}${suffix}`;
  };

  const progressPercentage = job.totalDistance > 0 
    ? Math.min((job.actualFootage / job.totalDistance) * 100, 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            <h3 className="font-semibold">Job Completion Summary</h3>
          </div>
          <ReportExportButton job={reportData} reportType="completion-summary" variant="compact" />
        </div>

        <div className="text-center mb-4">
          <p className="text-5xl font-bold mb-1">
            {progressPercentage.toFixed(0)}%
          </p>
          <p className="text-slate-400">Complete</p>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500",
              progressPercentage >= 100 
                ? "bg-emerald-500" 
                : "bg-gradient-to-r from-orange-500 to-amber-500"
            )}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          {job.actualFootage.toLocaleString()} of {job.totalDistance.toLocaleString()} ft
        </p>
      </div>

      {/* Footage Summary */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-medium text-slate-900">Footage Summary</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-slate-500 mb-1">Planned</p>
              <p className="text-xl font-bold text-slate-900">
                {job.totalDistance.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">ft</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Actual</p>
              <p className="text-xl font-bold text-slate-900">
                {job.actualFootage.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">ft</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Variance</p>
              <p className={cn("text-xl font-bold flex items-center justify-center gap-1", getVarianceColor(footageVariance))}>
                {getVarianceIcon(footageVariance)}
                {formatVariance(footageVariance)}
              </p>
              <p className="text-xs text-slate-400">
                ({formatVariance(footageVariancePercent, "%")})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Materials Summary */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-medium text-slate-900">Materials Summary</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {/* Strand */}
          <div className="grid grid-cols-4 gap-4 p-4 text-sm">
            <div className="font-medium text-slate-700">Strand</div>
            <div className="text-center text-slate-600">
              {job.strandFootage.toLocaleString()} ft
            </div>
            <div className="text-center text-slate-900 font-medium">
              {job.actualStrandUsed.toLocaleString()} ft
            </div>
            <div className={cn("text-center font-medium flex items-center justify-center gap-1", getVarianceColor(strandVariance))}>
              {getVarianceIcon(strandVariance)}
              {formatVariance(strandVariance)}
            </div>
          </div>

          {/* Fiber */}
          <div className="grid grid-cols-4 gap-4 p-4 text-sm">
            <div className="font-medium text-slate-700">Fiber</div>
            <div className="text-center text-slate-600">
              {job.fiberFootage.toLocaleString()} ft
            </div>
            <div className="text-center text-slate-900 font-medium">
              {job.actualFiberUsed.toLocaleString()} ft
            </div>
            <div className={cn("text-center font-medium flex items-center justify-center gap-1", getVarianceColor(fiberVariance))}>
              {getVarianceIcon(fiberVariance)}
              {formatVariance(fiberVariance)}
            </div>
          </div>

          {/* Dead-ends */}
          <div className="grid grid-cols-4 gap-4 p-4 text-sm">
            <div className="font-medium text-slate-700">Dead-ends</div>
            <div className="text-center text-slate-600">{job.deadEnds}</div>
            <div className="text-center text-slate-900 font-medium">{job.actualDeadEnds}</div>
            <div className={cn("text-center font-medium flex items-center justify-center gap-1", getVarianceColor(deadEndsVariance))}>
              {getVarianceIcon(deadEndsVariance)}
              {formatVariance(deadEndsVariance)}
            </div>
          </div>

          {/* Tangents */}
          <div className="grid grid-cols-4 gap-4 p-4 text-sm">
            <div className="font-medium text-slate-700">Tangents</div>
            <div className="text-center text-slate-600">{job.tangents}</div>
            <div className="text-center text-slate-900 font-medium">{job.actualTangents}</div>
            <div className={cn("text-center font-medium flex items-center justify-center gap-1", getVarianceColor(tangentsVariance))}>
              {getVarianceIcon(tangentsVariance)}
              {formatVariance(tangentsVariance)}
            </div>
          </div>

          {/* Anchors */}
          <div className="grid grid-cols-4 gap-4 p-4 text-sm">
            <div className="font-medium text-slate-700">Anchors</div>
            <div className="text-center text-slate-600">{job.anchors}</div>
            <div className="text-center text-slate-900 font-medium">{job.actualAnchors}</div>
            <div className={cn("text-center font-medium flex items-center justify-center gap-1", getVarianceColor(anchorsVariance))}>
              {getVarianceIcon(anchorsVariance)}
              {formatVariance(anchorsVariance)}
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-4 gap-4 px-4 py-2 bg-slate-50 text-xs text-slate-500">
            <div>Material</div>
            <div className="text-center">Planned</div>
            <div className="text-center">Actual</div>
            <div className="text-center">Variance</div>
          </div>
        </div>
      </div>

      {/* Poles */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Poles Completed</p>
            <p className="text-2xl font-bold text-slate-900">
              {job.actualPolesComplete}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Location</p>
            <p className="font-medium text-slate-700">
              {job.locationName || `${job.totalDistance.toLocaleString()} ft`}
            </p>
          </div>
        </div>
      </div>

      {/* Linked Field Logs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-blue-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <h3 className="font-medium text-slate-900">Linked Field Reports</h3>
          </div>
          {fieldLogSummary && fieldLogSummary.count > 0 && (
            <span className="text-sm text-blue-600 font-medium">
              {fieldLogSummary.count} report{fieldLogSummary.count !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="p-4">
          {loadingFieldLogs ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          ) : fieldLogs.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              {fieldLogSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-blue-700">{fieldLogSummary.totalHours.toFixed(1)}</p>
                    <p className="text-xs text-blue-600">Total Hours</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-blue-700">{fieldLogSummary.totalFootage.toLocaleString()}</p>
                    <p className="text-xs text-blue-600">Footage</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-blue-700">{fieldLogSummary.totalPoles}</p>
                    <p className="text-xs text-blue-600">Poles</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-blue-700">{fieldLogSummary.dates.length}</p>
                    <p className="text-xs text-blue-600">Work Days</p>
                  </div>
                </div>
              )}
              
              {/* Field Log List */}
              <div className="space-y-2">
                {fieldLogs.slice(0, 5).map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {new Date(log.date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {log.workerCount} workers • {log.hoursWorked}h
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {((log.strandHungFootage || 0) + (log.fiberLashedFootage || 0) + (log.fiberPulledFootage || 0)) > 0 && (
                        <span className="text-slate-600">
                          {((log.strandHungFootage || 0) + (log.fiberLashedFootage || 0) + (log.fiberPulledFootage || 0)).toLocaleString()} ft
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {fieldLogs.length > 5 && (
                  <p className="text-xs text-center text-slate-500">
                    +{fieldLogs.length - 5} more report{fieldLogs.length - 5 !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No field reports linked to this job yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Field reports can be linked when submitting daily work logs
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
