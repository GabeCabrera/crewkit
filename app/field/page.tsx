"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, Layers, ChevronRight, Clock, RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Summary {
  totalAssemblies: number;
  totalItems: number;
  totalCost: number;
  logCount: number;
}

interface RecentLog {
  id: string;
  quantity: number;
  createdAt: string;
  assembly: {
    name: string;
  };
}

export default function FieldDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodayData = async () => {
    try {
      const response = await fetch("/api/assemblies/usage/today");
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary || null);
        setRecentLogs((data.logs || []).slice(0, 3));
      }
    } catch (error) {
      console.error("Error fetching today's data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  const quickActions = [
    { href: "/field/assemblies", icon: Layers, label: "Select Assembly", description: "Log equipment usage", color: "from-orange-500 to-orange-600" },
    { href: "/field/today", icon: Clock, label: "Today's Usage", description: "View your summary", color: "from-emerald-500 to-emerald-600" },
    { href: "/field/inventory", icon: Package, label: "Inventory", description: "Check stock levels", color: "from-slate-600 to-slate-700" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-500 text-sm sm:text-base">Quick access to your tools</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-2xl mx-auto space-y-6">
        {/* Quick Actions */}
        <div className="space-y-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-200 group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0",
                    action.color
                  )}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 group-hover:text-slate-700">
                      {action.label}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {action.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-400 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Today's Summary */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Summary</h2>
            </div>
            <button 
              onClick={fetchTodayData}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="h-16 bg-slate-100 rounded-xl" />
                <div className="h-16 bg-slate-100 rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ) : summary && summary.logCount > 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">Assemblies</p>
                  <p className="text-2xl font-bold text-slate-900">{summary.totalAssemblies}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">Items Used</p>
                  <p className="text-2xl font-bold text-slate-900">{summary.totalItems}</p>
                </div>
              </div>

              {recentLogs.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-3">Recent Activity</p>
                  <div className="space-y-2">
                    {recentLogs.map((log) => (
                      <div 
                        key={log.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                            <Layers className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-900">{log.assembly.name}</p>
                            <p className="text-xs text-slate-500">{log.quantity}× logged</p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400">{formatTime(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/field/today">
                    <button className="w-full mt-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors">
                      View all activity →
                    </button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Package className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No usage logged today</p>
              <p className="text-slate-400 text-sm mt-1 mb-4">Start by selecting an assembly</p>
              <Link href="/field/assemblies">
                <button className="px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors">
                  Select Assembly
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
