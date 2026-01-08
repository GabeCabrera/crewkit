"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  MapPin, 
  Users, 
  FileText, 
  StickyNote,
  ArrowRight,
  Layers,
  User,
} from "lucide-react";
import Link from "next/link";

interface RecentLog {
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
}

interface RecentLogsTableProps {
  logs: RecentLog[];
  maxItems?: number;
}

export function RecentLogsTable({ logs, maxItems = 5 }: RecentLogsTableProps) {
  const displayLogs = logs.slice(0, maxItems);
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const formatNumber = (num: number) => new Intl.NumberFormat("en-US").format(num);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            Recent Field Logs
          </CardTitle>
          <Link
            href="/admin/reports?tab=logs"
            className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
          >
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {displayLogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No recent logs</p>
        ) : (
          <div className="space-y-3">
            {displayLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 truncate">{log.location}</span>
                    {log.notes && <StickyNote className="h-3 w-3 text-amber-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(log.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {log.workerCount}
                    </span>
                    <span>{log.hoursWorked}h</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {(log.strandHungFootage || log.fiberLashedFootage || log.fiberPulledFootage) ? (
                    <div className="text-xs">
                      {log.strandHungFootage ? (
                        <p className="font-mono text-orange-600">{formatNumber(log.strandHungFootage)} ft strand</p>
                      ) : null}
                      {(log.fiberLashedFootage || log.fiberPulledFootage) ? (
                        <p className="font-mono text-orange-600">
                          {formatNumber((log.fiberLashedFootage || 0) + (log.fiberPulledFootage || 0))} ft fiber
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TodayUsage {
  id: string;
  assemblyName: string;
  quantity: number;
  userName: string;
  createdAt: string;
}

interface TodayUsageListProps {
  usage: TodayUsage[];
  todayCost: number;
}

export function TodayUsageList({ usage, todayCost }: TodayUsageListProps) {
  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-orange-500" />
            Today&apos;s Usage
          </CardTitle>
          <Badge variant="secondary" className="font-mono">
            {formatCurrency(todayCost)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {usage.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No usage logged today</p>
        ) : (
          <div className="space-y-2">
            {usage.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="font-mono shrink-0">
                    {item.quantity}x
                  </Badge>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{item.assemblyName}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {item.userName}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 shrink-0">
                  {formatTime(item.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TopContributor {
  name: string;
  logs: number;
  hours: number;
}

interface TopLocation {
  name: string;
  logs: number;
  hours: number;
}

interface ProductivitySectionProps {
  contributors: TopContributor[];
  locations: TopLocation[];
  uniqueWorkers: number;
}

export function ProductivitySection({ contributors, locations, uniqueWorkers }: ProductivitySectionProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Top Contributors */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              Top Contributors
            </span>
            <Badge variant="outline" className="font-normal">
              {uniqueWorkers} active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {contributors.map((person, i) => (
              <div key={person.name} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-medium">{person.name}</span>
                <div className="text-right text-xs">
                  <span className="font-mono text-slate-700">{person.logs} logs</span>
                  <span className="text-slate-400 mx-1">•</span>
                  <span className="text-slate-500">{Math.round(person.hours)}h</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Locations */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-orange-500" />
            Top Job Sites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {locations.map((loc, i) => (
              <div key={loc.name} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-medium">{loc.name}</span>
                <div className="text-right text-xs">
                  <span className="font-mono text-slate-700">{loc.logs} logs</span>
                  <span className="text-slate-400 mx-1">•</span>
                  <span className="text-slate-500">{Math.round(loc.hours)}h</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

