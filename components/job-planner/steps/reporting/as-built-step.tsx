"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { GitCompare, CheckCircle2, XCircle, AlertTriangle, FileText, X, Map, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";
import { ReportExportButton } from "./report-export-button";
import { ReportDownloadBar } from "../../report-download-bar";
import { JobSheet } from "../planning/job-sheet";
import type { JobReportData } from "@/lib/report-export";

// Dynamically import ProgressMap to avoid SSR issues with Mapbox
const ProgressMap = dynamic(
  () => import("@/components/job-planner/progress-map").then((mod) => mod.ProgressMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] bg-slate-100 rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    ),
  }
);

interface AsBuiltStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function AsBuiltStep({ job }: AsBuiltStepProps) {
  const [showJobSheet, setShowJobSheet] = useState(false);
  const [showProgressMap, setShowProgressMap] = useState(false);
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
  // Calculate status for each item
  const getStatus = (planned: number, actual: number, tolerance = 0.1) => {
    if (planned === 0 && actual === 0) return "match";
    if (planned === 0) return actual > 0 ? "over" : "match";
    
    const variance = Math.abs((actual - planned) / planned);
    if (variance <= tolerance) return "match";
    return actual > planned ? "over" : "under";
  };

  const items = [
    {
      label: "Total Distance",
      planned: `${job.totalDistance.toLocaleString()} ft`,
      actual: `${job.actualFootage.toLocaleString()} ft`,
      status: getStatus(job.totalDistance, job.actualFootage),
    },
    {
      label: "Strand Footage",
      planned: `${job.strandFootage.toLocaleString()} ft`,
      actual: `${job.actualStrandUsed.toLocaleString()} ft`,
      status: getStatus(job.strandFootage, job.actualStrandUsed),
    },
    {
      label: "Fiber Footage",
      planned: `${job.fiberFootage.toLocaleString()} ft`,
      actual: `${job.actualFiberUsed.toLocaleString()} ft`,
      status: getStatus(job.fiberFootage, job.actualFiberUsed),
    },
    {
      label: "Dead-ends",
      planned: String(job.deadEnds),
      actual: String(job.actualDeadEnds),
      status: getStatus(job.deadEnds, job.actualDeadEnds, 0.2),
    },
    {
      label: "Tangents",
      planned: String(job.tangents),
      actual: String(job.actualTangents),
      status: getStatus(job.tangents, job.actualTangents, 0.2),
    },
    {
      label: "Anchors",
      planned: String(job.anchors),
      actual: String(job.actualAnchors),
      status: getStatus(job.anchors, job.actualAnchors, 0.2),
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "match":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "over":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "under":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "match":
        return "As Planned";
      case "over":
        return "Over";
      case "under":
        return "Under";
      default:
        return "";
    }
  };

  const matchCount = items.filter((i) => i.status === "match").length;
  const overCount = items.filter((i) => i.status === "over").length;
  const underCount = items.filter((i) => i.status === "under").length;

  // If showing job sheet, render that instead
  if (showJobSheet) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">As-Built Job Sheet</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowJobSheet(false)}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>
        <JobSheet job={job} mode="as-built" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <GitCompare className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">As-Built Documentation</h3>
            <p className="text-sm text-slate-500">
              Comparison of planned vs actual construction
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowJobSheet(true)}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Job Sheet
          </Button>
          <ReportExportButton job={reportData} reportType="as-built" />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{matchCount}</p>
          <p className="text-xs text-emerald-600">As Planned</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{overCount}</p>
          <p className="text-xs text-amber-600">Over</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{underCount}</p>
          <p className="text-xs text-red-600">Under</p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-4 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
          <div>Item</div>
          <div className="text-center">Planned</div>
          <div className="text-center">As-Built</div>
          <div className="text-center">Status</div>
        </div>

        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div
              key={item.label}
              className={cn(
                "grid grid-cols-4 gap-4 px-4 py-3 text-sm",
                item.status === "under" && "bg-red-50/50",
                item.status === "over" && "bg-amber-50/50"
              )}
            >
              <div className="font-medium text-slate-700">{item.label}</div>
              <div className="text-center text-slate-600">{item.planned}</div>
              <div className="text-center font-medium text-slate-900">
                {item.actual}
              </div>
              <div className="flex items-center justify-center gap-1">
                {getStatusIcon(item.status)}
                <span
                  className={cn(
                    "text-xs font-medium",
                    item.status === "match" && "text-emerald-600",
                    item.status === "over" && "text-amber-600",
                    item.status === "under" && "text-red-600"
                  )}
                >
                  {getStatusLabel(item.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Progress Map */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProgressMap(!showProgressMap)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Map className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-medium text-slate-700">Visual Progress Map</h4>
              <p className="text-xs text-slate-500">View completed infrastructure on the route map</p>
            </div>
          </div>
          {showProgressMap ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </button>
        {showProgressMap && (
          <div className="border-t border-slate-200">
            <ProgressMap
              jobId={job.id}
              mode="view"
              height="450px"
            />
          </div>
        )}
      </div>

      {/* Route Info */}
      <div className="bg-slate-50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Route Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Job Name</p>
            <p className="font-medium text-slate-900">{job.jobName}</p>
          </div>
          <div>
            <p className="text-slate-500">Location</p>
            <p className="font-medium text-slate-900">{job.locationName || "—"}</p>
          </div>
          <div>
            <p className="text-slate-500">Poles Completed</p>
            <p className="font-medium text-slate-900">{job.actualPolesComplete}</p>
          </div>
          <div>
            <p className="text-slate-500">Planned Poles</p>
            <p className="font-medium text-slate-900">{job.poleCount || "—"}</p>
          </div>
        </div>
      </div>

      {/* Note */}
      <p className="text-sm text-slate-500">
        Items are considered &quot;As Planned&quot; if within 10% tolerance for footage 
        and 20% for hardware counts.
      </p>

      {/* Download All Reports */}
      <ReportDownloadBar job={job} variant="full" className="mt-6" />
    </div>
  );
}
