"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Layers, 
  DollarSign, 
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
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

export default function ManagerTodayPage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const fetchTodayUsage = async () => {
    try {
      // Manager sees all team members' usage
      const response = await fetch("/api/assemblies/usage/today?all=true");
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
  };

  useEffect(() => {
    fetchTodayUsage();
  }, []);

  const toggleLogExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculateLogCost = (log: UsageLog) => {
    let total = 0;
    for (const item of log.assembly.items) {
      total += item.equipment.pricePerUnit * item.quantity * log.quantity;
    }
    return total;
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Today&apos;s Usage" 
        description="Team equipment usage summary for today"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchTodayUsage}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Link href="/manager/assemblies">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Log Usage
              </Button>
            </Link>
          </div>
        }
      />

      {/* Summary Stats */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Assemblies Used</p>
                  <p className="text-3xl font-bold">{summary.totalAssemblies}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Items Used</p>
                  <p className="text-3xl font-bold">{summary.totalItems}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Package className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-3xl font-bold">{formatCurrency(summary.totalCost)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Logs Today</p>
                  <p className="text-3xl font-bold">{summary.logCount}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Usage Logs */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Usage Log</CardTitle>
          <CardDescription>Detailed breakdown of today&apos;s activity across your team</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No usage logged today</h3>
              <p className="text-muted-foreground mb-4">
                No assemblies have been logged by your team today
              </p>
              <Link href="/manager/assemblies">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Assembly Usage
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                const logCost = calculateLogCost(log);

                return (
                  <div 
                    key={log.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleLogExpanded(log.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Layers className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{log.assembly.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <span>{log.quantity}× at {formatTime(log.createdAt)}</span>
                            <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
                              <User className="h-3 w-3" />
                              {log.user.name || log.user.email}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(logCost)}</p>
                          <p className="text-sm text-muted-foreground">
                            {log.assembly.items.length} items
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t bg-muted/30 p-4">
                        <p className="text-sm font-medium mb-3">Equipment breakdown:</p>
                        <div className="space-y-2">
                          {log.assembly.items.map((item) => (
                            <div 
                              key={item.id}
                              className="flex items-center justify-between p-2 bg-background rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                {item.equipment.photoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img 
                                    src={item.equipment.photoUrl} 
                                    alt={item.equipment.name}
                                    className="h-8 w-8 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="font-medium">{item.equipment.name}</span>
                              </div>
                              <div className="text-right text-sm">
                                <span className="font-medium">
                                  ×{item.quantity * log.quantity}
                                </span>
                                <span className="text-muted-foreground ml-2">
                                  ({formatCurrency(item.equipment.pricePerUnit * item.quantity * log.quantity)})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Modifiers */}
                        {log.modifiers && log.modifiers.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-2">Extra equipment:</p>
                            <div className="text-sm text-muted-foreground">
                              {log.modifiers.map((mod, i) => (
                                <span key={i}>
                                  {i > 0 && ", "}
                                  ×{mod.quantity} equipment
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-4 pt-4 border-t flex justify-between">
                          <span className="font-medium">Total</span>
                          <span className="font-bold">{formatCurrency(logCost)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

