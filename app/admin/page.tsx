"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  Users,
  Settings,
  Layers,
  Users2,
  FileText,
  Clock,
  TrendingUp,
  Activity,
  Cable,
  DollarSign,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Wrench,
  MapPin,
  BarChart3,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  AerialMetrics,
  UndergroundMetrics,
  InfrastructureMetrics,
  MiniTrendChart,
} from "@/components/dashboard/progress-section";
import {
  RecentLogsTable,
  TodayUsageList,
  ProductivitySection,
} from "@/components/dashboard/activity-table";

interface MetricsData {
  totalLogs: number;
  hoursWorked: number;
  strandHungFootage: number;
  polesAttached: number;
  fiberLashedFootage: number;
  fiberPulledFootage: number;
  drilledFootage: number;
  plowedFootage: number;
  handholesPlaced: number;
  vaultsPlaced: number;
  mstsInstalled: number;
  guysPlaced: number;
  slackLoops: number;
  risersInstalled: number;
  spliceCases: number;
}

interface TrendData {
  month: string;
  strandHung: number;
  fiberLashed: number;
  hoursWorked: number;
  logs: number;
  fiberPulled?: number;
  drilled?: number;
  plowed?: number;
  poles?: number;
  msts?: number;
  risers?: number;
  spliceCases?: number;
  handholes?: number;
  vaults?: number;
  guys?: number;
  slackLoops?: number;
}

interface DashboardData {
  period: {
    current: { start: string; end: string; label: string };
    previous: { start: string; end: string; label: string };
  };
  metrics: {
    current: MetricsData;
    previous: MetricsData;
    deltas: Record<string, number>;
    averages: MetricsData | null;
  };
  productivity: {
    uniqueWorkers: number;
    topContributors: { name: string; logs: number; hours: number }[];
    topLocations: { name: string; logs: number; hours: number }[];
  };
  cost: {
    current: number;
    previous: number;
    delta: number;
    today: number;
  };
  trends: TrendData[];
  recentLogs: {
    id: string;
    date: string;
    location: string;
    workerCount: number;
    hoursWorked: number;
    strandHungFootage: number | null;
    fiberLashedFootage: number | null;
    fiberPulledFootage: number | null;
    submittedBy: string;
    notes: string | null;
  }[];
  todayUsage: { id: string; assemblyName: string; quantity: number; userName: string; createdAt: string }[];
  systemStats: { equipment: number; assemblies: number; users: number; teams: number };
  isAllTime?: boolean;
  monthsWithData?: number | null;
}

// Small helper component for average stats
function AverageCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-violet-600 mt-1">per month</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("current");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedMonth !== "current") {
        params.set("month", selectedMonth);
      }
      const response = await fetch(`/api/dashboard/summary?${params}&_t=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Generate month options for selector
  const getMonthOptions = () => {
    const options = [
      { value: "all", label: "📊 All Time" },
      { value: "current", label: "This Month" },
    ];
    const now = new Date();
    for (let i = 1; i <= 11; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      options.push({ value, label });
    }
    return options;
  };

  const isAllTimeView = selectedMonth === "all";

  const quickActions = [
    { href: "/admin/inventory", icon: Package, label: "Inventory", description: "Equipment & assemblies", color: "from-blue-500 to-blue-600" },
    { href: "/admin/team-management", icon: Users2, label: "Team Management", description: "Teams & users", color: "from-purple-500 to-purple-600" },
    { href: "/admin/reports", icon: FileText, label: "Reports", description: "All reports & logs", color: "from-amber-500 to-amber-600" },
    { href: "/admin/settings", icon: Settings, label: "Settings", description: "System configuration", color: "from-slate-500 to-slate-600" },
  ];

  const formatNumber = (num: number) => new Intl.NumberFormat("en-US").format(Math.round(num));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white -m-4 sm:-m-6 lg:-m-8">
        <div className="bg-white border-b border-slate-100">
          <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-7xl mx-auto">
            <div className="h-10 w-48 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Failed to load dashboard data</p>
      </div>
    );
  }

  const { metrics, productivity, cost, trends, recentLogs, todayUsage, systemStats } = data;
  const m = metrics.current;
  const d = metrics.deltas;

  // Calculate total infrastructure
  const totalInfrastructure = m.mstsInstalled + m.risersInstalled + m.spliceCases + m.handholesPlaced + m.vaultsPlaced + m.guysPlaced + m.slackLoops;

  // Calculate total fiber
  const totalFiber = m.fiberLashedFootage + m.fiberPulledFootage;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6 sm:py-5 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                isAllTimeView ? "from-violet-600 to-indigo-700" : "from-slate-900 to-slate-700"
              )}>
                {isAllTimeView ? <BarChart3 className="h-5 w-5 text-white" /> : <Activity className="h-5 w-5 text-white" />}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {isAllTimeView ? "Analytics Overview" : "Command Center"}
                </h1>
                <p className="text-slate-500 text-sm hidden sm:block">
                  {data.period.current.label}
                  {data.monthsWithData && ` • ${data.monthsWithData} months of data`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[160px] sm:w-[180px]">
                  <CalendarDays className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getMonthOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-7xl mx-auto space-y-8">
        {/* Hero KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <MetricCard
            title={isAllTimeView ? "Total Strand Hung" : "Strand Hung"}
            value={`${formatNumber(m.strandHungFootage)} ft`}
            delta={isAllTimeView ? undefined : d.strandHungFootage}
            icon={Cable}
            variant="warning"
            size="large"
          />
          <MetricCard
            title={isAllTimeView ? "Total Fiber" : "Fiber Installed"}
            value={`${formatNumber(totalFiber)} ft`}
            delta={isAllTimeView ? undefined : (d.fiberLashedFootage + d.fiberPulledFootage) / 2}
            icon={TrendingUp}
            variant="success"
            size="large"
          />
          <MetricCard
            title={isAllTimeView ? "Total Hours" : "Hours Worked"}
            value={formatNumber(m.hoursWorked)}
            delta={isAllTimeView ? undefined : d.hoursWorked}
            subtitle={`${m.totalLogs} logs`}
            icon={Clock}
            variant="primary"
            size="large"
          />
          <MetricCard
            title={isAllTimeView ? "Total Infrastructure" : "Infrastructure"}
            value={formatNumber(totalInfrastructure)}
            subtitle="items placed"
            icon={Wrench}
            variant="info"
            size="large"
          />
          <MetricCard
            title={isAllTimeView ? "Total Equipment Cost" : "Equipment Cost"}
            value={formatCurrency(cost.current)}
            delta={isAllTimeView ? undefined : cost.delta}
            icon={DollarSign}
            variant="dark"
            size="large"
          />
          <MetricCard
            title={isAllTimeView ? "Total Crew" : "Active Crew"}
            value={productivity.uniqueWorkers}
            subtitle="unique workers"
            icon={Users}
            variant="default"
            size="large"
          />
        </div>

        {/* Monthly Averages Section - Only shown in All Time view */}
        {isAllTimeView && metrics.averages && (
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-6 border border-violet-100">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Gauge className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Monthly Averages</h2>
                <p className="text-sm text-slate-500">Average performance per month across all time</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <AverageCard label="Strand Hung" value={`${formatNumber(metrics.averages.strandHungFootage)} ft`} />
              <AverageCard label="Fiber Lashed" value={`${formatNumber(metrics.averages.fiberLashedFootage)} ft`} />
              <AverageCard label="Fiber Pulled" value={`${formatNumber(metrics.averages.fiberPulledFootage)} ft`} />
              <AverageCard label="Hours Worked" value={formatNumber(metrics.averages.hoursWorked)} />
              <AverageCard label="Work Logs" value={formatNumber(metrics.averages.totalLogs)} />
              <AverageCard label="Poles Attached" value={formatNumber(metrics.averages.polesAttached)} />
              <AverageCard label="Drilled" value={`${formatNumber(metrics.averages.drilledFootage)} ft`} />
            </div>
          </div>
        )}

        {/* Trends Section */}
        <div className={cn("grid gap-6", isAllTimeView ? "lg:grid-cols-2" : "lg:grid-cols-4")}>
          <div className={cn(
            "bg-white rounded-2xl p-5 shadow-sm border border-slate-100",
            isAllTimeView ? "lg:col-span-1" : "lg:col-span-1"
          )}>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              {isAllTimeView ? "12-Month Trends" : "Monthly Trends"}
            </h3>
            <div className="space-y-6">
              <MiniTrendChart
                data={trends.map((t) => ({ month: t.month, value: t.strandHung }))}
                label="Strand Hung"
                color="orange"
              />
              <MiniTrendChart
                data={trends.map((t) => ({ month: t.month, value: t.fiberLashed }))}
                label="Fiber Lashed"
                color="blue"
              />
              <MiniTrendChart
                data={trends.map((t) => ({ month: t.month, value: t.hoursWorked }))}
                label="Hours Worked"
                color="emerald"
              />
            </div>
          </div>

          {/* Additional Trends - Only in All Time view */}
          {isAllTimeView && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Infrastructure Trends</h3>
              <div className="space-y-6">
                <MiniTrendChart
                  data={trends.map((t) => ({ month: t.month, value: t.drilled || 0 }))}
                  label="Drilled"
                  color="purple"
                />
                <MiniTrendChart
                  data={trends.map((t) => ({ month: t.month, value: t.poles || 0 }))}
                  label="Poles Attached"
                  color="cyan"
                />
                <MiniTrendChart
                  data={trends.map((t) => ({ month: t.month, value: t.logs }))}
                  label="Work Logs"
                  color="slate"
                />
              </div>
            </div>
          )}

          {/* Metric Breakdowns */}
          <div className={cn(
            "grid md:grid-cols-3 gap-6",
            isAllTimeView ? "lg:col-span-2" : "lg:col-span-3"
          )}>
            <AerialMetrics
              strandHung={m.strandHungFootage}
              fiberLashed={m.fiberLashedFootage}
              fiberPulled={m.fiberPulledFootage}
              polesAttached={m.polesAttached}
            />
            <UndergroundMetrics
              drilled={m.drilledFootage}
              plowed={m.plowedFootage}
            />
            <InfrastructureMetrics
              msts={m.mstsInstalled}
              risers={m.risersInstalled}
              spliceCases={m.spliceCases}
              handholes={m.handholesPlaced}
              vaults={m.vaultsPlaced}
              guys={m.guysPlaced}
              slackLoops={m.slackLoops}
            />
          </div>
        </div>

        {/* Productivity Section */}
        <ProductivitySection
          contributors={productivity.topContributors}
          locations={productivity.topLocations}
          uniqueWorkers={productivity.uniqueWorkers}
        />

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentLogsTable logs={recentLogs} maxItems={5} />
          </div>
          <div>
            <TodayUsageList usage={todayUsage} todayCost={cost.today} />
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-slate-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-200 group cursor-pointer h-full">
                  <div className="flex flex-col gap-3">
                    <div
                      className={cn(
                        "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0",
                        action.color
                      )}
                    >
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-slate-700">{action.label}</h3>
                      <p className="text-sm text-slate-500">{action.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* System Stats Footer */}
        <div className="border-t border-slate-100 pt-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {systemStats.equipment} Equipment
            </span>
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              {systemStats.assemblies} Assemblies
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {systemStats.users} Users
            </span>
            <span className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              {systemStats.teams} Teams
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
