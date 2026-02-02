"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, AlertCircle, CheckCircle2, XCircle, FileDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";
import type { JobReportData, HoursLogData } from "@/lib/report-export";
import { generateFullReportPDF, downloadPDF, sanitizeFilename } from "@/lib/report-export";

interface SignoffStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function SignoffStep({ job, updateJob, canEdit }: SignoffStepProps) {
  const { data: session } = useSession();
  const [hoursLogs, setHoursLogs] = useState<HoursLogData[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch hours logs for full report export
  const fetchHoursLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/hours`);
      if (response.ok) {
        const data = await response.json();
        setHoursLogs(data);
      }
    } catch (error) {
      console.error("Error fetching hours logs:", error);
    }
  }, [job.id]);

  useEffect(() => {
    fetchHoursLogs();
  }, [fetchHoursLogs]);

  // Convert job data for export
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

  const handleExportFullReport = async () => {
    setIsExporting(true);
    try {
      const doc = generateFullReportPDF(reportData, hoursLogs);
      const jobSlug = sanitizeFilename(job.jobName);
      const date = new Date().toISOString().split("T")[0];
      downloadPDF(doc, `${jobSlug}-completion-report-${date}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  // Check requirements
  const allPermitsChecked =
    job.rmpPermitApproved &&
    job.sesdPermitApproved &&
    job.makeReadyComplete &&
    job.easementsClear;

  const hasConstructionProgress = job.actualFootage > 0 || job.actualPolesComplete > 0;

  const canSignOff = allPermitsChecked && hasConstructionProgress;

  const handleSignoff = (checked: boolean) => {
    if (checked && !canSignOff) return;

    updateJob({
      foremanSignoff: checked,
      signoffDate: checked ? new Date().toISOString() : null,
      completedAt: checked ? new Date().toISOString() : null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Sign-off Status - smooth transition between states */}
      <div
        className={cn(
          "rounded-2xl p-6 text-center border transition-all duration-300 ease-out",
          job.foremanSignoff
            ? "bg-emerald-50 border-emerald-200"
            : "bg-amber-50 border-amber-200"
        )}
      >
        <div className="relative h-12 w-12 mx-auto mb-3">
          <CheckCircle2
            className={cn(
              "h-12 w-12 absolute inset-0 transition-all duration-300",
              job.foremanSignoff
                ? "text-emerald-500 opacity-100 scale-100"
                : "text-emerald-500 opacity-0 scale-75"
            )}
          />
          <CheckSquare
            className={cn(
              "h-12 w-12 absolute inset-0 transition-all duration-300",
              job.foremanSignoff
                ? "text-amber-500 opacity-0 scale-75"
                : "text-amber-500 opacity-100 scale-100"
            )}
          />
        </div>
        <h3
          className={cn(
            "text-xl font-semibold mb-1 transition-colors duration-300",
            job.foremanSignoff ? "text-emerald-900" : "text-amber-900"
          )}
        >
          {job.foremanSignoff ? "Job Signed Off" : "Awaiting Sign-off"}
        </h3>
        <p
          className={cn(
            "transition-colors duration-300",
            job.foremanSignoff ? "text-emerald-700" : "text-amber-700"
          )}
        >
          {job.foremanSignoff
            ? `Completed on ${
                job.signoffDate
                  ? new Date(job.signoffDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"
              }`
            : "Review requirements below before signing off"}
        </p>
      </div>

      {/* Requirements Checklist */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-medium text-slate-900">Sign-off Requirements</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Permits */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {allPermitsChecked ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="font-medium text-slate-900">All Permits Verified</p>
                <p className="text-sm text-slate-500">
                  RMP, SESD, Make-Ready, Easements
                </p>
              </div>
            </div>
            <span
              className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                allPermitsChecked
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              )}
            >
              {allPermitsChecked ? "Complete" : "Incomplete"}
            </span>
          </div>

          {/* Construction Progress */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {hasConstructionProgress ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="font-medium text-slate-900">Construction Progress Logged</p>
                <p className="text-sm text-slate-500">
                  At least one daily progress entry required
                </p>
              </div>
            </div>
            <span
              className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                hasConstructionProgress
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              )}
            >
              {hasConstructionProgress
                ? `${job.actualFootage.toLocaleString()} ft logged`
                : "No progress"}
            </span>
          </div>
        </div>
      </div>

      {/* Sign-off Action */}
      {!job.foremanSignoff && (
        <div className="bg-slate-50 rounded-xl p-6">
          {canSignOff ? (
            <label className="flex items-start gap-4 cursor-pointer">
              <Checkbox
                checked={job.foremanSignoff}
                onCheckedChange={(checked) => handleSignoff(checked === true)}
                disabled={!canEdit}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-slate-900">
                  I confirm this job is complete
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  By checking this box, you certify that all work has been completed
                  according to specifications and the job is ready for final review.
                </p>
                {session?.user?.name && (
                  <p className="text-xs text-slate-400 mt-2">
                    Signing as: {session.user.name}
                  </p>
                )}
              </div>
            </label>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">
                  Cannot sign off yet
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Please complete all requirements above before signing off on this job.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Full Report - Always available */}
      <div className={cn(
        "rounded-xl p-6",
        job.foremanSignoff ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50"
      )}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-slate-900">Job Completion Report</h4>
              {!job.foremanSignoff && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                  DRAFT
                </span>
              )}
              {job.foremanSignoff && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                  FINAL
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {job.foremanSignoff 
                ? "Download a comprehensive PDF report with all job details, as-built comparison, hours summary, and lessons learned."
                : "Download a draft report. Sign off above to generate the final version."
              }
            </p>
          </div>
          <button
            onClick={handleExportFullReport}
            disabled={isExporting}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap",
              job.foremanSignoff 
                ? "text-white bg-emerald-600 hover:bg-emerald-700"
                : "text-white bg-slate-800 hover:bg-slate-700"
            )}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {job.foremanSignoff ? "Export Final Report" : "Export Draft Report"}
          </button>
        </div>
      </div>

      {/* Undo Sign-off */}
      {job.foremanSignoff && canEdit && (
        <div className="text-center">
          <button
            onClick={() => handleSignoff(false)}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Undo sign-off
          </button>
        </div>
      )}
    </div>
  );
}
