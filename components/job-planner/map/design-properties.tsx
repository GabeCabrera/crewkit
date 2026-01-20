"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Trash2, Cable, Minus, GitBranch } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

export type FiberCount = 12 | 24 | 48 | 96 | 144 | 288;

interface NodeType {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  assemblyType?: {
    id: string;
    name: string;
  } | null;
}

interface MapNode {
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  nodeType: NodeType;
  nodeTypeId?: string;
}

interface MapRoute {
  id: string;
  routeType: "strand_only" | "fiber" | "mst";
  fiberCount: number | null;
  footage: number;
  fromNode: {
    id: string;
    name: string | null;
    nodeType: { name: string; icon: string | null; color: string | null };
  };
  toNode: {
    id: string;
    name: string | null;
    nodeType: { name: string; icon: string | null; color: string | null };
  };
}

type Selection = 
  | { type: "node"; data: MapNode }
  | { type: "route"; data: MapRoute }
  | null;

interface DesignPropertiesProps {
  selection: Selection;
  nodeTypes: NodeType[];
  onClose: () => void;
  onUpdateNode: (nodeId: string, updates: { name?: string; nodeTypeId?: string }) => void;
  onUpdateRoute: (routeId: string, updates: { routeType?: string; fiberCount?: number; footage?: number }) => void;
  onDelete: () => void;
  isSaving?: boolean;
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
  12: "#10B981",
  24: "#3B82F6",
  48: "#8B5CF6",
  96: "#EC4899",
  144: "#F97316",
  288: "#EF4444",
};

export function DesignProperties({
  selection,
  nodeTypes,
  onClose,
  onUpdateNode,
  onUpdateRoute,
  onDelete,
  isSaving = false,
}: DesignPropertiesProps) {
  const [nodeName, setNodeName] = useState("");
  const [routeFootage, setRouteFootage] = useState("");
  
  // Sync local state with selection
  useEffect(() => {
    if (selection?.type === "node") {
      setNodeName(selection.data.name || "");
    } else if (selection?.type === "route") {
      setRouteFootage(selection.data.footage.toString());
    }
  }, [selection]);
  
  if (!selection) return null;
  
  if (selection.type === "node") {
    const node = selection.data;
    const Icon = getLucideIcon(node.nodeType.icon);
    
    return (
      <div className="bg-white rounded-lg shadow-lg border overflow-hidden w-72">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: node.nodeType.color || "#6B7280" }}
            >
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-medium text-sm">Node Properties</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-3 space-y-4">
          {/* Node Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Node Type</Label>
            <Select
              value={node.nodeType.id}
              onValueChange={(value) => onUpdateNode(node.id, { nodeTypeId: value })}
              disabled={isSaving}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nodeTypes.map((type) => {
                  const TypeIcon = getLucideIcon(type.icon);
                  return (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: type.color || "#6B7280" }}
                        >
                          <TypeIcon className="w-3 h-3 text-white" />
                        </div>
                        <span>{type.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          {/* Custom Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Custom Name</Label>
            <Input
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              onBlur={() => {
                if (nodeName !== (node.name || "")) {
                  onUpdateNode(node.id, { name: nodeName || undefined });
                }
              }}
              placeholder={node.nodeType.name}
              className="h-9"
              disabled={isSaving}
            />
          </div>
          
          {/* Assembly Info */}
          {node.nodeType.assemblyType && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Assembly Type</Label>
              <div className="text-sm px-2 py-1.5 bg-muted/50 rounded">
                {node.nodeType.assemblyType.name}
              </div>
            </div>
          )}
          
          {/* Coordinates (read-only) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Latitude</Label>
              <div className="text-xs font-mono px-2 py-1.5 bg-muted/50 rounded">
                {node.lat.toFixed(6)}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Longitude</Label>
              <div className="text-xs font-mono px-2 py-1.5 bg-muted/50 rounded">
                {node.lng.toFixed(6)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-3 py-2 border-t bg-muted/30">
          <Button
            variant="destructive"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={onDelete}
            disabled={isSaving}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete Node
          </Button>
        </div>
      </div>
    );
  }
  
  // Route properties
  const route = selection.data;
  const RouteIcon = route.routeType === "strand_only" 
    ? Minus 
    : route.routeType === "mst" 
    ? GitBranch 
    : Cable;
  
  const routeColor = route.routeType === "strand_only"
    ? "#6B7280"
    : route.routeType === "mst"
    ? "#F59E0B"
    : route.fiberCount
    ? FIBER_COLORS[route.fiberCount as FiberCount]
    : "#8B5CF6";
  
  return (
    <div className="bg-white rounded-lg shadow-lg border overflow-hidden w-72">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: routeColor }}
          >
            <RouteIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-medium text-sm">Route Properties</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-4">
        {/* From/To */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Connection</Label>
          <div className="flex items-center gap-2 text-sm">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: route.fromNode.nodeType.color || "#6B7280" }}
            >
              {(() => {
                const FromIcon = getLucideIcon(route.fromNode.nodeType.icon);
                return <FromIcon className="w-3 h-3 text-white" />;
              })()}
            </div>
            <span className="truncate">
              {route.fromNode.name || route.fromNode.nodeType.name}
            </span>
            <span className="text-muted-foreground">→</span>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: route.toNode.nodeType.color || "#6B7280" }}
            >
              {(() => {
                const ToIcon = getLucideIcon(route.toNode.nodeType.icon);
                return <ToIcon className="w-3 h-3 text-white" />;
              })()}
            </div>
            <span className="truncate">
              {route.toNode.name || route.toNode.nodeType.name}
            </span>
          </div>
        </div>
        
        {/* Route Type */}
        <div className="space-y-1.5">
          <Label className="text-xs">Route Type</Label>
          <Select
            value={route.routeType}
            onValueChange={(value) => onUpdateRoute(route.id, { routeType: value })}
            disabled={isSaving}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strand_only">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 rounded-full bg-gray-500" />
                  <span>Strand Only</span>
                </div>
              </SelectItem>
              <SelectItem value="fiber">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 rounded-full bg-violet-500" />
                  <span>Fiber (+ Strand)</span>
                </div>
              </SelectItem>
              <SelectItem value="mst">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 rounded-full bg-amber-500" />
                  <span>MST (Fiber Only)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Fiber Count (only for fiber/mst) */}
        {(route.routeType === "fiber" || route.routeType === "mst") && (
          <div className="space-y-1.5">
            <Label className="text-xs">Fiber Count</Label>
            <Select
              value={route.fiberCount?.toString() || "48"}
              onValueChange={(value) => onUpdateRoute(route.id, { fiberCount: parseInt(value) })}
              disabled={isSaving}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {([12, 24, 48, 96, 144, 288] as FiberCount[]).map((count) => (
                  <SelectItem key={count} value={count.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: FIBER_COLORS[count] }}
                      />
                      <span>{count}-count</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Footage */}
        <div className="space-y-1.5">
          <Label className="text-xs">Footage</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={routeFootage}
              onChange={(e) => setRouteFootage(e.target.value)}
              onBlur={() => {
                const footage = parseFloat(routeFootage);
                if (!isNaN(footage) && footage !== route.footage) {
                  onUpdateRoute(route.id, { footage });
                }
              }}
              className="h-9"
              disabled={isSaving}
            />
            <span className="text-sm text-muted-foreground">ft</span>
          </div>
        </div>
        
        {/* Includes Strand indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className={cn(
            "w-2 h-2 rounded-full",
            route.routeType !== "mst" ? "bg-green-500" : "bg-gray-300"
          )} />
          <span>
            {route.routeType !== "mst" ? "Includes strand footage" : "No strand (MST)"}
          </span>
        </div>
      </div>
      
      {/* Footer */}
      <div className="px-3 py-2 border-t bg-muted/30">
        <Button
          variant="destructive"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={onDelete}
          disabled={isSaving}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Delete Route
        </Button>
      </div>
    </div>
  );
}

export default DesignProperties;
