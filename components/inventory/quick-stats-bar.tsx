"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Package,
  Layers,
  AlertTriangle,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { SidebarSection } from "./inventory-sidebar";

interface QuickStatsBarProps {
  stats: {
    totalEquipment: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalAssemblies: number;
    pendingCount: number;
    approvedCount: number;
    draftCount: number;
    rejectedCount: number;
    totalInventoryValue: number;
  };
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
}

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  section?: SidebarSection;
  activeSection: SidebarSection;
  onClick?: () => void;
  variant?: "default" | "warning" | "danger" | "success";
  isCurrency?: boolean;
}

function StatItem({ 
  icon: Icon, 
  label, 
  value, 
  section, 
  activeSection, 
  onClick,
  variant = "default",
  isCurrency = false,
}: StatItemProps) {
  const isActive = section && activeSection === section;
  
  const variantStyles = {
    default: "text-slate-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
    success: "text-green-600",
  };

  const content = (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
      onClick && "cursor-pointer hover:bg-white/80",
      isActive && "bg-white shadow-sm ring-1 ring-orange-200"
    )}>
      <Icon className={cn("h-4 w-4", variantStyles[variant])} />
      <span className="text-xs text-slate-500 hidden sm:inline">{label}</span>
      <span className={cn(
        "text-sm font-semibold tabular-nums",
        variantStyles[variant]
      )}>
        {isCurrency ? formatCurrency(value as number) : value.toLocaleString()}
      </span>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="outline-none">
        {content}
      </button>
    );
  }

  return content;
}

export function QuickStatsBar({ stats, activeSection, onSectionChange }: QuickStatsBarProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="bg-slate-100/50 border-b px-4 py-1">
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <ChevronDown className="h-3 w-3" />
          Show stats
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-100/50 border-b px-4 py-2 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {/* Equipment stats */}
          <StatItem
            icon={Package}
            label="Equipment"
            value={stats.totalEquipment}
            section="equipment-all"
            activeSection={activeSection}
            onClick={() => onSectionChange("equipment-all")}
          />
          
          {stats.lowStockCount > 0 && (
            <StatItem
              icon={AlertTriangle}
              label="Low Stock"
              value={stats.lowStockCount}
              section="equipment-low"
              activeSection={activeSection}
              onClick={() => onSectionChange("equipment-low")}
              variant="warning"
            />
          )}
          
          {stats.outOfStockCount > 0 && (
            <StatItem
              icon={AlertTriangle}
              label="Out"
              value={stats.outOfStockCount}
              section="equipment-out"
              activeSection={activeSection}
              onClick={() => onSectionChange("equipment-out")}
              variant="danger"
            />
          )}

          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

          {/* Assembly stats */}
          <StatItem
            icon={Layers}
            label="Assemblies"
            value={stats.totalAssemblies}
            section="assemblies-all"
            activeSection={activeSection}
            onClick={() => onSectionChange("assemblies-all")}
          />
          
          {stats.pendingCount > 0 && (
            <StatItem
              icon={Clock}
              label="Pending"
              value={stats.pendingCount}
              section="assemblies-pending"
              activeSection={activeSection}
              onClick={() => onSectionChange("assemblies-pending")}
              variant="warning"
            />
          )}

          <div className="w-px h-6 bg-slate-200 mx-1 hidden lg:block" />

          {/* Value */}
          <div className="hidden lg:block">
            <StatItem
              icon={DollarSign}
              label="Value"
              value={stats.totalInventoryValue}
              activeSection={activeSection}
              isCurrency
              variant="success"
            />
          </div>
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
