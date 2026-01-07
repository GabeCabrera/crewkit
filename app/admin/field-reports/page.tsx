"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TablePageSkeleton, PageContent } from "@/components/layout/page-skeleton";
import { 
  Cable,
  Zap,
  MapPin,
  Users,
  Clock,
  Calendar,
  Upload,
  ChevronLeft,
  ChevronRight,
  FileText,
  Activity,
  Layers,
  CircleDot,
  Box,
  Anchor,
  ArrowUpDown,
  StickyNote,
  Filter,
  X,
  TrendingUp,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldWorkLog {
  id: string;
  date: string;
  location: string;
  workersNames: string[];
  workerCount: number;
  hoursWorked: number;
  strandHungFootage: number | null;
  polesAttached: number | null;
  fiberLashedFootage: number | null;
  fiberPulledFootage: number | null;
  drilledFootage: number | null;
  plowedFootage: number | null;
  trenchedFootage: number | null;
  conduitPlacedFootage: number | null;
  handholesPlaced: number | null;
  vaultsPlaced: number | null;
  mstsInstalled: number | null;
  guysPlaced: number | null;
  slackLoops: number | null;
  risersInstalled: number | null;
  spliceCases: number | null;
  anchorsPlaced: number | null;
  snowshoesPlaced: number | null;
  notes: string | null;
  submittedBy: string;
}

interface Summary {
  totalLogs: number;
  totalHoursWorked: number;
  uniqueWorkers: number;
  aerial: {
    strandHungFootage: number;
    polesAttached: number;
    fiberLashedFootage: number;
  };
  underground: {
    fiberPulledFootage: number;
    drilledFootage: number;
    plowedFootage: number;
    trenchedFootage: number;
    conduitPlacedFootage: number;
  };
  infrastructure: {
    handholesPlaced: number;
    vaultsPlaced: number;
    mstsInstalled: number;
    guysPlaced: number;
    slackLoops: number;
    risersInstalled: number;
    spliceCases: number;
    anchorsPlaced: number;
    snowshoesPlaced: number;
  };
}

interface LocationCount {
  name: string;
  count: number;
}

export default function AdminFieldReportsPage() {
  const [logs, setLogs] = useState<FieldWorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [locations, setLocations] = useState<LocationCount[]>([]);
  const [submitters, setSubmitters] = useState<LocationCount[]>([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [submitterFilter, setSubmitterFilter] = useState("");
  
  // Import dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  // Detail dialog
  const [selectedLog, setSelectedLog] = useState<FieldWorkLog | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "25");
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (locationFilter) params.set("location", locationFilter);
      if (submitterFilter) params.set("submittedBy", submitterFilter);

      const response = await fetch(`/api/reports/field-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setSummary(data.summary);
        setLocations(data.locations);
        setSubmitters(data.submitters);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, locationFilter, submitterFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleImport = async () => {
    if (!importData.trim()) return;

    setImporting(true);
    setImportResult(null);

    try {
      // Parse tab-separated values
      const lines = importData.trim().split("\n");
      const headers = lines[0].split("\t");
      
      const rows = lines.slice(1).map((line) => {
        const values = line.split("\t");
        // Column mapping based on spreadsheet structure:
        // 0: location, 1: workers, 2: workerCount, 3: hoursWorked
        // 4: strandHungFootage, 5: polesAttached, 6: fiberLashedFootage, 7: fiberPulledFootage
        // 8: drilledFootage, 9: plowedFootage, 10: polyconcreteHhs (skip), 11: handholesPlaced
        // 12: vaultsPlaced, 13: mstsInstalled, 14: guysPlaced, 15: slackLoops
        // 16: risersInstalled, 17: spliceCases, 18: notes, 19: submittedBy, 20: timestamp
        return {
          location: values[0] || "",
          workers: values[1] || "",
          workerCount: values[2] || "",
          hoursWorked: values[3] || "",
          strandHungFootage: values[4] || "",
          polesAttached: values[5] || "",
          fiberLashedFootage: values[6] || "",
          fiberPulledFootage: values[7] || "",
          drilledFootage: values[8] || "",
          plowedFootage: values[9] || "",
          handholesPlaced: values[11] || "",  // Column 11, not 10
          vaultsPlaced: values[12] || "",
          mstsInstalled: values[13] || "",
          guysPlaced: values[14] || "",
          slackLoops: values[15] || "",
          risersInstalled: values[16] || "",
          spliceCases: values[17] || "",
          notes: values[18] || "",
          submittedBy: values[19] || "",
          timestamp: values[20] || "",
        };
      });

      const response = await fetch("/api/reports/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      if (response.ok) {
        const result = await response.json();
        setImportResult(result);
        if (result.imported > 0) {
          fetchLogs();
        }
      }
    } catch (error) {
      console.error("Error importing:", error);
      setImportResult({ imported: 0, skipped: 0, errors: ["Failed to import data"] });
    } finally {
      setImporting(false);
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setLocationFilter("");
    setSubmitterFilter("");
    setPage(1);
  };

  const hasFilters = startDate || endDate || locationFilter || submitterFilter;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return <TablePageSkeleton />;
  }

  return (
    <PageContent>
      <div className="space-y-6">
        <PageHeader 
          title="Field Work Reports" 
          description="Construction progress and daily field activities"
          action={
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Data
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import Field Work Data</DialogTitle>
                  <DialogDescription>
                    Paste tab-separated data from your spreadsheet. Include headers in the first row.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Textarea
                    placeholder="Paste your data here..."
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={12}
                    className="font-mono text-xs"
                  />
                  {importResult && (
                    <div className={cn(
                      "p-4 rounded-lg text-sm",
                      importResult.imported > 0 
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    )}>
                      <p><strong>{importResult.imported}</strong> records imported</p>
                      <p><strong>{importResult.skipped}</strong> records skipped</p>
                      {importResult.errors.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer">View errors ({importResult.errors.length})</summary>
                          <ul className="mt-2 text-xs max-h-32 overflow-y-auto">
                            {importResult.errors.slice(0, 10).map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={importing || !importData.trim()}>
                      {importing ? "Importing..." : "Import"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        {/* Summary Stats */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Total Logs</p>
                    <p className="text-3xl font-bold">{formatNumber(summary.totalLogs)}</p>
                  </div>
                  <FileText className="h-10 w-10 text-slate-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100">Hours Worked</p>
                    <p className="text-3xl font-bold">{formatNumber(Math.round(summary.totalHoursWorked))}</p>
                  </div>
                  <Clock className="h-10 w-10 text-blue-300" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-100">Unique Workers</p>
                    <p className="text-3xl font-bold">{formatNumber(summary.uniqueWorkers)}</p>
                  </div>
                  <Users className="h-10 w-10 text-emerald-300" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-600 to-purple-700 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-100">Locations</p>
                    <p className="text-3xl font-bold">{formatNumber(locations.length)}</p>
                  </div>
                  <MapPin className="h-10 w-10 text-purple-300" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Construction Metrics */}
        {summary && (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Aerial */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Cable className="h-5 w-5 text-orange-500" />
                  Aerial Construction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-sm text-muted-foreground">Strand Hung</span>
                  <span className="font-mono font-semibold">{formatNumber(summary.aerial.strandHungFootage)} ft</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-sm text-muted-foreground">Fiber Lashed</span>
                  <span className="font-mono font-semibold">{formatNumber(summary.aerial.fiberLashedFootage)} ft</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Poles Attached</span>
                  <span className="font-mono font-semibold">{formatNumber(summary.aerial.polesAttached)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Underground */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5 text-amber-600" />
                  Underground Construction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-sm text-muted-foreground">Fiber Pulled</span>
                  <span className="font-mono font-semibold">{formatNumber(summary.underground.fiberPulledFootage)} ft</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-sm text-muted-foreground">Drilled</span>
                  <span className="font-mono font-semibold">{formatNumber(summary.underground.drilledFootage)} ft</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-sm text-muted-foreground">Plowed</span>
                  <span className="font-mono font-semibold">{formatNumber(summary.underground.plowedFootage)} ft</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Conduit Placed</span>
                  <span className="font-mono font-semibold">{formatNumber(summary.underground.conduitPlacedFootage)} ft</span>
                </div>
              </CardContent>
            </Card>

            {/* Infrastructure */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-5 w-5 text-cyan-600" />
                  Infrastructure Placed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">{summary.infrastructure.vaultsPlaced}</p>
                    <p className="text-xs text-muted-foreground">Vaults</p>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">{summary.infrastructure.handholesPlaced}</p>
                    <p className="text-xs text-muted-foreground">Handholes</p>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">{summary.infrastructure.mstsInstalled}</p>
                    <p className="text-xs text-muted-foreground">MSTs</p>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">{summary.infrastructure.risersInstalled}</p>
                    <p className="text-xs text-muted-foreground">Risers</p>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">{summary.infrastructure.spliceCases}</p>
                    <p className="text-xs text-muted-foreground">Splices</p>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">{summary.infrastructure.guysPlaced}</p>
                    <p className="text-xs text-muted-foreground">Guys</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-[150px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-[150px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Location</Label>
                <Select value={locationFilter} onValueChange={(v) => { setLocationFilter(v === "all" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.slice(0, 20).map((loc) => (
                      <SelectItem key={loc.name} value={loc.name}>
                        {loc.name} ({loc.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Submitted By</Label>
                <Select value={submitterFilter} onValueChange={(v) => { setSubmitterFilter(v === "all" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Submitters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Submitters</SelectItem>
                    {submitters.map((sub) => (
                      <SelectItem key={sub.name} value={sub.name}>
                        {sub.name} ({sub.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Daily Logs</CardTitle>
              <span className="text-sm text-muted-foreground">{total} total records</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Date</th>
                    <th className="pb-3 font-medium text-muted-foreground">Location</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Crew</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Hours</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Strand</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Fiber</th>
                    <th className="pb-3 font-medium text-muted-foreground">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr 
                      key={log.id} 
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="py-3">
                        <span className="text-xs font-medium">{formatDate(log.date)}</span>
                      </td>
                      <td className="py-3">
                        <span className="font-medium">{log.location}</span>
                        {log.notes && (
                          <StickyNote className="inline h-3 w-3 ml-1 text-amber-500" />
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant="secondary" className="font-mono">
                          {log.workerCount}
                        </Badge>
                      </td>
                      <td className="py-3 text-center font-mono">
                        {log.hoursWorked}h
                      </td>
                      <td className="py-3 text-right font-mono text-xs">
                        {log.strandHungFootage ? `${formatNumber(log.strandHungFootage)} ft` : "-"}
                      </td>
                      <td className="py-3 text-right font-mono text-xs">
                        {(log.fiberLashedFootage || log.fiberPulledFootage) 
                          ? `${formatNumber((log.fiberLashedFootage || 0) + (log.fiberPulledFootage || 0))} ft`
                          : "-"
                        }
                      </td>
                      <td className="py-3">
                        <span className="text-xs text-muted-foreground">{log.submittedBy}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedLog && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {selectedLog.location}
                  </DialogTitle>
                  <DialogDescription>
                    {formatDate(selectedLog.date)} • Submitted by {selectedLog.submittedBy}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Crew */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Crew ({selectedLog.workerCount} people, {selectedLog.hoursWorked}h)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedLog.workersNames.map((name, i) => (
                        <Badge key={i} variant="secondary">{name}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedLog.strandHungFootage && (
                      <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-orange-700">{formatNumber(selectedLog.strandHungFootage)} ft</p>
                        <p className="text-xs text-orange-600">Strand Hung</p>
                      </div>
                    )}
                    {selectedLog.polesAttached && (
                      <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-orange-700">{selectedLog.polesAttached}</p>
                        <p className="text-xs text-orange-600">Poles</p>
                      </div>
                    )}
                    {selectedLog.fiberLashedFootage && (
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-blue-700">{formatNumber(selectedLog.fiberLashedFootage)} ft</p>
                        <p className="text-xs text-blue-600">Fiber Lashed</p>
                      </div>
                    )}
                    {selectedLog.fiberPulledFootage && (
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-blue-700">{formatNumber(selectedLog.fiberPulledFootage)} ft</p>
                        <p className="text-xs text-blue-600">Fiber Pulled</p>
                      </div>
                    )}
                    {selectedLog.drilledFootage && (
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-amber-700">{formatNumber(selectedLog.drilledFootage)} ft</p>
                        <p className="text-xs text-amber-600">Drilled</p>
                      </div>
                    )}
                    {selectedLog.plowedFootage && (
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-amber-700">{formatNumber(selectedLog.plowedFootage)} ft</p>
                        <p className="text-xs text-amber-600">Plowed</p>
                      </div>
                    )}
                    {selectedLog.vaultsPlaced && (
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-emerald-700">{selectedLog.vaultsPlaced}</p>
                        <p className="text-xs text-emerald-600">Vaults</p>
                      </div>
                    )}
                    {selectedLog.handholesPlaced && (
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-emerald-700">{selectedLog.handholesPlaced}</p>
                        <p className="text-xs text-emerald-600">Handholes</p>
                      </div>
                    )}
                    {selectedLog.mstsInstalled && (
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-purple-700">{selectedLog.mstsInstalled}</p>
                        <p className="text-xs text-purple-600">MSTs</p>
                      </div>
                    )}
                    {selectedLog.risersInstalled && (
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-purple-700">{selectedLog.risersInstalled}</p>
                        <p className="text-xs text-purple-600">Risers</p>
                      </div>
                    )}
                    {selectedLog.spliceCases && (
                      <div className="bg-cyan-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-cyan-700">{selectedLog.spliceCases}</p>
                        <p className="text-xs text-cyan-600">Splice Cases</p>
                      </div>
                    )}
                    {selectedLog.guysPlaced && (
                      <div className="bg-slate-100 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-slate-700">{selectedLog.guysPlaced}</p>
                        <p className="text-xs text-slate-600">Guys</p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {selectedLog.notes && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <StickyNote className="h-4 w-4" />
                        Notes
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                        {selectedLog.notes}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageContent>
  );
}

