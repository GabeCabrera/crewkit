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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContent } from "@/components/layout/page-skeleton";
import { 
  Cable,
  MapPin,
  Clock,
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
  Calendar,
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
export default function ManagerReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/manager/reports?tab=${value}`, { scroll: false });
  };

  return (
    <PageContent>
      <div className="space-y-6">
        <PageHeader 
          title="Reports & Activity" 
          description="Track daily progress, field work, and team productivity"
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Today</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Work Logs</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Usage</span>
            </TabsTrigger>
            <TabsTrigger value="submit" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Submit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <TodayOverviewTab />
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <FieldLogsTab />
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <UsageHistoryTab />
          </TabsContent>

          <TabsContent value="submit" className="space-y-6">
            <SubmitLogTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageContent>
  );
}

// ==================== TODAY'S OVERVIEW TAB ====================
function TodayOverviewTab() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [fieldLogs, setFieldLogs] = useState<FieldWorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [usageRes, fieldRes] = await Promise.all([
        fetch(`/api/assemblies/usage/today?all=true&_t=${Date.now()}`),
        fetch(`/api/reports/field-logs?limit=5&_t=${Date.now()}`),
      ]);
      
      if (usageRes.ok) {
        const data = await usageRes.json();
        setLogs(data.logs || []);
        setSummary(data.summary || null);
      }
      
      if (fieldRes.ok) {
        const data = await fieldRes.json();
        setFieldLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const formatNumber = (num: number) => new Intl.NumberFormat("en-US").format(num);

  if (loading) return <div className="animate-pulse h-64 bg-muted rounded-lg" />;

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">Assemblies Used</p>
                <p className="text-3xl font-bold">{summary?.totalAssemblies || 0}</p>
              </div>
              <Layers className="h-10 w-10 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-100">Items Consumed</p>
                <p className="text-3xl font-bold">{summary?.totalItems || 0}</p>
              </div>
              <Package className="h-10 w-10 text-purple-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-100">Today's Cost</p>
                <p className="text-3xl font-bold">{formatCurrency(summary?.totalCost || 0)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-100">Log Entries</p>
                <p className="text-3xl font-bold">{summary?.logCount || 0}</p>
              </div>
              <FileText className="h-10 w-10 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Usage */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              Today's Assembly Usage
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No usage logged today</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="border rounded-lg p-3">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleExpand(log.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono">{log.quantity}x</Badge>
                        <div>
                          <p className="font-medium text-sm">{log.assembly.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.user.name || log.user.email.split("@")[0]}
                            <span className="mx-1">•</span>
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
                              <span className="truncate">{item.equipment.name}</span>
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

        {/* Recent Field Logs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              Recent Field Work
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fieldLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent field logs</p>
            ) : (
              <div className="space-y-3">
                {fieldLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {log.location}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(log.date)}
                          </span>
                          <span>•</span>
                          <span>{log.workerCount} crew</span>
                          <span>•</span>
                          <span>{log.hoursWorked}h</span>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        {log.strandHungFootage ? (
                          <p className="font-mono text-orange-600">{formatNumber(log.strandHungFootage)} ft strand</p>
                        ) : null}
                        {(log.fiberLashedFootage || log.fiberPulledFootage) ? (
                          <p className="font-mono text-blue-600">
                            {formatNumber((log.fiberLashedFootage || 0) + (log.fiberPulledFootage || 0))} ft fiber
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ==================== FIELD LOGS TAB ====================
function FieldLogsTab() {
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
  const [selectedLog, setSelectedLog] = useState<FieldWorkLog | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "15");
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

  const formatNumber = (num: number) => new Intl.NumberFormat("en-US").format(num);
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  if (loading) return <div className="animate-pulse h-64 bg-muted rounded-lg" />;

  return (
    <>
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                  <p className="text-2xl font-bold">{formatNumber(summary.totalLogs)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hours Worked</p>
                  <p className="text-2xl font-bold">{formatNumber(Math.round(summary.totalHoursWorked))}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Cable className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Strand Hung</p>
                  <p className="text-2xl font-bold">{formatNumber(summary.aerial.strandHungFootage)} ft</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fiber Lashed</p>
                  <p className="text-2xl font-bold">{formatNumber(summary.aerial.fiberLashedFootage)} ft</p>
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
            <Button variant="outline" size="sm" onClick={fetchLogs} className="ml-auto">
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Field Work Logs</CardTitle>
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
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">No logs found</td>
                  </tr>
                ) : (
                  logs.map((log) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
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

// ==================== USAGE HISTORY TAB ====================
function UsageHistoryTab() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");

  const fetchUsage = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.set("date", dateFilter);
      params.set("limit", "50");
      
      const response = await fetch(`/api/assemblies/usage?${params}&_t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || data || []);
      }
    } catch (error) {
      console.error("Error fetching usage:", error);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  if (loading) return <div className="animate-pulse h-64 bg-muted rounded-lg" />;

  // Group by date
  const groupedLogs = logs.reduce((acc, log) => {
    const date = new Date(log.date).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, UsageLog[]>);

  return (
    <>
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-[180px]" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsage}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage by Date */}
      <div className="space-y-4">
        {Object.keys(groupedLogs).length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Layers className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No Usage Found</h3>
              <p className="mt-2 text-sm text-muted-foreground">No assembly usage logs for this period.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedLogs).map(([date, dateLogs]) => {
            const totalQty = dateLogs.reduce((sum, l) => sum + l.quantity, 0);
            return (
              <Card key={date} className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(date)}
                    </CardTitle>
                    <Badge variant="secondary">{totalQty} assemblies</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dateLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono">{log.quantity}x</Badge>
                          <div>
                            <p className="font-medium text-sm">{log.assembly.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.user.name || log.user.email.split("@")[0]}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}

// ==================== SUBMIT LOG TAB ====================
function SubmitLogTab() {
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
  const [locations, setLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationInputFocused, setLocationInputFocused] = useState(false);

  // Fetch existing locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch("/api/reports/field-logs?limit=1");
        if (response.ok) {
          const data = await response.json();
          // Extract unique location names
          const locs = data.locations?.map((l: { name: string }) => l.name) || [];
          setLocations(locs);
        }
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };
    fetchLocations();
  }, []);

  // Filter locations based on input
  const filteredLocations = formData.location.trim()
    ? locations.filter(loc => 
        loc.toLowerCase().includes(formData.location.toLowerCase()) &&
        loc.toLowerCase() !== formData.location.toLowerCase()
      )
    : locations;

  const handleSelectLocation = (location: string) => {
    setFormData(prev => ({ ...prev, location }));
    setShowLocationDropdown(false);
  };

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
          submittedBy: "Manager",
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
          <h3 className="text-xl font-semibold">Log Submitted!</h3>
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
        <CardDescription>Record today's construction progress and crew activity</CardDescription>
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

          <div className="space-y-2 relative">
            <Label>Location / Job Site *</Label>
            <div className="relative">
              <Input 
                placeholder="e.g., West Mountain Phase 1" 
                value={formData.location} 
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, location: e.target.value }));
                  setShowLocationDropdown(true);
                }}
                onFocus={() => {
                  setLocationInputFocused(true);
                  setShowLocationDropdown(true);
                }}
                onBlur={() => {
                  // Delay hiding to allow click on dropdown items
                  setTimeout(() => {
                    setLocationInputFocused(false);
                    setShowLocationDropdown(false);
                  }, 200);
                }}
              />
              {showLocationDropdown && locationInputFocused && filteredLocations.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 text-xs text-muted-foreground border-b bg-muted/50">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    Previous Locations
                  </div>
                  {filteredLocations.slice(0, 10).map((loc, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                      onClick={() => handleSelectLocation(loc)}
                    >
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{loc}</span>
                    </button>
                  ))}
                  {filteredLocations.length > 10 && (
                    <div className="p-2 text-xs text-muted-foreground text-center border-t">
                      +{filteredLocations.length - 10} more locations
                    </div>
                  )}
                </div>
              )}
            </div>
            {formData.location && !locations.includes(formData.location) && locations.length > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Plus className="h-3 w-3" /> New location will be added
              </p>
            )}
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
              <div className="space-y-2"><Label className="text-xs">Strand (ft)</Label><Input type="number" placeholder="0" value={formData.strandHungFootage} onChange={(e) => setFormData(prev => ({ ...prev, strandHungFootage: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Fiber Lashed (ft)</Label><Input type="number" placeholder="0" value={formData.fiberLashedFootage} onChange={(e) => setFormData(prev => ({ ...prev, fiberLashedFootage: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Fiber Pulled (ft)</Label><Input type="number" placeholder="0" value={formData.fiberPulledFootage} onChange={(e) => setFormData(prev => ({ ...prev, fiberPulledFootage: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Poles Attached</Label><Input type="number" placeholder="0" value={formData.polesAttached} onChange={(e) => setFormData(prev => ({ ...prev, polesAttached: e.target.value }))} /></div>
            </div>
          </div>

          {/* Infrastructure Section */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Infrastructure
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2"><Label className="text-xs">MSTs</Label><Input type="number" placeholder="0" value={formData.mstsInstalled} onChange={(e) => setFormData(prev => ({ ...prev, mstsInstalled: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Risers</Label><Input type="number" placeholder="0" value={formData.risersInstalled} onChange={(e) => setFormData(prev => ({ ...prev, risersInstalled: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Splice Cases</Label><Input type="number" placeholder="0" value={formData.spliceCases} onChange={(e) => setFormData(prev => ({ ...prev, spliceCases: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Guys Placed</Label><Input type="number" placeholder="0" value={formData.guysPlaced} onChange={(e) => setFormData(prev => ({ ...prev, guysPlaced: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Slack Loops</Label><Input type="number" placeholder="0" value={formData.slackLoops} onChange={(e) => setFormData(prev => ({ ...prev, slackLoops: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Handholes</Label><Input type="number" placeholder="0" value={formData.handholesPlaced} onChange={(e) => setFormData(prev => ({ ...prev, handholesPlaced: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Vaults</Label><Input type="number" placeholder="0" value={formData.vaultsPlaced} onChange={(e) => setFormData(prev => ({ ...prev, vaultsPlaced: e.target.value }))} /></div>
            </div>
          </div>

          {/* Underground Section */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Underground
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Drilled (ft)</Label><Input type="number" placeholder="0" value={formData.drilledFootage} onChange={(e) => setFormData(prev => ({ ...prev, drilledFootage: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Plowed (ft)</Label><Input type="number" placeholder="0" value={formData.plowedFootage} onChange={(e) => setFormData(prev => ({ ...prev, plowedFootage: e.target.value }))} /></div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={3} placeholder="Any additional details, issues, or accomplishments..." value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting || !formData.location}>
            {submitting ? "Submitting..." : "Submit Daily Log"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
