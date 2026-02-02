"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Package,
  Layers,
  FolderTree,
  Activity,
  Plus,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

export type SidebarSection = 
  | "equipment-all" 
  | "equipment-low" 
  | "equipment-out"
  | "assemblies-all"
  | "assemblies-pending"
  | "assemblies-approved"
  | "assemblies-draft"
  | "assemblies-rejected"
  | "categories"
  | "activity";

interface SidebarStats {
  totalEquipment: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalAssemblies: number;
  pendingCount: number;
  approvedCount: number;
  draftCount: number;
  rejectedCount: number;
}

interface InventorySidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  stats: SidebarStats;
  onCreateAssembly: () => void;
  collapsed?: boolean;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  section: SidebarSection;
  activeSection: SidebarSection;
  onClick: () => void;
  badge?: number;
  badgeVariant?: "default" | "warning" | "destructive" | "success";
  indent?: boolean;
}

function NavItem({ 
  icon: Icon, 
  label, 
  section, 
  activeSection, 
  onClick, 
  badge,
  badgeVariant = "default",
  indent = false,
}: NavItemProps) {
  const isActive = activeSection === section;
  
  const badgeColors = {
    default: "bg-slate-100 text-slate-600",
    warning: "bg-yellow-100 text-yellow-700",
    destructive: "bg-red-100 text-red-700",
    success: "bg-green-100 text-green-700",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
        indent && "pl-8",
        isActive 
          ? "bg-orange-50 text-orange-700 font-medium" 
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-orange-600")} />
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          "px-1.5 py-0.5 text-xs font-medium rounded-full",
          badgeColors[badgeVariant]
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

interface NavGroupProps {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: number;
  badgeVariant?: "default" | "warning" | "destructive" | "success";
}

function NavGroup({ label, icon: Icon, children, defaultExpanded = true, badge, badgeVariant = "default" }: NavGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const badgeColors = {
    default: "bg-slate-100 text-slate-600",
    warning: "bg-yellow-100 text-yellow-700",
    destructive: "bg-red-100 text-red-700",
    success: "bg-green-100 text-green-700",
  };

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-left">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className={cn(
            "px-1.5 py-0.5 text-xs font-medium rounded-full",
            badgeColors[badgeVariant]
          )}>
            {badge}
          </span>
        )}
      </button>
      {expanded && (
        <div className="mt-1 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

export function InventorySidebar({
  activeSection,
  onSectionChange,
  stats,
  onCreateAssembly,
  collapsed = false,
}: InventorySidebarProps) {
  if (collapsed) {
    return null; // Mobile will use a different approach
  }

  return (
    <div className="w-64 h-full flex flex-col bg-white border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <Package className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Inventory</h2>
            <p className="text-xs text-slate-500">Equipment & Assemblies</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Equipment Section */}
        <NavGroup 
          label="Equipment" 
          icon={Package}
          badge={stats.lowStockCount + stats.outOfStockCount}
          badgeVariant={stats.outOfStockCount > 0 ? "destructive" : stats.lowStockCount > 0 ? "warning" : "default"}
        >
          <NavItem
            icon={Package}
            label="All Equipment"
            section="equipment-all"
            activeSection={activeSection}
            onClick={() => onSectionChange("equipment-all")}
            badge={stats.totalEquipment}
          />
          <NavItem
            icon={AlertTriangle}
            label="Low Stock"
            section="equipment-low"
            activeSection={activeSection}
            onClick={() => onSectionChange("equipment-low")}
            badge={stats.lowStockCount}
            badgeVariant="warning"
            indent
          />
          <NavItem
            icon={XCircle}
            label="Out of Stock"
            section="equipment-out"
            activeSection={activeSection}
            onClick={() => onSectionChange("equipment-out")}
            badge={stats.outOfStockCount}
            badgeVariant="destructive"
            indent
          />
        </NavGroup>

        {/* Assemblies Section */}
        <NavGroup 
          label="Assemblies" 
          icon={Layers}
          badge={stats.pendingCount}
          badgeVariant="warning"
        >
          <NavItem
            icon={Layers}
            label="All Assemblies"
            section="assemblies-all"
            activeSection={activeSection}
            onClick={() => onSectionChange("assemblies-all")}
            badge={stats.totalAssemblies}
          />
          <NavItem
            icon={Clock}
            label="Pending Approval"
            section="assemblies-pending"
            activeSection={activeSection}
            onClick={() => onSectionChange("assemblies-pending")}
            badge={stats.pendingCount}
            badgeVariant="warning"
            indent
          />
          <NavItem
            icon={CheckCircle}
            label="Approved"
            section="assemblies-approved"
            activeSection={activeSection}
            onClick={() => onSectionChange("assemblies-approved")}
            badge={stats.approvedCount}
            badgeVariant="success"
            indent
          />
          <NavItem
            icon={Clock}
            label="Drafts"
            section="assemblies-draft"
            activeSection={activeSection}
            onClick={() => onSectionChange("assemblies-draft")}
            badge={stats.draftCount}
            indent
          />
        </NavGroup>

        {/* Categories Section */}
        <NavGroup label="Categories" icon={FolderTree} defaultExpanded={false}>
          <NavItem
            icon={FolderTree}
            label="Manage Categories"
            section="categories"
            activeSection={activeSection}
            onClick={() => onSectionChange("categories")}
          />
        </NavGroup>

        {/* Divider */}
        <div className="border-t my-2" />

        {/* Activity */}
        <NavItem
          icon={Activity}
          label="Recent Activity"
          section="activity"
          activeSection={activeSection}
          onClick={() => onSectionChange("activity")}
        />
      </div>

      {/* Footer - Create Assembly Button */}
      <div className="p-3 border-t">
        <Button 
          onClick={onCreateAssembly}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Assembly
        </Button>
      </div>
    </div>
  );
}
