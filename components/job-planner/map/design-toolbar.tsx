"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MousePointer,
  Trash2,
  ChevronDown,
  Cable,
  GitBranch,
  Minus,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

export type DesignMode = 
  | "select" 
  | "add_node" 
  | "connect_strand" 
  | "connect_fiber" 
  | "connect_mst"
  | "delete";

export type FiberCount = 12 | 24 | 48 | 96 | 144 | 288;

export interface NodeType {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface DesignToolbarProps {
  mode: DesignMode;
  onModeChange: (mode: DesignMode) => void;
  selectedNodeType: NodeType | null;
  onNodeTypeSelect: (nodeType: NodeType) => void;
  nodeTypes: NodeType[];
  fiberCount: FiberCount;
  onFiberCountChange: (count: FiberCount) => void;
  onDelete: () => void;
  hasSelection: boolean;
  disabled?: boolean;
}

// Get Lucide icon component by name
function getLucideIcon(iconName: string | null): React.ComponentType<{ className?: string }> {
  if (!iconName) return LucideIcons.Circle;
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const Icon = icons[iconName];
  return Icon || LucideIcons.Circle;
}

// Fiber count colors
const FIBER_COLORS: Record<FiberCount, string> = {
  12: "#10B981",  // emerald
  24: "#3B82F6",  // blue
  48: "#8B5CF6",  // violet
  96: "#EC4899",  // pink
  144: "#F97316", // orange
  288: "#EF4444", // red
};

export function DesignToolbar({
  mode,
  onModeChange,
  selectedNodeType,
  onNodeTypeSelect,
  nodeTypes,
  fiberCount,
  onFiberCountChange,
  onDelete,
  hasSelection,
  disabled = false,
}: DesignToolbarProps) {
  const [nodeDropdownOpen, setNodeDropdownOpen] = useState(false);
  const [fiberDropdownOpen, setFiberDropdownOpen] = useState(false);
  const [mstDropdownOpen, setMstDropdownOpen] = useState(false);

  const handleNodeTypeClick = (nodeType: NodeType) => {
    setNodeDropdownOpen(false);
    // Use setTimeout to avoid state updates during radix-ui's internal render cycle
    setTimeout(() => {
      onNodeTypeSelect(nodeType);
    }, 0);
  };

  const handleFiberCountSelect = (count: FiberCount) => {
    setFiberDropdownOpen(false);
    // Use setTimeout to avoid state updates during radix-ui's internal render cycle
    setTimeout(() => {
      onFiberCountChange(count);
      onModeChange("connect_fiber");
    }, 0);
  };

  const handleMstCountSelect = (count: FiberCount) => {
    setMstDropdownOpen(false);
    // Use setTimeout to avoid state updates during radix-ui's internal render cycle
    setTimeout(() => {
      onFiberCountChange(count);
      onModeChange("connect_mst");
    }, 0);
  };

  const SelectedNodeIcon = selectedNodeType ? getLucideIcon(selectedNodeType.icon) : Plus;

  return (
    <div className="flex items-center gap-1 bg-white rounded-lg shadow-lg border p-1">
      {/* Add Node Dropdown */}
      <DropdownMenu open={nodeDropdownOpen} onOpenChange={setNodeDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={mode === "add_node" ? "default" : "ghost"}
            size="sm"
            disabled={disabled}
            className={cn(
              "h-9 px-3 gap-1.5",
              mode === "add_node" && "bg-primary text-primary-foreground"
            )}
          >
            {selectedNodeType ? (
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: selectedNodeType.color || "#6B7280" }}
              >
                <SelectedNodeIcon className="w-2.5 h-2.5 text-white" />
              </div>
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span className="text-xs font-medium">
              {selectedNodeType?.name || "Add Node"}
            </span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Select Node Type
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {nodeTypes.map((nodeType) => {
            const Icon = getLucideIcon(nodeType.icon);
            return (
              <DropdownMenuItem
                key={nodeType.id}
                onClick={() => handleNodeTypeClick(nodeType)}
                className="cursor-pointer"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center mr-2"
                  style={{ backgroundColor: nodeType.color || "#6B7280" }}
                >
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span>{nodeType.name}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Strand Connect Button */}
      <Button
        variant={mode === "connect_strand" ? "default" : "ghost"}
        size="sm"
        disabled={disabled}
        onClick={() => onModeChange("connect_strand")}
        className={cn(
          "h-9 px-3 gap-1.5",
          mode === "connect_strand" && "bg-gray-700 text-white hover:bg-gray-800"
        )}
        title="Connect with Strand"
      >
        <Minus className="w-4 h-4" />
        <span className="text-xs font-medium">Strand</span>
      </Button>

      {/* Fiber Connect Dropdown */}
      <DropdownMenu open={fiberDropdownOpen} onOpenChange={setFiberDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={mode === "connect_fiber" ? "default" : "ghost"}
            size="sm"
            disabled={disabled}
            className={cn(
              "h-9 px-3 gap-1.5",
              mode === "connect_fiber" && "text-white"
            )}
            style={mode === "connect_fiber" ? { backgroundColor: FIBER_COLORS[fiberCount] } : {}}
            title="Connect with Fiber"
          >
            <Cable className="w-4 h-4" />
            <span className="text-xs font-medium">Fiber {fiberCount}</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Fiber Count
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {([12, 24, 48, 96, 144, 288] as FiberCount[]).map((count) => (
            <DropdownMenuItem
              key={count}
              onClick={() => handleFiberCountSelect(count)}
              className="cursor-pointer"
            >
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: FIBER_COLORS[count] }}
              />
              <span>{count}-count</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* MST Connect Dropdown */}
      <DropdownMenu open={mstDropdownOpen} onOpenChange={setMstDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={mode === "connect_mst" ? "default" : "ghost"}
            size="sm"
            disabled={disabled}
            className={cn(
              "h-9 px-3 gap-1.5",
              mode === "connect_mst" && "bg-amber-500 text-white hover:bg-amber-600"
            )}
            title="Connect with MST (fiber only)"
          >
            <GitBranch className="w-4 h-4" />
            <span className="text-xs font-medium">MST {mode === "connect_mst" ? fiberCount : ""}</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            MST Fiber Count
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {([12, 24, 48, 96, 144, 288] as FiberCount[]).map((count) => (
            <DropdownMenuItem
              key={count}
              onClick={() => handleMstCountSelect(count)}
              className="cursor-pointer"
            >
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: FIBER_COLORS[count] }}
              />
              <span>{count}-count</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Select Mode */}
      <Button
        variant={mode === "select" ? "default" : "ghost"}
        size="sm"
        disabled={disabled}
        onClick={() => onModeChange("select")}
        className={cn(
          "h-9 px-3 gap-1.5",
          mode === "select" && "bg-primary text-primary-foreground"
        )}
        title="Select Mode (Escape)"
      >
        <MousePointer className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">Select</span>
      </Button>

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled || !hasSelection}
        onClick={onDelete}
        className="h-9 px-3 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
        title="Delete Selected"
      >
        <Trash2 className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">Delete</span>
      </Button>
    </div>
  );
}

export default DesignToolbar;
