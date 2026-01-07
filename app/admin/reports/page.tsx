"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContent } from "@/components/layout/page-skeleton";
import { 
  Cable,
  MapPin,
  Clock,
  Upload,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  X,
  StickyNote,
  RefreshCw,
  DollarSign,
  Package,
  User,
  ChevronDown,
  ChevronUp,
  Activity,
  TrendingUp,
  Check,
  Layers,
  Users,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// ==================== TYPES ====================
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
  handholesPlaced: number | null;
  vaultsPlaced: number | null;
  mstsInstalled: number | null;
  guysPlaced: number | null;
  slackLoops: number | null;
  risersInstalled: number | null;
  spliceCases: number | null;
  notes: string | null;
  submittedBy: string;
}

interface FieldSummary {
  totalLogs: number;
  totalHoursWorked: number;
  uniqueWorkers: number;
  aerial: { strandHungFootage: number; polesAttached: number; fiberLashedFootage: number };
  underground: { fiberPulledFootage: number; drilledFootage: number; plowedFootage: number; conduitPlacedFootage: number };
  infrastructure: { handholesPlaced: number; vaultsPlaced: number; mstsInstalled: number; guysPlaced: number; slackLoops: number; risersInstalled: number; spliceCases: number };
}

interface UsageLog {
  id: string;
  quantity: number;
  modifiers: { equipmentId: string; quantity: number }[] | null;
  date: string;
  createdAt: string;
  assembly: {
    id: string;
    name: string;
    items: { id: string; quantity: number; equipment: { id: string; name: string; pricePerUnit: number } }[];
  };
  user: { id: string; name: string | null; email: string };
}

interface TodaySummary {
  totalAssemblies: number;
  totalItems: number;
  totalCost: number;
  logCount: number;
}

// ==================== MAIN COMPONENT ====================
export default function ReportsHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "today";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/admin/reports?tab=${value}`, { scroll: false });
  };

  return (
    <PageContent>
      <div className="space-y-6">
        <PageHeader 
          title="Reports Hub" 
          description="Daily work logs, activity tracking, and construction progress"
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="today" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Today</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Daily Logs</span>
            </TabsTrigger>
            <TabsTrigger value="submit" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Submit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            <TodayActivityTab />
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <DailyLogsTab />
          </TabsContent>

          <TabsContent value="submit" className="space-y-6">
            <SubmitReportTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageContent>
  );
}

// ==================== TODAY'S ACTIVITY TAB ====================
function TodayActivityTab() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const fetchTodayUsage = useCallback(async () => {
    try {
      const response = await fetch(`/api/assemblies/usage/today?all=true&_t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error("Error fetching today's usage:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayUsage();
  }, [fetchTodayUsage]);

  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) return <div className="animate-pulse h-64 bg-muted rounded-lg" />;

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Layers className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assemblies Used</p>
                <p className="text-2xl font-bold">{summary?.totalAssemblies || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items Consumed</p>
                <p className="text-2xl font-bold">{summary?.totalItems || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.totalCost || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Log Entries</p>
                <p className="text-2xl font-bold">{summary?.logCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Logs */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Today&apos;s Usage Logs</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchTodayUsage}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No usage logged today</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono">{log.quantity}x</Badge>
                      <div>
                        <p className="font-medium">{log.assembly.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user.name || log.user.email.split("@")[0]}
                          <span className="mx-1">•</span>
                          <Clock className="h-3 w-3" />
                          {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    {expandedLogs.has(log.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  {expandedLogs.has(log.id) && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Items Used:</p>
                      <div className="grid gap-1">
                        {log.assembly.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.equipment.name}</span>
                            <span className="font-mono">{item.quantity * log.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ==================== DAILY LOGS TAB (Combined Field Logs + EOD) ====================
interface DiagnoseData {
  totalCount: number;
  duplicates: { count: number; details: { key: string; count: number; ids: string[] }[] };
  byMonth: { month: string; count: number }[];
  bySubmitter: { _count: { id: number }; submittedBy: string }[];
}

function DailyLogsTab() {
  const [logs, setLogs] = useState<FieldWorkLog[]>([]);
  const [summary, setSummary] = useState<FieldSummary | null>(null);
  const [locations, setLocations] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [selectedLog, setSelectedLog] = useState<FieldWorkLog | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [diagnoseData, setDiagnoseData] = useState<DiagnoseData | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ deleted: number; remaining: number } | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (locationFilter) params.set("location", locationFilter);

      const response = await fetch(`/api/reports/field-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setSummary(data.summary);
        setLocations(data.locations);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, locationFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const fetchDiagnose = async () => {
    try {
      const response = await fetch("/api/reports/diagnose");
      if (response.ok) {
        const data = await response.json();
        setDiagnoseData(data);
      }
    } catch (error) {
      console.error("Error fetching diagnose:", error);
    }
  };

  const handleRemoveDuplicates = async () => {
    setCleaning(true);
    setCleanResult(null);
    try {
      const response = await fetch("/api/reports/diagnose", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-duplicates" }),
      });
      if (response.ok) {
        const result = await response.json();
        setCleanResult(result);
        fetchLogs();
        fetchDiagnose();
      }
    } catch (error) {
      console.error("Error removing duplicates:", error);
    } finally {
      setCleaning(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete ALL logs? This cannot be undone.")) return;
    setCleaning(true);
    try {
      const response = await fetch("/api/reports/diagnose", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-all" }),
      });
      if (response.ok) {
        const result = await response.json();
        setCleanResult({ deleted: result.deleted, remaining: 0 });
        fetchLogs();
        fetchDiagnose();
      }
    } catch (error) {
      console.error("Error clearing logs:", error);
    } finally {
      setCleaning(false);
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) return;
    setImporting(true);
    setImportResult(null);

    try {
      const lines = importData.trim().split("\n");
      const rows = lines.slice(1).map((line) => {
        const values = line.split("\t");
        return {
          location: values[0] || "", workers: values[1] || "", workerCount: values[2] || "",
          hoursWorked: values[3] || "", strandHungFootage: values[4] || "", polesAttached: values[5] || "",
          fiberLashedFootage: values[6] || "", fiberPulledFootage: values[7] || "",
          drilledFootage: values[8] || "", plowedFootage: values[9] || "",
          handholesPlaced: values[11] || "", vaultsPlaced: values[12] || "",
          mstsInstalled: values[13] || "", guysPlaced: values[14] || "",
          slackLoops: values[15] || "", risersInstalled: values[16] || "",
          spliceCases: values[17] || "", notes: values[18] || "",
          submittedBy: values[19] || "", timestamp: values[20] || "",
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
        if (result.imported > 0) fetchLogs();
      }
    } catch (error) {
      console.error("Error importing:", error);
      setImportResult({ imported: 0, skipped: 0, errors: ["Failed to import data"] });
    } finally {
      setImporting(false);
    }
  };

  const formatNumber = (num: number) => new Intl.NumberFormat("en-US").format(num);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  if (loading) return <div className="animate-pulse h-64 bg-muted rounded-lg" />;

  return (
    <>
      {/* Summary Cards */}
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
          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-100">Strand Hung</p>
                  <p className="text-3xl font-bold">{formatNumber(summary.aerial.strandHungFootage)} ft</p>
                </div>
                <Cable className="h-10 w-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-100">Fiber Lashed</p>
                  <p className="text-3xl font-bold">{formatNumber(summary.aerial.fiberLashedFootage)} ft</p>
                </div>
                <TrendingUp className="h-10 w-10 text-emerald-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Import */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="w-[140px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="w-[140px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Location</Label>
              <Select value={locationFilter} onValueChange={(v) => { setLocationFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Locations" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.slice(0, 15).map((loc) => (
                    <SelectItem key={loc.name} value={loc.name}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Dialog open={manageDialogOpen} onOpenChange={(open) => { setManageDialogOpen(open); if (open) fetchDiagnose(); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Manage Data</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Data Management</DialogTitle>
                    <DialogDescription>Review and clean up your daily logs data</DialogDescription>
                  </DialogHeader>
                  {diagnoseData ? (
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-2xl font-bold text-blue-700">{diagnoseData.totalCount}</p>
                          <p className="text-sm text-blue-600">Total Logs</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-4">
                          <p className="text-2xl font-bold text-amber-700">{diagnoseData.duplicates.count}</p>
                          <p className="text-sm text-amber-600">Duplicate Records</p>
                        </div>
                      </div>

                      {diagnoseData.duplicates.count > 0 && (
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Duplicate Groups Found:</h4>
                          <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                            {diagnoseData.duplicates.details.map((d, i) => (
                              <div key={i} className="flex justify-between text-muted-foreground">
                                <span className="truncate flex-1">{d.key.split("|").slice(0, 2).join(" - ")}</span>
                                <Badge variant="secondary">{d.count}x</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">By Submitter:</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {diagnoseData.bySubmitter.slice(0, 6).map((s, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="truncate">{s.submittedBy}</span>
                              <span className="font-mono">{s._count.id}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {cleanResult && (
                        <div className="bg-green-50 p-4 rounded-lg text-green-800">
                          <p><strong>{cleanResult.deleted}</strong> records deleted</p>
                          <p><strong>{cleanResult.remaining}</strong> records remaining</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4 border-t">
                        {diagnoseData.duplicates.count > 0 && (
                          <Button onClick={handleRemoveDuplicates} disabled={cleaning} variant="outline">
                            {cleaning ? "Cleaning..." : `Remove ${diagnoseData.duplicates.count} Duplicates`}
                          </Button>
                        )}
                        <Button onClick={handleClearAll} disabled={cleaning} variant="destructive">
                          Clear All & Re-import
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">Loading...</div>
                  )}
                </DialogContent>
              </Dialog>
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Upload className="mr-2 h-4 w-4" />Import</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import Daily Logs</DialogTitle>
                    <DialogDescription>Paste tab-separated data from your spreadsheet.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Textarea placeholder="Paste your data here..." value={importData} onChange={(e) => setImportData(e.target.value)} rows={10} className="font-mono text-xs" />
                    {importResult && (
                      <div className={cn("p-4 rounded-lg text-sm", importResult.imported > 0 ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800")}>
                        <p><strong>{importResult.imported}</strong> imported, <strong>{importResult.skipped}</strong> skipped</p>
                        {importResult.errors.length > 0 && (
                          <details className="mt-2"><summary className="cursor-pointer">Errors ({importResult.errors.length})</summary>
                            <ul className="mt-2 text-xs max-h-24 overflow-y-auto">{importResult.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}</ul>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleImport} disabled={importing || !importData.trim()}>{importing ? "Importing..." : "Import"}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Daily Work Logs</CardTitle>
            <span className="text-sm text-muted-foreground">{total} records</span>
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
                  <th className="pb-3 font-medium text-muted-foreground">Submitted By</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <td className="py-3 text-xs font-medium">{formatDate(log.date)}</td>
                    <td className="py-3 font-medium max-w-[200px] truncate">
                      {log.location}
                      {log.notes && <StickyNote className="inline h-3 w-3 ml-1 text-amber-500" />}
                    </td>
                    <td className="py-3 text-center"><Badge variant="secondary" className="font-mono">{log.workerCount}</Badge></td>
                    <td className="py-3 text-center font-mono">{log.hoursWorked}h</td>
                    <td className="py-3 text-right font-mono text-xs">{log.strandHungFootage ? `${formatNumber(log.strandHungFootage)} ft` : "-"}</td>
                    <td className="py-3 text-right font-mono text-xs">{(log.fiberLashedFootage || log.fiberPulledFootage) ? `${formatNumber((log.fiberLashedFootage || 0) + (log.fiberPulledFootage || 0))} ft` : "-"}</td>
                    <td className="py-3 text-xs text-muted-foreground truncate max-w-[120px]">{log.submittedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
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
                <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />{selectedLog.location}</DialogTitle>
                <DialogDescription>{formatDate(selectedLog.date)} • Submitted by {selectedLog.submittedBy}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Crew */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Crew ({selectedLog.workerCount} workers • {selectedLog.hoursWorked}h)</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedLog.workersNames.map((name, i) => <Badge key={i} variant="secondary">{name}</Badge>)}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedLog.strandHungFootage && selectedLog.strandHungFootage > 0 && (
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-orange-700">{formatNumber(selectedLog.strandHungFootage)} ft</p>
                      <p className="text-xs text-orange-600">Strand Hung</p>
                    </div>
                  )}
                  {selectedLog.fiberLashedFootage && selectedLog.fiberLashedFootage > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-blue-700">{formatNumber(selectedLog.fiberLashedFootage)} ft</p>
                      <p className="text-xs text-blue-600">Fiber Lashed</p>
                    </div>
                  )}
                  {selectedLog.fiberPulledFootage && selectedLog.fiberPulledFootage > 0 && (
                    <div className="bg-indigo-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-indigo-700">{formatNumber(selectedLog.fiberPulledFootage)} ft</p>
                      <p className="text-xs text-indigo-600">Fiber Pulled</p>
                    </div>
                  )}
                  {selectedLog.polesAttached && selectedLog.polesAttached > 0 && (
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-purple-700">{selectedLog.polesAttached}</p>
                      <p className="text-xs text-purple-600">Poles Attached</p>
                    </div>
                  )}
                  {selectedLog.mstsInstalled && selectedLog.mstsInstalled > 0 && (
                    <div className="bg-cyan-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-cyan-700">{selectedLog.mstsInstalled}</p>
                      <p className="text-xs text-cyan-600">MSTs Installed</p>
                    </div>
                  )}
                  {selectedLog.risersInstalled && selectedLog.risersInstalled > 0 && (
                    <div className="bg-emerald-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-emerald-700">{selectedLog.risersInstalled}</p>
                      <p className="text-xs text-emerald-600">Risers</p>
                    </div>
                  )}
                  {selectedLog.spliceCases && selectedLog.spliceCases > 0 && (
                    <div className="bg-amber-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-amber-700">{selectedLog.spliceCases}</p>
                      <p className="text-xs text-amber-600">Splice Cases</p>
                    </div>
                  )}
                  {selectedLog.guysPlaced && selectedLog.guysPlaced > 0 && (
                    <div className="bg-rose-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-rose-700">{selectedLog.guysPlaced}</p>
                      <p className="text-xs text-rose-600">Guys Placed</p>
                    </div>
                  )}
                  {selectedLog.slackLoops && selectedLog.slackLoops > 0 && (
                    <div className="bg-teal-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-teal-700">{selectedLog.slackLoops}</p>
                      <p className="text-xs text-teal-600">Slack Loops</p>
                    </div>
                  )}
                  {selectedLog.handholesPlaced && selectedLog.handholesPlaced > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-slate-700">{selectedLog.handholesPlaced}</p>
                      <p className="text-xs text-slate-600">Handholes</p>
                    </div>
                  )}
                  {selectedLog.vaultsPlaced && selectedLog.vaultsPlaced > 0 && (
                    <div className="bg-stone-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-stone-700">{selectedLog.vaultsPlaced}</p>
                      <p className="text-xs text-stone-600">Vaults</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {selectedLog.notes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-medium mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedLog.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==================== SUBMIT REPORT TAB ====================
function SubmitReportTab() {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    location: "",
    workers: [] as string[],
    workerInput: "",
    hoursWorked: "",
    strandHungFootage: "",
    polesAttached: "",
    fiberLashedFootage: "",
    fiberPulledFootage: "",
    mstsInstalled: "",
    risersInstalled: "",
    spliceCases: "",
    guysPlaced: "",
    slackLoops: "",
    handholesPlaced: "",
    vaultsPlaced: "",
    drilledFootage: "",
    plowedFootage: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAddWorker = () => {
    if (formData.workerInput.trim() && !formData.workers.includes(formData.workerInput.trim())) {
      setFormData(prev => ({ ...prev, workers: [...prev.workers, prev.workerInput.trim()], workerInput: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location.trim()) return;
    setSubmitting(true);

    try {
      const payload = {
        rows: [{
          location: formData.location,
          workers: formData.workers.join(","),
          workerCount: formData.workers.length.toString(),
          hoursWorked: formData.hoursWorked || "0",
          strandHungFootage: formData.strandHungFootage || null,
          polesAttached: formData.polesAttached || null,
          fiberLashedFootage: formData.fiberLashedFootage || null,
          fiberPulledFootage: formData.fiberPulledFootage || null,
          mstsInstalled: formData.mstsInstalled || null,
          risersInstalled: formData.risersInstalled || null,
          spliceCases: formData.spliceCases || null,
          guysPlaced: formData.guysPlaced || null,
          slackLoops: formData.slackLoops || null,
          handholesPlaced: formData.handholesPlaced || null,
          vaultsPlaced: formData.vaultsPlaced || null,
          drilledFootage: formData.drilledFootage || null,
          plowedFootage: formData.plowedFootage || null,
          notes: formData.notes || null,
          submittedBy: "Admin",
          timestamp: new Date(formData.date).toISOString(),
        }],
      };

      const response = await fetch("/api/reports/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (response.ok) {
        setSuccess(true);
        setFormData({
          date: new Date().toISOString().split("T")[0],
          location: "", workers: [], workerInput: "", hoursWorked: "",
          strandHungFootage: "", polesAttached: "", fiberLashedFootage: "", fiberPulledFootage: "",
          mstsInstalled: "", risersInstalled: "", spliceCases: "", guysPlaced: "", slackLoops: "",
          handholesPlaced: "", vaultsPlaced: "", drilledFootage: "", plowedFootage: "", notes: "",
        });
      }
    } catch { /* ignore */ } finally { setSubmitting(false); }
  };

  if (success) {
    return (
      <Card className="border-0 shadow-sm max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-semibold">Report Submitted!</h3>
          <p className="text-muted-foreground">Your daily work log has been recorded.</p>
          <Button className="mt-4" onClick={() => setSuccess(false)}>Submit Another</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-500" />Submit Daily Work Log</CardTitle>
        <CardDescription>Record today&apos;s construction progress and crew activity</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Hours Worked</Label>
              <Input type="number" step="0.5" placeholder="8" value={formData.hoursWorked} onChange={(e) => setFormData(prev => ({ ...prev, hoursWorked: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location / Job Site *</Label>
            <Input placeholder="e.g., West Mountain Phase 1" value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} />
          </div>

          {/* Crew */}
          <div className="space-y-2">
            <Label>Crew Members</Label>
            <div className="flex gap-2">
              <Input 
                placeholder="Enter name and press Enter" 
                value={formData.workerInput} 
                onChange={(e) => setFormData(prev => ({ ...prev, workerInput: e.target.value }))} 
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddWorker(); } }} 
              />
              <Button type="button" variant="outline" onClick={handleAddWorker}><Plus className="h-4 w-4" /></Button>
            </div>
            {formData.workers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.workers.map((name) => (
                  <Badge key={name} variant="secondary" className="pr-1">
                    {name}
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, workers: prev.workers.filter(w => w !== name) }))} className="ml-1 hover:bg-muted rounded-full p-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Aerial Section */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Cable className="h-4 w-4" /> Aerial Work
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2"><Label className="text-xs">Strand (ft)</Label><Input type="number" value={formData.strandHungFootage} onChange={(e) => setFormData(prev => ({ ...prev, strandHungFootage: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Fiber Lashed (ft)</Label><Input type="number" value={formData.fiberLashedFootage} onChange={(e) => setFormData(prev => ({ ...prev, fiberLashedFootage: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Fiber Pulled (ft)</Label><Input type="number" value={formData.fiberPulledFootage} onChange={(e) => setFormData(prev => ({ ...prev, fiberPulledFootage: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Poles Attached</Label><Input type="number" value={formData.polesAttached} onChange={(e) => setFormData(prev => ({ ...prev, polesAttached: e.target.value }))} /></div>
            </div>
          </div>

          {/* Infrastructure Section */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Infrastructure
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2"><Label className="text-xs">MSTs</Label><Input type="number" value={formData.mstsInstalled} onChange={(e) => setFormData(prev => ({ ...prev, mstsInstalled: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Risers</Label><Input type="number" value={formData.risersInstalled} onChange={(e) => setFormData(prev => ({ ...prev, risersInstalled: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Splice Cases</Label><Input type="number" value={formData.spliceCases} onChange={(e) => setFormData(prev => ({ ...prev, spliceCases: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Guys Placed</Label><Input type="number" value={formData.guysPlaced} onChange={(e) => setFormData(prev => ({ ...prev, guysPlaced: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Slack Loops</Label><Input type="number" value={formData.slackLoops} onChange={(e) => setFormData(prev => ({ ...prev, slackLoops: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Handholes</Label><Input type="number" value={formData.handholesPlaced} onChange={(e) => setFormData(prev => ({ ...prev, handholesPlaced: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Vaults</Label><Input type="number" value={formData.vaultsPlaced} onChange={(e) => setFormData(prev => ({ ...prev, vaultsPlaced: e.target.value }))} /></div>
            </div>
          </div>

          {/* Underground Section */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Underground
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Drilled (ft)</Label><Input type="number" value={formData.drilledFootage} onChange={(e) => setFormData(prev => ({ ...prev, drilledFootage: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Plowed (ft)</Label><Input type="number" value={formData.plowedFootage} onChange={(e) => setFormData(prev => ({ ...prev, plowedFootage: e.target.value }))} /></div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={3} placeholder="Any additional details, issues, or accomplishments..." value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
          </div>

          <Button type="submit" className="w-full" disabled={submitting || !formData.location}>
            {submitting ? "Submitting..." : "Submit Daily Log"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
