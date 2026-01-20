"use client";

import { useEffect, useRef } from "react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface NodeTypeBase {
  name: string;
  icon: string | null;
  color: string | null;
}

interface MapNodeBase {
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  nodeType: NodeTypeBase;
}

interface MapRouteBase {
  id: string;
  routeType: string;
  fiberCount: number | null;
  footage: number;
  fromNode: {
    id: string;
    name: string | null;
    nodeType: NodeTypeBase;
  };
  toNode: {
    id: string;
    name: string | null;
    nodeType: NodeTypeBase;
  };
}

// Generic element type that accepts any MapNode/MapRoute with the required fields
type ElementType = 
  | { type: "node"; data: MapNodeBase }
  | { type: "route"; data: MapRouteBase };

interface ElementPickerProps<T extends ElementType = ElementType> {
  elements: T[];
  position: { x: number; y: number };
  onSelect: (element: T) => void;
  onClose: () => void;
}

// Get Lucide icon component by name
function getLucideIcon(iconName: string | null): React.ComponentType<{ className?: string }> {
  if (!iconName) return LucideIcons.Circle;
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const Icon = icons[iconName];
  return Icon || LucideIcons.Circle;
}

// Get route display info
function getRouteDisplay(route: MapRouteBase) {
  const routeTypeDisplay = route.routeType === "strand_only" 
    ? "Strand" 
    : route.routeType === "mst"
    ? `MST ${route.fiberCount}`
    : `Fiber ${route.fiberCount}`;
  
  const fromName = route.fromNode.name || route.fromNode.nodeType.name;
  const toName = route.toNode.name || route.toNode.nodeType.name;
  
  return {
    label: routeTypeDisplay,
    destination: `${fromName} → ${toName}`,
  };
}

// Get route color
function getRouteColor(routeType: string, fiberCount: number | null): string {
  if (routeType === "strand_only") return "#6B7280";
  if (routeType === "mst") return "#F59E0B";
  
  const fiberColors: Record<number, string> = {
    12: "#10B981",
    24: "#3B82F6",
    48: "#8B5CF6",
    96: "#EC4899",
    144: "#F97316",
    288: "#EF4444",
  };
  
  return fiberCount ? fiberColors[fiberCount] || "#8B5CF6" : "#8B5CF6";
}

export function ElementPicker({
  elements,
  position,
  onSelect,
  onClose,
}: ElementPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // Close on escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
  
  if (elements.length === 0) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[1000]"
        onClick={onClose}
      />
      
      {/* Picker */}
      <div
        ref={containerRef}
        className="fixed z-[1001] bg-white rounded-lg shadow-xl border overflow-hidden"
        style={{
          left: position.x,
          top: position.y,
          transform: "translate(-50%, -100%) translateY(-8px)",
          minWidth: 200,
          maxWidth: 280,
        }}
      >
        <div className="px-3 py-2 bg-muted/50 border-b">
          <span className="text-xs font-medium text-muted-foreground">
            Select Element
          </span>
        </div>
        
        <div className="py-1">
          {elements.map((element, index) => {
            if (element.type === "node") {
              const node = element.data;
              const Icon = getLucideIcon(node.nodeType.icon);
              const name = node.name || node.nodeType.name;
              
              return (
                <button
                  key={`node-${node.id}`}
                  className={cn(
                    "w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors",
                    "text-left min-h-[48px]" // Touch-friendly height
                  )}
                  onClick={() => onSelect(element)}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: node.nodeType.color || "#6B7280" }}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{name}</div>
                    <div className="text-xs text-muted-foreground">Node</div>
                  </div>
                </button>
              );
            } else {
              const route = element.data;
              const display = getRouteDisplay(route);
              const color = getRouteColor(route.routeType, route.fiberCount);
              
              return (
                <button
                  key={`route-${route.id}`}
                  className={cn(
                    "w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors",
                    "text-left min-h-[48px]" // Touch-friendly height
                  )}
                  onClick={() => onSelect(element)}
                >
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    <div 
                      className="w-6 h-1 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{display.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {display.destination}
                    </div>
                  </div>
                </button>
              );
            }
          })}
        </div>
      </div>
    </>
  );
}

export default ElementPicker;
