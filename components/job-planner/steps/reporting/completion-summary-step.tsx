"use client";

import { FileText, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";

interface CompletionSummaryStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function CompletionSummaryStep({ job }: CompletionSummaryStepProps) {
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
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-5 w-5" />
          <h3 className="font-semibold">Job Completion Summary</h3>
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
    </div>
  );
}
