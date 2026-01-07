"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricsSkeleton, PageContent } from "@/components/layout/page-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

interface Metrics {
  period: string;
  totalCost: number;
  avgCostPerDay: number;
  mostCommon: Array<{
    equipmentName: string;
    totalUsed: number;
    cost: number;
  }>;
  mostExpensive: Array<{
    equipmentName: string;
    totalUsed: number;
    cost: number;
  }>;
  equipmentUsage: Array<{
    equipmentName: string;
    totalUsed: number;
    cost: number;
  }>;
  assemblyUsage: Array<{
    assemblyName: string;
    totalUsed: number;
  }>;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/metrics?period=${period}`);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <MetricsSkeleton />;
  }

  if (!metrics) {
    return <div>No metrics available</div>;
  }

  return (
    <PageContent>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Metrics & Analytics</h1>
          <p className="text-muted-foreground">View equipment usage and cost analysis</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Last 24 Hours</SelectItem>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalCost)}</div>
            <p className="text-xs text-muted-foreground">Period: {period}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Avg Cost/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.avgCostPerDay)}</div>
            <p className="text-xs text-muted-foreground">Average daily cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Equipment Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.equipmentUsage.length}</div>
            <p className="text-xs text-muted-foreground">Tracked equipment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Assemblies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.assemblyUsage.length}</div>
            <p className="text-xs text-muted-foreground">Total assemblies</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most Common Equipment</CardTitle>
            <CardDescription>Most frequently used equipment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.mostCommon.slice(0, 10).map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">{item.equipmentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.totalUsed} units used
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(item.cost)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Expensive Equipment</CardTitle>
            <CardDescription>Highest cost equipment usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.mostExpensive.slice(0, 10).map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">{item.equipmentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.totalUsed} units used
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(item.cost)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </PageContent>
  );
}


