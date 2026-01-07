"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Package, 
  Layers, 
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  User,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";

interface UsageLog {
  id: string;
  quantity: number;
  modifiers: { equipmentId: string; quantity: number }[] | null;
  date: string;
  createdAt: string;
  assembly: {
    id: string;
    name: string;
    description: string | null;
    items: {
      id: string;
      quantity: number;
      equipment: {
        id: string;
        name: string;
        sku: string;
        pricePerUnit: number;
        unitType: string;
        photoUrl: string | null;
      };
    }[];
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Summary {
  totalAssemblies: number;
  totalItems: number;
  totalCost: number;
  logCount: number;
}

export default function FieldTodayPage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchTodayUsage = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      // Add cache-busting query param
      const response = await fetch(`/api/assemblies/usage/today?_t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setSummary(data.summary || null);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("Error fetching today's usage:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTodayUsage();
  }, [fetchTodayUsage]);

  // Auto-refresh when page becomes visible (user switches back to tab/app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Only refresh if more than 30 seconds since last refresh
        const timeSinceRefresh = Date.now() - lastRefresh.getTime();
        if (timeSinceRefresh > 30000) {
          fetchTodayUsage(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchTodayUsage, lastRefresh]);

  // Auto-refresh every 60 seconds when page is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchTodayUsage(true);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchTodayUsage]);

  const toggleExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true,
    });
  };

  const calculateLogTotal = (log: UsageLog) => {
    return log.assembly.items.reduce((total, item) => {
      return total + (item.equipment.pricePerUnit * item.quantity * log.quantity);
    }, 0);
  };

  const handleDelete = async (logId: string) => {
    if (!confirm("Are you sure you want to remove this usage? The inventory will be restored.")) {
      return;
    }

    setDeletingId(logId);
    try {
      const response = await fetch(`/api/assemblies/usage/${logId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLogs(prev => prev.filter(log => log.id !== logId));
        fetchTodayUsage();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete usage");
      }
    } catch (error) {
      console.error("Error deleting usage:", error);
      alert("Failed to delete usage");
    } finally {
      setDeletingId(null);
    }
  };

  const getUserDisplayName = (user: UsageLog["user"]) => {
    if (user.name) return user.name;
    // Fallback to email prefix
    return user.email.split("@")[0];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="px-4 py-4 sm:px-6 sm:py-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Today&apos;s Usage</h1>
                <p className="text-muted-foreground text-sm">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
            <button 
              onClick={() => fetchTodayUsage(true)}
              disabled={refreshing}
              className="p-2.5 hover:bg-muted rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-5 w-5 text-muted-foreground", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-2xl mx-auto space-y-5 sm:space-y-6">
        {/* Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-card rounded-2xl p-4 sm:p-5 border animate-pulse">
              <div className="h-4 w-20 bg-muted rounded mb-2" />
              <div className="h-8 w-12 bg-muted rounded" />
            </div>
            <div className="bg-card rounded-2xl p-4 sm:p-5 border animate-pulse">
              <div className="h-4 w-20 bg-muted rounded mb-2" />
              <div className="h-8 w-12 bg-muted rounded" />
            </div>
          </div>
        ) : summary && summary.logCount > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-card rounded-2xl p-4 sm:p-5 border">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Assemblies</p>
                  <p className="text-xl sm:text-2xl font-bold">{summary.totalAssemblies}</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-4 sm:p-5 border">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Items Used</p>
                  <p className="text-xl sm:text-2xl font-bold">{summary.totalItems}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Usage Logs */}
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold">Usage Log</h2>
            <Link href="/field/assemblies">
              <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Log Usage</span>
                <span className="sm:hidden">Log</span>
              </button>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card rounded-2xl p-4 sm:p-5 border animate-pulse">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-10 w-10 rounded-xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 sm:p-10 border text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Package className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
              </div>
              <p className="font-medium">No usage logged today</p>
              <p className="text-muted-foreground text-sm mt-1 mb-4">Start by logging an assembly</p>
              <Link href="/field/assemblies">
                <button className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors">
                  Log Usage
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                const logTotal = calculateLogTotal(log);

                return (
                  <div key={log.id} className="bg-card rounded-2xl border overflow-hidden">
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="w-full p-4 sm:p-5 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate text-sm sm:text-base">{log.assembly.name}</h3>
                            <span className="text-sm text-muted-foreground shrink-0">×{log.quantity}</span>
                          </div>
                          {/* User signature and time */}
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs sm:text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="font-medium">{getUserDisplayName(log.user)}</span>
                            <span>•</span>
                            <span>{formatTime(log.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-medium">{formatCurrency(logTotal)}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t">
                        {/* Items list */}
                        <div className="pt-3 sm:pt-4 space-y-2">
                          {log.assembly.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm py-1.5 sm:py-2">
                              <span className="text-muted-foreground truncate flex-1 mr-2">{item.equipment.name}</span>
                              <span className="font-medium shrink-0">×{item.quantity * log.quantity}</span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Logged by info */}
                        <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span>Logged by {getUserDisplayName(log.user)}</span>
                            <span>{new Date(log.createdAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}</span>
                          </div>
                        </div>

                        {/* Delete button */}
                        <div className="pt-3 sm:pt-4 border-t mt-3 sm:mt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(log.id);
                            }}
                            disabled={deletingId === log.id}
                            className="flex items-center justify-center gap-2 w-full py-2 sm:py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingId === log.id ? "Removing..." : "Remove Usage"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Last refresh indicator */}
        {!loading && logs.length > 0 && (
          <p className="text-center text-xs text-muted-foreground pt-2">
            Last updated: {lastRefresh.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}
          </p>
        )}
      </div>
    </div>
  );
}
