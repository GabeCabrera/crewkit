"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users2, 
  FileText, 
  Clock, 
  ChevronRight, 
  Layers,
  Package,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamSummary {
  name: string;
  memberCount: number;
  todayLogs: number;
}

export default function ManagerDashboard() {
  const [teamSummary, setTeamSummary] = useState<TeamSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/teams");
        if (response.ok) {
          const teams = await response.json();
          if (teams.length > 0) {
            setTeamSummary({
              name: teams[0].name,
              memberCount: teams[0]._count?.members || 0,
              todayLogs: 0,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching team data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const quickActions = [
    { href: "/manager/today", icon: Clock, label: "Today&apos;s Activity", description: "View team usage", color: "from-blue-500 to-blue-600" },
    { href: "/manager/teams", icon: Users2, label: "My Team", description: "View team members", color: "from-purple-500 to-purple-600" },
    { href: "/manager/end-of-day", icon: FileText, label: "End of Day", description: "Create EOD report", color: "from-emerald-500 to-emerald-600" },
    { href: "/manager/reports", icon: FileText, label: "Reports", description: "View past reports", color: "from-amber-500 to-amber-600" },
    { href: "/manager/assemblies", icon: Layers, label: "Assemblies", description: "Manage assemblies", color: "from-cyan-500 to-cyan-600" },
    { href: "/manager/inventory", icon: Package, label: "Inventory", description: "Check stock levels", color: "from-slate-500 to-slate-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Manager Dashboard</h1>
              <p className="text-slate-500 text-sm sm:text-base">Overview of your team</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-4xl mx-auto space-y-6">
        {/* Team Card */}
        {loading ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
            <div className="h-6 w-32 bg-slate-100 rounded mb-2" />
            <div className="h-4 w-24 bg-slate-100 rounded" />
          </div>
        ) : teamSummary ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <Users2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{teamSummary.name}</h2>
                <p className="text-sm text-slate-500">{teamSummary.memberCount} team members</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <p className="text-slate-500">No team assigned</p>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-200 group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0",
                      action.color
                    )}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 group-hover:text-slate-700">
                        {action.label.replace(/&apos;/g, "'")}
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
        </div>
      </div>
    </div>
  );
}
