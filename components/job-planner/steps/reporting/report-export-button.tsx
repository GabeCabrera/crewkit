"use client";

import { useState } from "react";
import { Download, FileText, Table, Loader2, FileDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  JobReportData,
  HoursLogData,
  generateAsBuiltCSV,
  generateCompletionSummaryCSV,
  generateHoursSummaryCSV,
  generateAsBuiltPDF,
  generateCompletionSummaryPDF,
  generateHoursSummaryPDF,
  generateFullReportPDF,
  downloadFile,
  downloadPDF,
  sanitizeFilename,
} from "@/lib/report-export";

export type ReportType = "as-built" | "completion-summary" | "hours-summary" | "full-report";

interface ReportExportButtonProps {
  job: JobReportData;
  reportType: ReportType;
  hoursLogs?: HoursLogData[];
  variant?: "default" | "compact";
}

export function ReportExportButton({
  job,
  reportType,
  hoursLogs = [],
  variant = "default",
}: ReportExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const getReportLabel = (): string => {
    switch (reportType) {
      case "as-built":
        return "As-Built Report";
      case "completion-summary":
        return "Completion Summary";
      case "hours-summary":
        return "Hours Summary";
      case "full-report":
        return "Full Job Report";
      default:
        return "Report";
    }
  };

  const generateFilename = (extension: string): string => {
    const jobSlug = sanitizeFilename(job.jobName);
    const date = new Date().toISOString().split("T")[0];
    
    switch (reportType) {
      case "as-built":
        return `${jobSlug}-as-built-${date}.${extension}`;
      case "completion-summary":
        return `${jobSlug}-completion-summary-${date}.${extension}`;
      case "hours-summary":
        return `${jobSlug}-hours-summary-${date}.${extension}`;
      case "full-report":
        return `${jobSlug}-completion-report-${date}.${extension}`;
      default:
        return `${jobSlug}-report-${date}.${extension}`;
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      let csvContent: string;

      switch (reportType) {
        case "as-built":
          csvContent = generateAsBuiltCSV(job);
          break;
        case "completion-summary":
          csvContent = generateCompletionSummaryCSV(job);
          break;
        case "hours-summary":
          csvContent = generateHoursSummaryCSV(job, hoursLogs);
          break;
        case "full-report":
          // For full report, combine all CSVs with sections
          csvContent = [
            "=== COMPLETION SUMMARY ===",
            generateCompletionSummaryCSV(job),
            "",
            "=== AS-BUILT COMPARISON ===",
            generateAsBuiltCSV(job),
            "",
            "=== HOURS LOG ===",
            generateHoursSummaryCSV(job, hoursLogs),
          ].join("\n");
          break;
        default:
          csvContent = "";
      }

      downloadFile(csvContent, generateFilename("csv"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      let doc;

      switch (reportType) {
        case "as-built":
          doc = generateAsBuiltPDF(job);
          break;
        case "completion-summary":
          doc = generateCompletionSummaryPDF(job);
          break;
        case "hours-summary":
          doc = generateHoursSummaryPDF(job, hoursLogs);
          break;
        case "full-report":
          doc = generateFullReportPDF(job, hoursLogs);
          break;
        default:
          return;
      }

      downloadPDF(doc, generateFilename("pdf"));
    } finally {
      setIsExporting(false);
    }
  };

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={isExporting}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title={`Export ${getReportLabel()}`}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Export {getReportLabel()}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
            <Table className="h-4 w-4 mr-2" />
            Download CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
            <FileText className="h-4 w-4 mr-2" />
            Download PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={isExporting}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          Export
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{getReportLabel()}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
          <Table className="h-4 w-4 mr-2" />
          <div>
            <p>Download CSV</p>
            <p className="text-xs text-slate-500">Spreadsheet format</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2" />
          <div>
            <p>Download PDF</p>
            <p className="text-xs text-slate-500">Print-ready format</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Standalone Full Report Export Button (for use in job lifecycle header)
interface FullReportExportButtonProps {
  job: JobReportData;
  hoursLogs?: HoursLogData[];
}

export function FullReportExportButton({
  job,
  hoursLogs = [],
}: FullReportExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const doc = generateFullReportPDF(job, hoursLogs);
      const jobSlug = sanitizeFilename(job.jobName);
      const date = new Date().toISOString().split("T")[0];
      downloadPDF(doc, `${jobSlug}-completion-report-${date}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Export Full Report
    </button>
  );
}
