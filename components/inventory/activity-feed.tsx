"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Package,
  Layers,
  AlertTriangle,
  Check,
  Clock,
  User,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: "usage" | "stock_alert" | "assembly_created" | "assembly_approved" | "assembly_rejected" | "sync";
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
  metadata?: {
    assemblyId?: string;
    assemblyName?: string;
    equipmentId?: string;
    equipmentName?: string;
    quantity?: number;
    jobId?: string;
    jobName?: string;
  };
}

// Mock activity data - in production this would come from an API
function generateMockActivity(): ActivityItem[] {
  const now = new Date();
  
  return [
    {
      id: "1",
      type: "usage",
      title: "Assembly Used",
      description: "Standard Terminal Pole × 3",
      timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(), // 30 min ago
      user: "Field User",
      metadata: {
        assemblyName: "Standard Terminal Pole",
        quantity: 3,
        jobName: "West Mountain Build",
      },
    },
    {
      id: "2",
      type: "stock_alert",
      title: "Low Stock Alert",
      description: "14\" Machine Bolt is running low (45 remaining)",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      metadata: {
        equipmentName: "14\" Machine Bolt",
        quantity: 45,
      },
    },
    {
      id: "3",
      type: "assembly_approved",
      title: "Assembly Approved",
      description: "Corner Pole v2 was approved",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
      user: "Admin User",
      metadata: {
        assemblyName: "Corner Pole v2",
      },
    },
    {
      id: "4",
      type: "assembly_created",
      title: "New Assembly",
      description: "Splice Case Extended submitted for approval",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
      user: "Manager User",
      metadata: {
        assemblyName: "Splice Case Extended",
      },
    },
    {
      id: "5",
      type: "sync",
      title: "BoxHero Sync",
      description: "Synced 156 items, 3 updated",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
    },
    {
      id: "6",
      type: "usage",
      title: "Assembly Used",
      description: "Standard Tangent Pole × 12",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      user: "Field User",
      metadata: {
        assemblyName: "Standard Tangent Pole",
        quantity: 12,
        jobName: "Main Street Extension",
      },
    },
  ];
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function getActivityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "usage":
      return Layers;
    case "stock_alert":
      return AlertTriangle;
    case "assembly_created":
      return Layers;
    case "assembly_approved":
      return Check;
    case "assembly_rejected":
      return AlertTriangle;
    case "sync":
      return RefreshCw;
    default:
      return Activity;
  }
}

function getActivityColor(type: ActivityItem["type"]) {
  switch (type) {
    case "usage":
      return "bg-blue-100 text-blue-600";
    case "stock_alert":
      return "bg-yellow-100 text-yellow-600";
    case "assembly_created":
      return "bg-purple-100 text-purple-600";
    case "assembly_approved":
      return "bg-green-100 text-green-600";
    case "assembly_rejected":
      return "bg-red-100 text-red-600";
    case "sync":
      return "bg-orange-100 text-orange-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function ActivityItemCard({ item }: { item: ActivityItem }) {
  const Icon = getActivityIcon(item.type);
  const colorClass = getActivityColor(item.type);

  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{item.title}</p>
            {item.description && (
              <p className="text-sm text-slate-600 mt-0.5">{item.description}</p>
            )}
          </div>
          <span className="text-xs text-slate-400 shrink-0">
            {formatRelativeTime(item.timestamp)}
          </span>
        </div>
        {(item.user || item.metadata?.jobName) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
            {item.user && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {item.user}
              </span>
            )}
            {item.metadata?.jobName && (
              <>
                <ArrowRight className="h-3 w-3" />
                <span>{item.metadata.jobName}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    // Simulate API call
    const fetchActivity = async () => {
      setLoading(true);
      try {
        // In production, this would be an API call:
        // const response = await fetch("/api/activity/inventory");
        // const data = await response.json();
        
        // For now, use mock data
        await new Promise((resolve) => setTimeout(resolve, 500));
        setActivities(generateMockActivity());
      } catch (error) {
        console.error("Failed to fetch activity:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  const filteredActivities = activities.filter((activity) => {
    if (filter === "all") return true;
    return activity.type === filter;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          <p className="text-sm text-slate-500">Track inventory changes and usage</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activity</SelectItem>
            <SelectItem value="usage">Usage</SelectItem>
            <SelectItem value="stock_alert">Stock Alerts</SelectItem>
            <SelectItem value="assembly_created">New Assemblies</SelectItem>
            <SelectItem value="assembly_approved">Approvals</SelectItem>
            <SelectItem value="sync">Sync</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activity List */}
      <Card>
        <CardContent className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Activity className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No activity found</p>
              <p className="text-sm mt-1">Activity will appear here as you use the system</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredActivities.map((activity) => (
                <ActivityItemCard key={activity.id} item={activity} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Load More */}
      {!loading && filteredActivities.length > 0 && (
        <div className="text-center">
          <Button variant="outline" size="sm">
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
