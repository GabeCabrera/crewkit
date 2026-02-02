"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileText,
  FileSpreadsheet,
  ClipboardList,
  Clock,
  Loader2,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "./job-lifecycle-view";
import type { JobReportData, HoursLogData } from "@/lib/report-export";
import {
  generateAsBuiltCSV,
  generateAsBuiltPDF,
  generateCompletionSummaryCSV,
  generateCompletionSummaryPDF,
  generateHoursSummaryCSV,
  generateHoursSummaryPDF,
  generateFullReportPDF,
  downloadFile,
  downloadPDF,
  sanitizeFilename,
} from "@/lib/report-export";

interface ReportDownloadBarProps {
  job: JobPlanData;
  variant?: "full" | "compact";
  className?: string;
}

type ReportType = "as-built" | "completion" | "hours" | "full";
type ExportFormat = "csv" | "pdf";

// Convert JobPlanData to JobReportData
function toReportData(job: JobPlanData): JobReportData {
  return {
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
}

export function ReportDownloadBar({ job, variant = "full", className }: ReportDownloadBarProps) {
  const [isExporting, setIsExporting] = useState<ReportType | null>(null);
  const [hoursLogs, setHoursLogs] = useState<HoursLogData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch hours logs for reports that need them
  const fetchHoursLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/logs/hours`);
      if (response.ok) {
        const data = await response.json();
        setHoursLogs(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error fetching hours logs:", error);
    }
  }, [job.id]);

  useEffect(() => {
    fetchHoursLogs();
  }, [fetchHoursLogs]);

  const reportData = toReportData(job);

  // Calculate progress
  const progressPercent = job.totalDistance > 0 
    ? Math.min((job.actualFootage / job.totalDistance) * 100, 100) 
    : 0;

  const handleExport = async (reportType: ReportType, format: ExportFormat) => {
    setIsExporting(reportType);
    const jobSlug = sanitizeFilename(job.jobName);
    const date = new Date().toISOString().split("T")[0];

    try {
      switch (reportType) {
        case "as-built":
          if (format === "csv") {
            const csv = generateAsBuiltCSV(reportData);
            downloadFile(csv, `${jobSlug}-as-built-${date}.csv`);
          } else {
            const doc = generateAsBuiltPDF(reportData);
            downloadPDF(doc, `${jobSlug}-as-built-${date}.pdf`);
          }
          break;

        case "completion":
          if (format === "csv") {
            const csv = generateCompletionSummaryCSV(reportData);
            downloadFile(csv, `${jobSlug}-completion-${date}.csv`);
          } else {
            const doc = generateCompletionSummaryPDF(reportData);
            downloadPDF(doc, `${jobSlug}-completion-${date}.pdf`);
          }
          break;

        case "hours":
          if (format === "csv") {
            const csv = generateHoursSummaryCSV(reportData, hoursLogs);
            downloadFile(csv, `${jobSlug}-hours-${date}.csv`);
          } else {
            const doc = generateHoursSummaryPDF(reportData, hoursLogs);
            downloadPDF(doc, `${jobSlug}-hours-${date}.pdf`);
          }
          break;

        case "full":
          const doc = generateFullReportPDF(reportData, hoursLogs);
          downloadPDF(doc, `${jobSlug}-completion-report-${date}.pdf`);
          break;
      }
    } finally {
      setIsExporting(null);
    }
  };

  // Compact variant - single dropdown
  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-2", className)}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download Reports
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {job.foremanSignoff ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Signed Off
              </span>
            ) : (
              <span className="text-amber-600">Draft - Not Signed Off</span>
            )}
          </div>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleExport("as-built", "pdf")}>
            <FileText className="mr-2 h-4 w-4" />
            As-Built Report (PDF)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("as-built", "csv")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            As-Built Report (CSV)
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleExport("completion", "pdf")}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Progress Summary (PDF)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("completion", "csv")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Progress Summary (CSV)
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleExport("hours", "pdf")}>
            <Clock className="mr-2 h-4 w-4" />
            Hours Summary (PDF)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("hours", "csv")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Hours Summary (CSV)
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => handleExport("full", "pdf")}
            className="font-medium"
          >
            <FileText className="mr-2 h-4 w-4" />
            Full Report (PDF)
            {!job.foremanSignoff && (
              <span className="ml-auto text-xs text-amber-600">DRAFT</span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Full variant - button bar
  return (
    <div className={cn("bg-slate-50 border border-slate-200 rounded-lg p-3", className)}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Status info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Download Reports</span>
          </div>
          <div className="flex items-center gap-2">
            {job.foremanSignoff ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                FINAL
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                DRAFT
              </span>
            )}
            <span className="text-xs text-slate-500">
              {progressPercent.toFixed(0)}% complete
            </span>
          </div>
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Download buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* As-Built */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 h-8"
                disabled={isExporting === "as-built"}
              >
                {isExporting === "as-built" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                As-Built
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("as-built", "pdf")}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("as-built", "csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Progress Summary */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 h-8"
                disabled={isExporting === "completion"}
              >
                {isExporting === "completion" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ClipboardList className="h-3.5 w-3.5" />
                )}
                Progress
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("completion", "pdf")}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("completion", "csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hours Summary */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 h-8"
                disabled={isExporting === "hours"}
              >
                {isExporting === "hours" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                Hours
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("hours", "pdf")}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("hours", "csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Full Report - Primary Action */}
          <Button 
            size="sm" 
            className="gap-1.5 h-8 bg-slate-800 hover:bg-slate-700"
            onClick={() => handleExport("full", "pdf")}
            disabled={isExporting === "full"}
          >
            {isExporting === "full" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Full Report
            {!job.foremanSignoff && (
              <span className="text-xs text-amber-300">(Draft)</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
