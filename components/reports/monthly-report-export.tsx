"use client";

import { useState, useMemo } from "react";
import {
  Download,
  FileText,
  Table,
  Loader2,
  Calendar,
  FileDown,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type MonthlyReportData,
  generateMonthlyReportPDF,
  generateMonthlyInventoryCSV,
  generateMonthlyFieldLogsCSV,
  downloadFile,
  downloadPDF,
  sanitizeFilename,
} from "@/lib/report-export";

interface MonthlyReportExportProps {
  className?: string;
}

export function MonthlyReportExport({ className }: MonthlyReportExportProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Default to previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      options.push({ value, label });
    }
    
    return options;
  }, []);

  const fetchReportData = async (): Promise<MonthlyReportData | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/reports/monthly?month=${selectedMonth}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch report data");
      }
      
      const data = await response.json();
      setReportData(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate report";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    const data = await fetchReportData();
    if (!data) return;

    try {
      const doc = generateMonthlyReportPDF(data);
      const monthSlug = sanitizeFilename(data.month);
      downloadPDF(doc, `monthly-report-${monthSlug}.pdf`);
    } catch (err) {
      setError("Failed to generate PDF");
    }
  };

  const handleExportInventoryCSV = async () => {
    const data = reportData || (await fetchReportData());
    if (!data) return;

    try {
      const csv = generateMonthlyInventoryCSV(data);
      const monthSlug = sanitizeFilename(data.month);
      downloadFile(csv, `monthly-inventory-${monthSlug}.csv`);
    } catch (err) {
      setError("Failed to export inventory CSV");
    }
  };

  const handleExportFieldLogsCSV = async () => {
    const data = reportData || (await fetchReportData());
    if (!data) return;

    try {
      const csv = generateMonthlyFieldLogsCSV(data);
      const monthSlug = sanitizeFilename(data.month);
      downloadFile(csv, `monthly-field-logs-${monthSlug}.csv`);
    } catch (err) {
      setError("Failed to export field logs CSV");
    }
  };

  const selectedMonthLabel = monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-6 ${className || ""}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Calendar className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Monthly Report</h3>
          <p className="text-sm text-slate-500">
            Generate a comprehensive report for submission
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Month Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Month
          </label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Report Preview Info */}
        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-800 mb-2">Report includes:</p>
          <ul className="space-y-1 text-slate-600">
            <li>• Executive summary with key metrics</li>
            <li>• Equipment &amp; assembly usage for the month</li>
            <li>• Stock level changes (current vs. start of month)</li>
            <li>• Field work logs with construction metrics</li>
            <li>• Job progress summaries</li>
          </ul>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Export Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleGeneratePDF}
            disabled={isLoading}
            className="flex-1 bg-slate-800 hover:bg-slate-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Generate PDF Report
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isLoading} className="sm:w-auto">
                <Table className="h-4 w-4 mr-2" />
                Export CSV
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportInventoryCSV} className="cursor-pointer">
                <Table className="h-4 w-4 mr-2" />
                <div>
                  <p>Inventory Usage</p>
                  <p className="text-xs text-slate-500">Equipment consumption data</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportFieldLogsCSV} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                <div>
                  <p>Field Work Logs</p>
                  <p className="text-xs text-slate-500">Daily construction logs</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Preview of Selected Month Data */}
        {reportData && reportData.month === selectedMonthLabel && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <p className="text-sm font-medium text-slate-700 mb-3">
              Quick Preview - {reportData.month}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">Field Logs</p>
                <p className="text-lg font-bold text-blue-900">
                  {reportData.executiveSummary.fieldWork.totalLogs}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs text-emerald-600 font-medium">Total Hours</p>
                <p className="text-lg font-bold text-emerald-900">
                  {reportData.executiveSummary.fieldWork.totalHours.toLocaleString()}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-amber-600 font-medium">Assemblies</p>
                <p className="text-lg font-bold text-amber-900">
                  {reportData.executiveSummary.assemblies.totalUsed}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-purple-600 font-medium">Inv. Cost</p>
                <p className="text-lg font-bold text-purple-900">
                  ${reportData.executiveSummary.inventory.totalCost.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
