"use client";

import { Polyline, Tooltip } from "react-leaflet";

export type RouteType = "strand_only" | "fiber" | "mst";
export type FiberCount = 12 | 24 | 48 | 96 | 144 | 288;

interface MapRoute {
  id: string;
  routeType: RouteType;
  fiberCount: number | null;
  footage: number;
  fromNode: {
    id: string;
    name: string | null;
    lat: number;
    lng: number;
    nodeType: {
      name: string;
      icon: string | null;
      color: string | null;
    };
  };
  toNode: {
    id: string;
    name: string | null;
    lat: number;
    lng: number;
    nodeType: {
      name: string;
      icon: string | null;
      color: string | null;
    };
  };
}

interface RouteLineProps {
  route: MapRoute;
  isSelected: boolean;
  onClick: (route: MapRoute) => void;
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

// Get route color based on type and fiber count
function getRouteColor(routeType: RouteType, fiberCount: number | null): string {
  if (routeType === "strand_only") {
    return "#6B7280"; // gray
  }
  if (routeType === "mst") {
    return "#F59E0B"; // amber
  }
  // fiber route
  if (fiberCount && fiberCount in FIBER_COLORS) {
    return FIBER_COLORS[fiberCount as FiberCount];
  }
  return "#8B5CF6"; // default violet
}

// Get dash pattern based on route type
function getDashArray(routeType: RouteType): string | undefined {
  if (routeType === "strand_only") {
    return undefined; // solid line
  }
  if (routeType === "mst") {
    return "4, 8"; // dotted
  }
  // fiber route
  return "10, 6"; // dashed
}

// Get line weight based on route type
function getWeight(routeType: RouteType): number {
  if (routeType === "strand_only") {
    return 3;
  }
  if (routeType === "mst") {
    return 3;
  }
  return 4; // fiber is thicker
}

export function RouteLine({ route, isSelected, onClick }: RouteLineProps) {
  const color = getRouteColor(route.routeType, route.fiberCount);
  const dashArray = getDashArray(route.routeType);
  const weight = getWeight(route.routeType);
  
  const positions: [number, number][] = [
    [route.fromNode.lat, route.fromNode.lng],
    [route.toNode.lat, route.toNode.lng],
  ];
  
  // Format footage for display
  const footageDisplay = route.footage.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  
  // Build tooltip content
  const fromName = route.fromNode.name || route.fromNode.nodeType.name;
  const toName = route.toNode.name || route.toNode.nodeType.name;
  const routeTypeDisplay = route.routeType === "strand_only" 
    ? "Strand" 
    : route.routeType === "mst"
    ? `MST ${route.fiberCount}`
    : `Fiber ${route.fiberCount}`;
  
  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: isSelected ? "#3B82F6" : color,
        weight: isSelected ? weight + 2 : weight,
        dashArray,
        opacity: isSelected ? 1 : 0.8,
        lineCap: "round",
        lineJoin: "round",
      }}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          onClick(route);
        },
      }}
    >
      <Tooltip sticky>
        <div className="text-xs">
          <div className="font-medium">{routeTypeDisplay}</div>
          <div className="text-muted-foreground">
            {fromName} → {toName}
          </div>
          <div className="text-muted-foreground">{footageDisplay} ft</div>
        </div>
      </Tooltip>
    </Polyline>
  );
}

// Preview line for connecting mode
interface RoutePreviewLineProps {
  fromPosition: [number, number];
  toPosition: [number, number];
  routeType: RouteType;
  fiberCount: number;
}

export function RoutePreviewLine({
  fromPosition,
  toPosition,
  routeType,
  fiberCount,
}: RoutePreviewLineProps) {
  const color = getRouteColor(routeType, fiberCount);
  const dashArray = getDashArray(routeType);
  
  return (
    <Polyline
      positions={[fromPosition, toPosition]}
      pathOptions={{
        color,
        weight: 3,
        dashArray,
        opacity: 0.6,
        lineCap: "round",
        lineJoin: "round",
      }}
    />
  );
}

export default RouteLine;
