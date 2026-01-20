"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { NodeMarker, nodeMarkerStyles } from "./node-marker";
import { RouteLine, RoutePreviewLine } from "./route-line";
import { DesignToolbar, DesignMode, FiberCount, NodeType } from "./design-toolbar";
import { DesignProperties } from "./design-properties";
import { ElementPicker } from "./element-picker";
import { JobMaterialsPanel } from "./job-materials-panel";

// Types
interface MapNode {
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  nodeType: NodeType & {
    assemblyType?: { id: string; name: string } | null;
  };
}

interface MapRoute {
  id: string;
  routeType: "strand_only" | "fiber" | "mst";
  fiberCount: number | null;
  footage: number;
  fromNode: {
    id: string;
    name: string | null;
    lat: number;
    lng: number;
    nodeType: { name: string; icon: string | null; color: string | null };
  };
  toNode: {
    id: string;
    name: string | null;
    lat: number;
    lng: number;
    nodeType: { name: string; icon: string | null; color: string | null };
  };
}

interface MaterialAllocation {
  id: string;
  quantity: number;
  unit: string;
  equipment: {
    id: string;
    name: string;
    sku: string;
    unitType: string;
  };
}

type Selection = 
  | { type: "node"; data: MapNode }
  | { type: "route"; data: MapRoute }
  | null;

interface NetworkDesignProps {
  jobId: string;
  enabled: boolean;
  canEdit: boolean;
}

// Helper to inject styles
function injectStyles() {
  const styleId = "node-marker-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = nodeMarkerStyles;
    document.head.appendChild(style);
  }
}

// Map event handler component
function MapEventHandler({
  mode,
  selectedNodeType,
  fiberCount,
  connectingFrom,
  onMapClick,
  onMouseMove,
}: {
  mode: DesignMode;
  selectedNodeType: NodeType | null;
  fiberCount: FiberCount;
  connectingFrom: MapNode | null;
  onMapClick: (lat: number, lng: number) => void;
  onMouseMove: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    mousemove: (e) => {
      if (connectingFrom) {
        onMouseMove(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  
  return null;
}

export function NetworkDesign({ jobId, enabled, canEdit }: NetworkDesignProps) {
  const map = useMap();
  
  // State
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [routes, setRoutes] = useState<MapRoute[]>([]);
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [allocations, setAllocations] = useState<MaterialAllocation[]>([]);
  const [totalStrandFootage, setTotalStrandFootage] = useState(0);
  const [fiberByCount, setFiberByCount] = useState<Record<number, number>>({});
  
  const [mode, setMode] = useState<DesignMode>("select");
  const [selectedNodeType, setSelectedNodeType] = useState<NodeType | null>(null);
  const [fiberCount, setFiberCount] = useState<FiberCount>(48);
  const [selection, setSelection] = useState<Selection>(null);
  const [connectingFrom, setConnectingFrom] = useState<MapNode | null>(null);
  const [mousePosition, setMousePosition] = useState<[number, number] | null>(null);
  
  const [pickerElements, setPickerElements] = useState<Array<{ type: "node"; data: MapNode } | { type: "route"; data: MapRoute }>>([]);
  const [pickerPosition, setPickerPosition] = useState<{ x: number; y: number } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Track mounted state to prevent hydration issues with radix-ui dropdowns
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Inject styles on mount
  useEffect(() => {
    injectStyles();
  }, []);
  
  // Fetch node types
  useEffect(() => {
    const fetchNodeTypes = async () => {
      try {
        const response = await fetch("/api/node-types");
        if (response.ok) {
          const data = await response.json();
          setNodeTypes(data);
          if (data.length > 0 && !selectedNodeType) {
            setSelectedNodeType(data[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching node types:", error);
      }
    };
    
    fetchNodeTypes();
  }, []);
  
  // Fetch design data
  useEffect(() => {
    const fetchDesignData = async () => {
      if (!enabled) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/job-plans/${jobId}/design`);
        if (response.ok) {
          const data = await response.json();
          setNodes(data.nodes || []);
          setRoutes(data.routes || []);
          setAllocations(data.allocations || []);
          setTotalStrandFootage(data.totalStrandFootage || 0);
          
          // Calculate fiber by count from routes
          const fiberTotals: Record<number, number> = {};
          for (const route of data.routes || []) {
            if (route.routeType === "fiber" || route.routeType === "mst") {
              if (route.fiberCount) {
                fiberTotals[route.fiberCount] = (fiberTotals[route.fiberCount] || 0) + route.footage;
              }
            }
          }
          setFiberByCount(fiberTotals);
        }
      } catch (error) {
        console.error("Error fetching design data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDesignData();
  }, [jobId, enabled]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabled || !canEdit) return;
      
      if (e.key === "Escape") {
        setMode("select");
        setConnectingFrom(null);
        setSelection(null);
      }
      
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selection) {
          handleDelete();
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, canEdit, selection]);
  
  // Create node
  const createNode = useCallback(async (lat: number, lng: number) => {
    if (!selectedNodeType || !canEdit) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/job-plans/${jobId}/design/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeTypeId: selectedNodeType.id,
          lat,
          lng,
        }),
      });
      
      if (response.ok) {
        const newNode = await response.json();
        setNodes(prev => [...prev, newNode]);
      }
    } catch (error) {
      console.error("Error creating node:", error);
    } finally {
      setIsSaving(false);
    }
  }, [jobId, selectedNodeType, canEdit]);
  
  // Create route
  const createRoute = useCallback(async (fromNode: MapNode, toNode: MapNode) => {
    if (!canEdit) return;
    
    const routeType = mode === "connect_strand" ? "strand_only" : mode === "connect_mst" ? "mst" : "fiber";
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/job-plans/${jobId}/design/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromNodeId: fromNode.id,
          toNodeId: toNode.id,
          routeType,
          fiberCount: routeType !== "strand_only" ? fiberCount : undefined,
        }),
      });
      
      if (response.ok) {
        const newRoute = await response.json();
        setRoutes(prev => [...prev, newRoute]);
        
        // Update fiber totals
        if (routeType === "fiber" || routeType === "mst") {
          setFiberByCount(prev => ({
            ...prev,
            [fiberCount]: (prev[fiberCount] || 0) + newRoute.footage,
          }));
        }
        
        // Update strand footage
        if (routeType !== "mst") {
          setTotalStrandFootage(prev => prev + newRoute.footage);
        }
      }
    } catch (error) {
      console.error("Error creating route:", error);
    } finally {
      setIsSaving(false);
      setConnectingFrom(null);
    }
  }, [jobId, mode, fiberCount, canEdit]);
  
  // Update node
  const updateNode = useCallback(async (nodeId: string, updates: { name?: string; nodeTypeId?: string }) => {
    if (!canEdit) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/job-plans/${jobId}/design/nodes/${nodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        const updatedNode = await response.json();
        setNodes(prev => prev.map(n => n.id === nodeId ? updatedNode : n));
        if (selection?.type === "node" && selection.data.id === nodeId) {
          setSelection({ type: "node", data: updatedNode });
        }
      }
    } catch (error) {
      console.error("Error updating node:", error);
    } finally {
      setIsSaving(false);
    }
  }, [jobId, canEdit, selection]);
  
  // Update route
  const updateRoute = useCallback(async (routeId: string, updates: { routeType?: string; fiberCount?: number; footage?: number }) => {
    if (!canEdit) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/job-plans/${jobId}/design/routes/${routeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        const updatedRoute = await response.json();
        setRoutes(prev => prev.map(r => r.id === routeId ? updatedRoute : r));
        if (selection?.type === "route" && selection.data.id === routeId) {
          setSelection({ type: "route", data: updatedRoute });
        }
      }
    } catch (error) {
      console.error("Error updating route:", error);
    } finally {
      setIsSaving(false);
    }
  }, [jobId, canEdit, selection]);
  
  // Delete selection
  const handleDelete = useCallback(async () => {
    if (!selection || !canEdit) return;
    
    setIsSaving(true);
    try {
      if (selection.type === "node") {
        const response = await fetch(`/api/job-plans/${jobId}/design/nodes/${selection.data.id}`, {
          method: "DELETE",
        });
        
        if (response.ok) {
          setNodes(prev => prev.filter(n => n.id !== selection.data.id));
          // Also remove routes connected to this node
          setRoutes(prev => prev.filter(r => 
            r.fromNode.id !== selection.data.id && r.toNode.id !== selection.data.id
          ));
        }
      } else {
        const response = await fetch(`/api/job-plans/${jobId}/design/routes/${selection.data.id}`, {
          method: "DELETE",
        });
        
        if (response.ok) {
          setRoutes(prev => prev.filter(r => r.id !== selection.data.id));
        }
      }
      setSelection(null);
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setIsSaving(false);
    }
  }, [jobId, selection, canEdit]);
  
  // Recalculate materials
  const handleRecalculate = useCallback(async () => {
    setIsCalculating(true);
    try {
      const response = await fetch(`/api/job-plans/${jobId}/design/calculate`, {
        method: "POST",
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllocations(data.allocations || []);
        setTotalStrandFootage(data.totalStrandFootage || 0);
        setFiberByCount(data.fiberByCount || {});
      }
    } catch (error) {
      console.error("Error calculating materials:", error);
    } finally {
      setIsCalculating(false);
    }
  }, [jobId]);
  
  // Handle map click
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!canEdit) return;
    
    if (mode === "add_node" && selectedNodeType) {
      createNode(lat, lng);
    }
  }, [mode, selectedNodeType, canEdit, createNode]);
  
  // Handle node click
  const handleNodeClick = useCallback((node: MapNode) => {
    // Check if we're in a connect mode
    if (mode.startsWith("connect_") && canEdit) {
      if (!connectingFrom) {
        // First click - start connection
        setConnectingFrom(node);
      } else if (connectingFrom.id !== node.id) {
        // Second click - create route
        createRoute(connectingFrom, node);
      }
      return;
    }
    
    // Select mode - select the node (use setTimeout to avoid React render issues)
    setTimeout(() => setSelection({ type: "node", data: node }), 0);
  }, [mode, canEdit, connectingFrom, createRoute]);
  
  // Handle route click
  const handleRouteClick = useCallback((route: MapRoute) => {
    // Use setTimeout to avoid React render issues with radix-ui components
    setTimeout(() => setSelection({ type: "route", data: route }), 0);
  }, []);
  
  // Handle element picker selection
  const handlePickerSelect = useCallback((element: { type: string; data: unknown }) => {
    // Clear picker first
    setPickerElements([]);
    setPickerPosition(null);
    
    // Then handle selection (these already use setTimeout internally)
    if (element.type === "node") {
      handleNodeClick(element.data as MapNode);
    } else {
      handleRouteClick(element.data as MapRoute);
    }
  }, [handleNodeClick, handleRouteClick]);
  
  if (!enabled) return null;
  
  return (
    <>
      {/* Map event handler */}
      <MapEventHandler
        mode={mode}
        selectedNodeType={selectedNodeType}
        fiberCount={fiberCount}
        connectingFrom={connectingFrom}
        onMapClick={handleMapClick}
        onMouseMove={(lat, lng) => setMousePosition([lat, lng])}
      />
      
      {/* Route lines */}
      {routes.map((route) => (
        <RouteLine
          key={route.id}
          route={route}
          isSelected={selection?.type === "route" && selection.data.id === route.id}
          onClick={handleRouteClick}
        />
      ))}
      
      {/* Preview line while connecting */}
      {connectingFrom && mousePosition && (
        <RoutePreviewLine
          fromPosition={[connectingFrom.lat, connectingFrom.lng]}
          toPosition={mousePosition}
          routeType={mode === "connect_strand" ? "strand_only" : mode === "connect_mst" ? "mst" : "fiber"}
          fiberCount={fiberCount}
        />
      )}
      
      {/* Node markers */}
      {nodes.map((node) => (
        <NodeMarker
          key={node.id}
          node={node}
          isSelected={selection?.type === "node" && selection.data.id === node.id}
          isConnecting={connectingFrom?.id === node.id}
          onClick={handleNodeClick}
          draggable={canEdit && mode === "select"}
          onDragEnd={(node, lat, lng) => {
            updateNode(node.id, {});
            // Update local state immediately for responsiveness
            setNodes(prev => prev.map(n => 
              n.id === node.id ? { ...n, lat, lng } : n
            ));
          }}
        />
      ))}
      
      {/* Toolbar - positioned outside MapContainer, only render after mount to prevent hydration issues */}
      {canEdit && isMounted && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]">
          <DesignToolbar
            mode={mode}
            onModeChange={setMode}
            selectedNodeType={selectedNodeType}
            onNodeTypeSelect={(type) => {
              setSelectedNodeType(type);
              setMode("add_node");
            }}
            nodeTypes={nodeTypes}
            fiberCount={fiberCount}
            onFiberCountChange={setFiberCount}
            onDelete={handleDelete}
            hasSelection={!!selection}
            disabled={isSaving}
          />
        </div>
      )}
      
      {/* Properties panel - only render after mount to prevent hydration issues */}
      {selection && isMounted && (
        <div className="absolute top-16 right-3 z-[1000]">
          <DesignProperties
            selection={selection}
            nodeTypes={nodeTypes}
            onClose={() => setSelection(null)}
            onUpdateNode={updateNode}
            onUpdateRoute={updateRoute}
            onDelete={handleDelete}
            isSaving={isSaving}
          />
        </div>
      )}
      
      {/* Materials panel - only render after mount to prevent hydration issues */}
      {isMounted && (
        <div className="absolute bottom-3 left-3 z-[1000]">
          <JobMaterialsPanel
            totalStrandFootage={totalStrandFootage}
            fiberByCount={fiberByCount}
            allocations={allocations}
            nodeCount={nodes.length}
            routeCount={routes.length}
            onRecalculate={handleRecalculate}
            isCalculating={isCalculating}
          />
        </div>
      )}
      
      {/* Element picker */}
      {isMounted && pickerPosition && pickerElements.length > 0 && (
        <ElementPicker
          elements={pickerElements}
          position={pickerPosition}
          onSelect={handlePickerSelect}
          onClose={() => {
            setPickerElements([]);
            setPickerPosition(null);
          }}
        />
      )}
    </>
  );
}

export default NetworkDesign;
