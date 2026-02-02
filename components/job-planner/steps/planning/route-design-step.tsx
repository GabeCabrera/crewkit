"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { upload } from "@vercel/blob/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  SegmentedControl,
  jobBuildTypeOptions,
  trafficControlOptions,
  type JobBuildType,
} from "@/components/ui/segmented-control";
import { 
  JOB_BUILD_TYPE_DESCRIPTIONS,
  filterAssembliesByBuildType,
  calculateRequiredAssemblies,
} from "@/lib/build-type-assemblies";
import {
  Loader2,
  Map as MapIcon,
  LayoutGrid,
  Cable,
  Ruler,
  Milestone,
  Wrench,
  MapPin,
  Lock,
  Building,
  User,
  Phone,
  Navigation,
  Upload,
  FileText,
  ExternalLink,
  Trash2,
  Download,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Box,
  Compass,
  FileUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSmartNavigationUrl } from "@/lib/mapbox";
import { 
  calculateAerialFootage, 
  calculateUndergroundFootage,
} from "@/lib/selection-utils";
import type { JobPlanData } from "../../job-lifecycle-view";
import type { SelectedFeatures } from "@/lib/selection-utils";

// Dynamically import the memoized map pane to avoid SSR issues
const DesignMapPane = dynamic(
  () => import("./route-design/design-map-pane").then((mod) => mod.DesignMapPane),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-slate-100 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    ),
  }
);

// Import layer management components
import { FloatingActionBar } from "./route-design/floating-action-bar";
import { SelectionPreviewPanel } from "./route-design/selection-preview-panel";

// Import assembly detection
import { 
  detectAssemblyTypes, 
  setAssemblyOverride as updateAssemblyOverride,
  type DetectedAssembly,
  type AssemblyType,
} from "@/lib/assembly-detection";

// BOM data types
export interface BOMSummary {
  totalBackboneFootage: number;
  totalLateralFootage: number;
  totalStrandFootage: number;
  totalConduitFootage: number;
  fiberByCount: Record<number, number>;
  conduitBySize: Record<string, number>;
  mstCount: number;
  vaultCount: number;
  handholeCount: number;
  pedestalCount: number;
  spliceCount: number;
  poleCount: number;
  riserCount: number;
  guyCount: number;
  slackLoopCount: number;
  crossingCount: number;
}

export interface FiberSegment {
  id: string;
  segmentType: string;
  fiberCount: number;
  footage: number;
  geometry?: unknown;
  sourceFileId?: string;
}

export interface InfrastructureItem {
  id: string;
  itemType: string;
  quantity: number;
  specs?: string;
  label?: string;
  subPhase?: string;
  poleType?: string | null;
  tailFootage?: number | null;
  location?: { type: "Point"; coordinates: [number, number] };
  isSelected?: boolean;
  isCompleted?: boolean;
  sourceFileId?: string;
}

export interface ConduitSegment {
  id: string;
  conduitSize: string;
  footage: number;
  geometry?: unknown;
  sourceFileId?: string;
}

export interface BOMData {
  id: string;
  importedAt: string;
  sourceFiles: string[];
  summary: BOMSummary;
  fiberSegments: FiberSegment[];
  infrastructure: InfrastructureItem[];
  conduitSegments: ConduitSegment[];
}

// Segment for layer grouping
export interface Segment {
  id: string;
  name: string;
  fileIds: string[];
  color?: string | null;
  order: number;
}

// Source file info derived from BOM data
export interface SourceFileInfo {
  id: string;
  name: string;
  featureCount: number;
  footage: number;
}

// Tab types
type TabId = "design" | "logistics" | "files";

// Selection BOM - computed from selected features with geometry-based calculations
export interface SelectionBOM {
  totalFeatures: number;
  // Footage calculated from actual geometry (accurate)
  fiberFootage: number;
  aerialFootage: number;      // backbone + lateral + strand
  undergroundFootage: number; // conduit
  slackFootage: number;       // calculated from splices
  // Breakdown by type
  fiberByType: Record<string, number>;
  fiberByCount: Record<number, number>;
  infraCounts: Record<string, number>;
  conduitFootage: number;
  conduitBySize: Record<string, number>;
  // Splice details for slack calculation
  aerialSpliceCount: number;
  undergroundSpliceCount: number;
  // Pole count for BOM
  poleCount: number;
}

// Constants for slack calculation
const SLACK_PER_SPLICE_FEET = 100;

/**
 * Determine if a splice is aerial or underground based on specs/size field
 * Looks for keywords like "AIR", "AERIAL", "UG", "UNDERGROUND" in the specs
 */
function getSpliceType(specs: string | undefined): "aerial" | "underground" | "unknown" {
  if (!specs) return "unknown";
  const upper = specs.toUpperCase();
  if (upper.includes("AIR") || upper.includes("AERIAL")) return "aerial";
  if (upper.includes("UG") || upper.includes("UNDERGROUND")) return "underground";
  return "unknown";
}

// Calculate BOM summary from selected features using geometry-based footage
// Aerial footage includes 2% sag/tension allowance, underground does not
function calculateSelectionBOM(
  bom: BOMData | null,
  selectedFeatures: SelectedFeatures
): SelectionBOM {
  const result: SelectionBOM = {
    totalFeatures: 0,
    fiberFootage: 0,
    aerialFootage: 0,
    undergroundFootage: 0,
    slackFootage: 0,
    fiberByType: {},
    fiberByCount: {},
    infraCounts: {},
    conduitFootage: 0,
    conduitBySize: {},
    aerialSpliceCount: 0,
    undergroundSpliceCount: 0,
    poleCount: 0,
  };

  if (!bom) return result;

  const fiberIdSet = new Set(selectedFeatures.fiberIds);
  const infraIdSet = new Set(selectedFeatures.infraIds);
  const conduitIdSet = new Set(selectedFeatures.conduitIds);

  // Calculate fiber stats using geometry-based footage
  // Aerial fiber includes 2% sag factor
  for (const seg of bom.fiberSegments) {
    if (fiberIdSet.has(seg.id)) {
      result.totalFeatures++;
      
      // Determine if this is aerial (applies sag) or underground
      const isAerial = ["backbone", "lateral", "strand", "mst_tail"].includes(seg.segmentType);
      
      // Calculate footage from geometry with appropriate sag factor
      // Aerial: +2% for sag/tension, Underground: no sag
      const footage = seg.geometry 
        ? (isAerial 
            ? calculateAerialFootage(seg.geometry as GeoJSON.LineString | GeoJSON.MultiLineString)
            : calculateUndergroundFootage(seg.geometry as GeoJSON.LineString | GeoJSON.MultiLineString))
        : (seg.footage || 0);
      
      result.fiberFootage += footage;
      result.fiberByType[seg.segmentType] = (result.fiberByType[seg.segmentType] || 0) + footage;
      result.fiberByCount[seg.fiberCount] = (result.fiberByCount[seg.fiberCount] || 0) + footage;
      
      // Aerial footage = backbone + lateral + strand (already includes sag)
      if (isAerial) {
        result.aerialFootage += footage;
      }
    }
  }

  // Calculate infrastructure stats
  for (const item of bom.infrastructure) {
    if (infraIdSet.has(item.id)) {
      result.totalFeatures++;
      result.infraCounts[item.itemType] = (result.infraCounts[item.itemType] || 0) + (item.quantity || 1);
      
      // Track poles
      if (item.itemType === "pole") {
        result.poleCount += item.quantity || 1;
      }
      
      // Track splices for slack calculation
      if (item.itemType === "splice") {
        const spliceType = getSpliceType(item.specs);
        if (spliceType === "aerial") {
          result.aerialSpliceCount += item.quantity || 1;
        } else if (spliceType === "underground") {
          result.undergroundSpliceCount += item.quantity || 1;
        } else {
          // Default unknown splices to aerial (more common)
          result.aerialSpliceCount += item.quantity || 1;
        }
      }
    }
  }

  // Calculate conduit stats using geometry-based footage
  // Underground conduit: no sag factor (cable runs through conduit)
  for (const seg of bom.conduitSegments) {
    if (conduitIdSet.has(seg.id)) {
      result.totalFeatures++;
      
      // Calculate footage from geometry - no sag for underground
      const footage = seg.geometry
        ? calculateUndergroundFootage(seg.geometry as GeoJSON.LineString | GeoJSON.MultiLineString)
        : (seg.footage || 0);
      
      result.conduitFootage += footage;
      result.undergroundFootage += footage;
      result.conduitBySize[seg.conduitSize] = (result.conduitBySize[seg.conduitSize] || 0) + footage;
    }
  }

  // Calculate slack footage: all splices × 100'
  const totalSplices = result.aerialSpliceCount + result.undergroundSpliceCount;
  result.slackFootage = totalSplices * SLACK_PER_SPLICE_FEET;

  return result;
}

interface RouteDesignStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  refreshJob?: () => Promise<void>;
  canEdit: boolean;
}

export function RouteDesignStep({ job, updateJob, refreshJob, canEdit }: RouteDesignStepProps) {
  // BOM state (lifted for map + materials to share)
  const [bom, setBom] = useState<BOMData | null>(null);
  const [isLoadingBom, setIsLoadingBom] = useState(true);
  
  // UI state
  const [mobileView, setMobileView] = useState<"form" | "map">("form");
  const [activeTab, setActiveTab] = useState<TabId>("design");
  
  // File upload state
  const [isUploadingBom, setIsUploadingBom] = useState(false);
  const [bomUploadError, setBomUploadError] = useState<string | null>(null);
  const [isDraggingBom, setIsDraggingBom] = useState(false);
  const [isUploadingPrint, setIsUploadingPrint] = useState(false);
  const bomFileInputRef = useRef<HTMLInputElement>(null);
  const printFileInputRef = useRef<HTMLInputElement>(null);
  
  // Layer visibility state (synced between form and map)
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(
    new Set(["fiber", "infrastructure", "poles", "conduit"])
  );

  // Layer management state (for organizing source files into segments)
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [hoveredFileId, setHoveredFileId] = useState<string | null>(null);
  const [visibleFileIds, setVisibleFileIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Feature-based selection state (for lasso selection on map)
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeatures>({
    fiberIds: [],
    infraIds: [],
    conduitIds: [],
  });
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null);
  const [isLoadingSelection, setIsLoadingSelection] = useState(true);
  const selectionLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Preview panel and assembly detection state
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [detectedAssemblies, setDetectedAssemblies] = useState<DetectedAssembly[]>([]);
  
  // Focus mode - dims non-selected features after applying to BOM
  const [focusMode, setFocusMode] = useState(false);

  // Compute combined set of all selected feature IDs for map highlighting
  const selectedFeatureIds = useMemo(() => {
    return new Set([
      ...selectedFeatures.fiberIds,
      ...selectedFeatures.infraIds,
      ...selectedFeatures.conduitIds,
    ]);
  }, [selectedFeatures]);

  // Fetch BOM data on mount
  useEffect(() => {
    async function fetchBom() {
      try {
        const response = await fetch(`/api/job-plans/${job.id}/bom`);
        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            setBom(data.bom);
          }
        }
      } catch (error) {
        console.error("Error fetching BOM:", error);
      } finally {
        setIsLoadingBom(false);
      }
    }
    fetchBom();
  }, [job.id]);

  // Refresh BOM data
  const refreshBom = useCallback(async () => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/bom`);
      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          setBom(data.bom);
        } else {
          setBom(null);
        }
      }
    } catch (error) {
      console.error("Error refreshing BOM:", error);
    }
  }, [job.id]);

  // Fetch segments when BOM is available
  useEffect(() => {
    async function fetchSegments() {
      if (!bom) return;
      try {
        const response = await fetch(`/api/job-plans/${job.id}/bom/segments`);
        if (response.ok) {
          const data = await response.json();
          setSegments(data.segments || []);
          // Initialize all files as visible
          if (bom.sourceFiles.length > 0) {
            setVisibleFileIds(new Set(bom.sourceFiles));
          }
        }
      } catch (error) {
        console.error("Error fetching segments:", error);
      }
    }
    fetchSegments();
  }, [job.id, bom]);

  // Load saved selection when BOM is available
  useEffect(() => {
    async function loadSelection() {
      if (!bom || selectionLoadedRef.current) return;
      
      try {
        const response = await fetch(`/api/job-plans/${job.id}/bom/selection`);
        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            const hasSelection = 
              (data.selectedFiberIds?.length > 0) || 
              (data.selectedInfraIds?.length > 0) || 
              (data.selectedConduitIds?.length > 0);
            
            if (hasSelection) {
              setSelectedFeatures({
                fiberIds: data.selectedFiberIds || [],
                infraIds: data.selectedInfraIds || [],
                conduitIds: data.selectedConduitIds || [],
              });
              // Enable focus mode if there's a saved selection
              setFocusMode(true);
            }
          }
        }
      } catch (error) {
        console.error("Error loading selection:", error);
      } finally {
        selectionLoadedRef.current = true;
        setIsLoadingSelection(false);
      }
    }
    loadSelection();
  }, [job.id, bom]);

  // Auto-save selection changes (debounced)
  useEffect(() => {
    // Skip initial load - don't save empty selection
    if (!selectionLoadedRef.current || isLoadingSelection) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce the save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/job-plans/${job.id}/bom/selection`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedFiberIds: selectedFeatures.fiberIds,
            selectedInfraIds: selectedFeatures.infraIds,
            selectedConduitIds: selectedFeatures.conduitIds,
          }),
        });
      } catch (error) {
        console.error("Error saving selection:", error);
      }
    }, 500); // 500ms debounce
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [job.id, selectedFeatures, isLoadingSelection]);

  // Calculate source file info from BOM data
  const sourceFiles = useMemo<SourceFileInfo[]>(() => {
    if (!bom) return [];
    
    const fileStats = new Map<string, { featureCount: number; footage: number }>();
    
    // Count features per sourceFileId
    bom.fiberSegments.forEach((seg) => {
      const fileId = seg.sourceFileId || "unknown";
      const current = fileStats.get(fileId) || { featureCount: 0, footage: 0 };
      fileStats.set(fileId, {
        featureCount: current.featureCount + 1,
        footage: current.footage + (seg.footage || 0),
      });
    });
    
    bom.infrastructure.forEach((item) => {
      const fileId = item.sourceFileId || "unknown";
      const current = fileStats.get(fileId) || { featureCount: 0, footage: 0 };
      fileStats.set(fileId, {
        featureCount: current.featureCount + 1,
        footage: current.footage,
      });
    });
    
    bom.conduitSegments.forEach((seg) => {
      const fileId = seg.sourceFileId || "unknown";
      const current = fileStats.get(fileId) || { featureCount: 0, footage: 0 };
      fileStats.set(fileId, {
        featureCount: current.featureCount + 1,
        footage: current.footage + (seg.footage || 0),
      });
    });
    
    return bom.sourceFiles.map((fileName) => {
      const stats = fileStats.get(fileName) || { featureCount: 0, footage: 0 };
      return {
        id: fileName,
        name: fileName,
        featureCount: stats.featureCount,
        footage: stats.footage,
      };
    });
  }, [bom]);

  // Segment CRUD handlers
  const handleCreateSegment = useCallback(async (name: string, fileIds: string[]) => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/bom/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, fileIds }),
      });
      if (response.ok) {
        const data = await response.json();
        setSegments((prev) => [...prev, data.segment]);
        setSelectedFileIds(new Set()); // Clear selection after creating segment
      }
    } catch (error) {
      console.error("Error creating segment:", error);
    }
  }, [job.id]);

  const handleUpdateSegment = useCallback(async (segmentId: string, updates: { name?: string; fileIds?: string[] }) => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/bom/segments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmentId, ...updates }),
      });
      if (response.ok) {
        const data = await response.json();
        setSegments((prev) => prev.map((s) => (s.id === segmentId ? data.segment : s)));
      }
    } catch (error) {
      console.error("Error updating segment:", error);
    }
  }, [job.id]);

  const handleDeleteSegment = useCallback(async (segmentId: string) => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/bom/segments?segmentId=${segmentId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setSegments((prev) => prev.filter((s) => s.id !== segmentId));
      }
    } catch (error) {
      console.error("Error deleting segment:", error);
    }
  }, [job.id]);

  // File selection handlers (for LayerManager - organizing source files)
  const handleSelectFile = useCallback((fileId: string, multi?: boolean) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (multi) {
        if (next.has(fileId)) {
          next.delete(fileId);
        } else {
          next.add(fileId);
        }
      } else {
        if (next.has(fileId) && next.size === 1) {
          next.clear();
        } else {
          next.clear();
          next.add(fileId);
        }
      }
      return next;
    });
  }, []);

  // Feature selection handlers (for lasso selection on map)
  const handleFeatureSelect = useCallback((featureId: string, featureType: string) => {
    setSelectedFeatures((prev) => {
      // Toggle selection for the feature
      if (featureType === "fiber") {
        const idx = prev.fiberIds.indexOf(featureId);
        if (idx >= 0) {
          return { ...prev, fiberIds: prev.fiberIds.filter((_, i) => i !== idx) };
        } else {
          return { ...prev, fiberIds: [...prev.fiberIds, featureId] };
        }
      } else if (featureType === "infrastructure") {
        const idx = prev.infraIds.indexOf(featureId);
        if (idx >= 0) {
          return { ...prev, infraIds: prev.infraIds.filter((_, i) => i !== idx) };
        } else {
          return { ...prev, infraIds: [...prev.infraIds, featureId] };
        }
      } else if (featureType === "conduit") {
        const idx = prev.conduitIds.indexOf(featureId);
        if (idx >= 0) {
          return { ...prev, conduitIds: prev.conduitIds.filter((_, i) => i !== idx) };
        } else {
          return { ...prev, conduitIds: [...prev.conduitIds, featureId] };
        }
      }
      return prev;
    });
  }, []);

  const handleToggleFileVisibility = useCallback((fileId: string) => {
    setVisibleFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const handleSelectionComplete = useCallback((selected: SelectedFeatures) => {
    setSelectedFeatures(selected);
    setSelectMode(false);
    // Auto-enable focus mode if any features were selected
    const hasSelections = selected.fiberIds.length > 0 || 
                          selected.infraIds.length > 0 || 
                          selected.conduitIds.length > 0;
    if (hasSelections) {
      setFocusMode(true);
    }
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedFeatures({ fiberIds: [], infraIds: [], conduitIds: [] });
    setDetectedAssemblies([]);
    setShowPreviewPanel(false);
    setFocusMode(false);
  }, []);

  // Calculate BOM from selected features
  const selectionBOM = useMemo(() => {
    return calculateSelectionBOM(bom, selectedFeatures);
  }, [bom, selectedFeatures]);
  
  // Detect assemblies when selection changes
  useEffect(() => {
    if (!bom || selectedFeatures.infraIds.length === 0) {
      setDetectedAssemblies([]);
      return;
    }
    
    // Get selected infrastructure items
    const selectedInfraSet = new Set(selectedFeatures.infraIds);
    const selectedInfra = bom.infrastructure.filter(item => selectedInfraSet.has(item.id));
    
    // Get selected fiber segments for pole type detection
    const selectedFiberSet = new Set(selectedFeatures.fiberIds);
    const selectedFiber = bom.fiberSegments.filter(seg => selectedFiberSet.has(seg.id));
    
    // Detect assembly types
    const detected = detectAssemblyTypes(
      selectedInfra.map(item => ({
        id: item.id,
        itemType: item.itemType,
        label: item.label,
        specs: item.specs,
        poleType: item.poleType ?? undefined,
        quantity: item.quantity || 1,
        location: item.location,
        tailFootage: item.tailFootage ?? undefined, // Pass MST tail footage
      })),
      selectedFiber.map(seg => ({
        id: seg.id,
        segmentType: seg.segmentType,
        geometry: seg.geometry,
      }))
    );
    
    setDetectedAssemblies(detected);
  }, [bom, selectedFeatures]);
  
  // Handle assembly type override
  const handleAssemblyOverride = useCallback((featureId: string, newType: AssemblyType) => {
    setDetectedAssemblies(prev => updateAssemblyOverride(prev, featureId, newType));
  }, []);
  
  // Handle opening the preview panel
  const handleOpenPreview = useCallback(() => {
    setShowPreviewPanel(true);
  }, []);
  
  // Handle applying selection to job BOM
  const handleApplyToBOM = useCallback(async () => {
    const buildType = (job.jobBuildType as JobBuildType) || "full_build";
    
    // Filter assemblies by build type
    const filteredAssemblies = filterAssembliesByBuildType(detectedAssemblies, buildType);
    
    // Calculate assembly type counts from filtered assemblies
    const assemblyCounts = calculateRequiredAssemblies(detectedAssemblies, buildType);
    
    // Map pole types to legacy fields
    let deadEnds = 0;
    let tangents = 0;
    let anchors = 0;
    
    for (const item of assemblyCounts) {
      if (item.assemblyType === "strand.terminal") {
        deadEnds += item.quantity;
      } else if (item.assemblyType === "strand.tangent") {
        tangents += item.quantity;
      } else if (item.assemblyType === "strand.corner" || item.assemblyType === "strand.junction") {
        // Corner and junction poles typically need anchors
        anchors += item.quantity;
      } else if (item.assemblyType === "hardware.anchor") {
        anchors += item.quantity;
      }
    }
    
    // Calculate filtered pole count
    const filteredPoleCount = filteredAssemblies.filter(a => 
      ["strand.terminal", "strand.tangent", "strand.corner", "strand.junction"].includes(
        a.userOverride || a.detectedAssemblyType
      )
    ).length;
    
    // Apply calculated values to job fields
    updateJob({
      // Footage (always applied regardless of build type)
      aerialFootage: Math.round(selectionBOM.aerialFootage),
      undergroundFootage: Math.round(selectionBOM.undergroundFootage),
      slackLoopFootage: Math.round(selectionBOM.slackFootage),
      totalDistance: Math.round(selectionBOM.aerialFootage + selectionBOM.undergroundFootage),
      
      // Assembly counts (filtered by build type)
      poleCount: filteredPoleCount,
      deadEnds,
      tangents,
      anchors,
      
      // Strand/fiber footage estimates
      strandFootage: buildType === "full_build" || buildType === "strand_build" 
        ? Math.round(selectionBOM.aerialFootage) 
        : job.strandFootage,
      fiberFootage: buildType === "full_build" || buildType === "fiber_build"
        ? Math.round(selectionBOM.fiberFootage)
        : job.fiberFootage,
    });
    
    // Close the preview panel and enable focus mode immediately (before async operations)
    setShowPreviewPanel(false);
    setFocusMode(true);
    
    // Save assemblies to the database via API (fire and forget for better UX)
    try {
      const assembliesToSave = assemblyCounts.map(item => ({
        assemblyType: item.assemblyType,
        quantity: item.quantity,
      }));
      
      const response = await fetch(`/api/job-plans/${job.id}/assemblies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assemblies: assembliesToSave,
          clearExisting: true,
        }),
      });
      
      if (!response.ok) {
        console.error("Failed to save assemblies:", await response.text());
      } else {
        // Refresh job data to get the saved assemblies
        if (refreshJob) {
          await refreshJob();
        }
      }
    } catch (error) {
      console.error("Error saving assemblies:", error);
    }
  }, [job.id, job.jobBuildType, job.strandFootage, job.fiberFootage, selectionBOM, detectedAssemblies, updateJob, refreshJob]);

  // Derive map line styles from jobBuildType
  const mapStyles = useMemo(() => {
    const buildType = job.jobBuildType || "full_build";
    // Full build and strand/fiber builds show aerial
    const showAerial = ["full_build", "strand_build", "fiber_build"].includes(buildType);
    // Full build and peripheral build show underground
    const showUnderground = ["full_build", "peripheral_build"].includes(buildType);
    return {
      aerialColor: showAerial ? "#3b82f6" : "#cbd5e1",
      undergroundColor: showUnderground ? "#f59e0b" : "#cbd5e1",
      showAerial,
      showUnderground,
    };
  }, [job.jobBuildType]);

  // Toggle layer visibility
  const toggleLayer = useCallback((layer: string) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  }, []);

  // Calculate total footage
  const totalFootage = (job.aerialFootage || 0) + (job.undergroundFootage || 0) + (job.slackLoopFootage || 0);
  const buildType = job.jobBuildType || "full_build";
  // Show aerial fields for full, strand, and fiber builds
  const showAerialFields = ["full_build", "strand_build", "fiber_build"].includes(buildType);
  // Show underground fields for full and peripheral builds
  const showUndergroundFields = ["full_build", "peripheral_build"].includes(buildType);

  // Navigation URL
  const navigationUrl = getSmartNavigationUrl({
    address: job.locationAddress || undefined,
    lat: job.locationLat || undefined,
    lng: job.locationLng || undefined,
  });

  const hasVetroLink = job.vetroProjectUrl && job.vetroProjectUrl.trim() !== "";

  // BOM file upload handler
  const handleBomFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setBomUploadError("Please upload a ZIP file containing shapefiles");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setBomUploadError("File too large. Maximum size is 50MB");
      return;
    }

    setIsUploadingBom(true);
    setBomUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/job-plans/${job.id}/bom/import`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import BOM");
      }

      await refreshBom();
      if (refreshJob) {
        await refreshJob();
      }
    } catch (error) {
      console.error("Error uploading BOM:", error);
      setBomUploadError(error instanceof Error ? error.message : "Failed to import");
    } finally {
      setIsUploadingBom(false);
    }
  }, [job.id, refreshBom, refreshJob]);

  // Delete BOM handler
  const handleDeleteBom = useCallback(async () => {
    if (!confirm("Delete imported BOM data? This cannot be undone.")) return;

    try {
      const response = await fetch(`/api/job-plans/${job.id}/bom`, {
        method: "DELETE",
      });

      if (response.ok) {
        setBom(null);
        if (refreshJob) {
          await refreshJob();
        }
      }
    } catch (error) {
      console.error("Error deleting BOM:", error);
    }
  }, [job.id, refreshJob]);

  // Print file upload handler
  const handlePrintUpload = useCallback(async (file: File) => {
    if (!file) return;

    setIsUploadingPrint(true);
    try {
      await upload(file.name, file, {
        access: "public",
        handleUploadUrl: `/api/job-plans/${job.id}/prints`,
      });

      if (refreshJob) {
        await refreshJob();
      }
    } catch (error) {
      console.error("Error uploading print:", error);
      alert(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploadingPrint(false);
    }
  }, [job.id, refreshJob]);

  // Delete print handler
  const handleDeletePrint = useCallback(async (printId: string) => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/prints?printId=${printId}`, {
        method: "DELETE",
      });
      if (response.ok && refreshJob) {
        await refreshJob();
      }
    } catch (error) {
      console.error("Error deleting print:", error);
    }
  }, [job.id, refreshJob]);

  // Drag handlers for BOM upload
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBom(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBom(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBom(false);
    const file = e.dataTransfer.files[0];
    if (file) handleBomFileUpload(file);
  }, [handleBomFileUpload]);

  const formatNumber = (num: number) => num.toLocaleString();

  // Tab completion status - check if key fields have data
  const tabCompletion = useMemo(() => ({
    design: Boolean(
      job.jobBuildType && 
      (job.aerialFootage || job.undergroundFootage || job.poleCount)
    ),
    logistics: Boolean(
      job.locationAddress || 
      (job.locationLat && job.locationLng)
    ),
    files: Boolean(
      bom || 
      (job.constructionPrints && job.constructionPrints.length > 0) ||
      job.vetroProjectUrl
    ),
  }), [job, bom]);

  // Tab configuration
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "design", label: "Design Specs", icon: Compass },
    { id: "logistics", label: "Logistics", icon: MapPin },
    { id: "files", label: "Files", icon: FileUp },
  ];

  return (
    <div className="h-full max-h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Mobile View Toggle */}
      <div className="lg:hidden flex items-center gap-2 p-3 border-b border-slate-200 bg-white shrink-0 flex-none">
        <Button
          variant={mobileView === "form" ? "default" : "outline"}
          size="sm"
          onClick={() => setMobileView("form")}
          className="flex-1 gap-2 h-10"
        >
          <LayoutGrid className="h-4 w-4" />
          Form
        </Button>
        <Button
          variant={mobileView === "map" ? "default" : "outline"}
          size="sm"
          onClick={() => setMobileView("map")}
          className="flex-1 gap-2 h-10"
        >
          <MapIcon className="h-4 w-4" />
          Map
        </Button>
      </div>

      {/* Form Sidebar - Fixed width card on desktop */}
      <div
        className={cn(
          "w-full lg:w-[360px] lg:min-w-[360px] lg:max-w-[360px] flex flex-col bg-white border-r border-slate-200 overflow-hidden",
          mobileView === "map" && "hidden lg:flex"
        )}
      >
        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 px-4 pt-4 pb-0 shrink-0 flex-none">
          {tabs.map((tab) => {
            const isComplete = tabCompletion[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex-1 pb-3 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "text-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {tab.label}
                  {isComplete && activeTab !== tab.id && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                </span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {/* ===== DESIGN SPECS TAB ===== */}
          {activeTab === "design" && (
            <div className="space-y-5">
              {/* Build Type */}
              <div className="space-y-2.5">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Build Type</Label>
                <SegmentedControl
                  options={jobBuildTypeOptions}
                  value={job.jobBuildType as JobBuildType}
                  onChange={(value) => updateJob({ jobBuildType: value })}
                  disabled={!canEdit}
                  fullWidth
                  size="sm"
                />
                <p className="text-xs text-slate-500">
                  {JOB_BUILD_TYPE_DESCRIPTIONS[job.jobBuildType as JobBuildType] || JOB_BUILD_TYPE_DESCRIPTIONS.full_build}
                </p>
              </div>

              {/* Cable Specs - Inline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Cable Profile</Label>
                  <Input
                    value={job.cableProfile || ""}
                    onChange={(e) => updateJob({ cableProfile: e.target.value })}
                    placeholder="144ct Loose Tube"
                    className="h-9"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Sag/Tension</Label>
                  <Input
                    value={job.sagTensionSpec || ""}
                    onChange={(e) => updateJob({ sagTensionSpec: e.target.value })}
                    placeholder="NESC Heavy"
                    className="h-9"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* Scope Summary Card */}
              {totalFootage > 0 && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Scope</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-slate-800">{totalFootage.toLocaleString()}</span>
                      <span className="text-sm text-slate-500 ml-1">ft</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Scope Inputs - Compact Grid */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Scope Details</Label>
                
                {/* Aerial Row */}
                {showAerialFields && (
                  <div className="grid grid-cols-[1fr,80px] gap-2 items-end">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <Label className="text-xs text-blue-700">Aerial Footage</Label>
                      </div>
                      <Input
                        type="number"
                        value={job.aerialFootage || ""}
                        onChange={(e) => updateJob({ aerialFootage: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="h-9 bg-blue-50 border-blue-200 focus:border-blue-400"
                        min="0"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Poles</Label>
                      <Input
                        type="number"
                        value={job.poleCount || ""}
                        onChange={(e) => updateJob({ poleCount: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="h-9"
                        min="0"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                )}

                {/* Underground Row */}
                {showUndergroundFields && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <Label className="text-xs text-amber-700">Underground Footage</Label>
                    </div>
                    <Input
                      type="number"
                      value={job.undergroundFootage || ""}
                      onChange={(e) => updateJob({ undergroundFootage: Number(e.target.value) || 0 })}
                      placeholder="0"
                      className="h-9 bg-amber-50 border-amber-200 focus:border-amber-400"
                      min="0"
                      disabled={!canEdit}
                    />
                  </div>
                )}

                {/* Slack Row */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    <Label className="text-xs text-purple-700">Slack Loop Footage</Label>
                  </div>
                  <Input
                    type="number"
                    value={job.slackLoopFootage || ""}
                    onChange={(e) => updateJob({ slackLoopFootage: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="h-9 bg-purple-50 border-purple-200 focus:border-purple-400"
                    min="0"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* Make-Ready Toggle - Compact */}
              <div className="flex items-center justify-between py-3 px-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-700">Make-Ready Required</span>
                </div>
                <Switch
                  checked={job.makeReadyRequired || false}
                  onCheckedChange={(checked) => updateJob({ makeReadyRequired: checked === true })}
                  disabled={!canEdit}
                />
              </div>

            </div>
          )}

          {/* ===== LOGISTICS TAB ===== */}
          {activeTab === "logistics" && (
            <div className="space-y-5">
              {/* Location */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Location</Label>
                
                {/* Address with navigation */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Site Address</Label>
                  <div className="flex gap-2">
                    <Input
                      value={job.locationAddress || ""}
                      onChange={(e) => updateJob({ locationAddress: e.target.value })}
                      placeholder="123 Main St, City, State"
                      className="h-9 flex-1"
                      disabled={!canEdit}
                    />
                    {(job.locationAddress || (job.locationLat && job.locationLng)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0 shrink-0 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                        onClick={() => window.open(navigationUrl, "_blank")}
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={job.locationLat || ""}
                      onChange={(e) => updateJob({ locationLat: e.target.value ? Number(e.target.value) : null })}
                      placeholder="40.7128"
                      className="h-9"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={job.locationLng || ""}
                      onChange={(e) => updateJob({ locationLng: e.target.value ? Number(e.target.value) : null })}
                      placeholder="-74.0060"
                      className="h-9"
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>

              {/* Site Access */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Site Access</Label>
                
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Gate Code</Label>
                  <Input
                    value={job.gateCode || ""}
                    onChange={(e) => updateJob({ gateCode: e.target.value })}
                    placeholder="1234"
                    className="h-9 font-mono tracking-wider"
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Traffic Control</Label>
                  <SegmentedControl
                    options={trafficControlOptions}
                    value={job.trafficControlTier as "none" | "cones" | "flaggers" | null}
                    onChange={(value) => updateJob({ trafficControlTier: value })}
                    disabled={!canEdit}
                    fullWidth
                    size="sm"
                  />
                </div>
              </div>

              {/* Utility & Contact */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Utility & Contact</Label>
                
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Pole Owner</Label>
                  <Input
                    value={job.poleOwner || ""}
                    onChange={(e) => updateJob({ poleOwner: e.target.value })}
                    placeholder="Rocky Mountain Power"
                    className="h-9"
                    disabled={!canEdit}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Contact Name</Label>
                    <Input
                      value={job.siteContactName || ""}
                      onChange={(e) => updateJob({ siteContactName: e.target.value })}
                      placeholder="John Smith"
                      className="h-9"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Phone</Label>
                    <div className="flex gap-1.5">
                      <Input
                        value={job.siteContactPhone || ""}
                        onChange={(e) => updateJob({ siteContactPhone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="h-9 flex-1"
                        disabled={!canEdit}
                      />
                      {job.siteContactPhone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0 shrink-0 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600"
                          onClick={() => window.open(`tel:${job.siteContactPhone}`, "_self")}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== FILES TAB ===== */}
          {activeTab === "files" && (
            <div className="space-y-5">
              {/* Design Link */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Design Link</Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={job.vetroProjectUrl || ""}
                    onChange={(e) => updateJob({ vetroProjectUrl: e.target.value })}
                    placeholder="https://fibermap.vetro.io/..."
                    className="h-9 flex-1"
                    disabled={!canEdit}
                  />
                  {hasVetroLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 gap-1.5 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                      onClick={() => window.open(job.vetroProjectUrl!, "_blank")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </Button>
                  )}
                </div>
              </div>

              {/* GIS Data */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">GIS Data</Label>
                
                {bom ? (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 space-y-2.5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-700">
                          {bom.sourceFiles.length} shapefiles
                        </span>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700"
                            onClick={() => bomFileInputRef.current?.click()}
                            disabled={isUploadingBom}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Re-import
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={handleDeleteBom}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="text-center py-2 px-1 bg-white rounded border border-emerald-100">
                        <p className="text-sm font-bold text-slate-800">{formatNumber(bom.summary.totalStrandFootage)}</p>
                        <p className="text-[9px] text-slate-500 uppercase">Strand ft</p>
                      </div>
                      <div className="text-center py-2 px-1 bg-white rounded border border-emerald-100">
                        <p className="text-sm font-bold text-slate-800">{bom.summary.poleCount}</p>
                        <p className="text-[9px] text-slate-500 uppercase">Poles</p>
                      </div>
                      <div className="text-center py-2 px-1 bg-white rounded border border-emerald-100">
                        <p className="text-sm font-bold text-slate-800">{bom.summary.mstCount}</p>
                        <p className="text-[9px] text-slate-500 uppercase">MSTs</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                      isDraggingBom ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300",
                      !canEdit && "opacity-60 pointer-events-none"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={bomFileInputRef}
                      type="file"
                      className="hidden"
                      accept=".zip"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleBomFileUpload(file);
                          e.target.value = "";
                        }
                      }}
                      disabled={!canEdit || isUploadingBom}
                    />

                    {isUploadingBom ? (
                      <div className="space-y-2">
                        <Loader2 className="h-8 w-8 mx-auto text-blue-500 animate-spin" />
                        <p className="text-xs text-slate-600">Processing...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-10 w-10 mx-auto rounded-lg bg-slate-100 flex items-center justify-center">
                          <Upload className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">Drop shapefile ZIP</p>
                          <button
                            onClick={() => bomFileInputRef.current?.click()}
                            className="text-xs text-blue-600 hover:text-blue-700"
                            disabled={!canEdit}
                          >
                            or browse
                          </button>
                        </div>
                      </div>
                    )}

                    {bomUploadError && (
                      <div className="mt-3 p-2 bg-red-50 rounded flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-600">{bomUploadError}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Hidden file input for BOM re-import */}
                {bom && (
                  <input
                    ref={bomFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleBomFileUpload(file);
                        e.target.value = "";
                      }
                    }}
                    disabled={!canEdit || isUploadingBom}
                  />
                )}
              </div>

              {/* Construction Prints */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Construction Prints</Label>
                  {canEdit && (
                    <>
                      <input
                        ref={printFileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handlePrintUpload(file);
                            e.target.value = "";
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                        onClick={() => printFileInputRef.current?.click()}
                        disabled={isUploadingPrint}
                      >
                        {isUploadingPrint ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Upload className="h-3 w-3 mr-1" />
                        )}
                        Upload
                      </Button>
                    </>
                  )}
                </div>

                {job.constructionPrints && job.constructionPrints.length > 0 ? (
                  <div className="space-y-1.5">
                    {job.constructionPrints.map((print) => (
                      <div
                        key={print.id}
                        className="group flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 hover:bg-white hover:border-slate-200 transition-all"
                      >
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {print.fileName}
                          </p>
                        </div>
                        <a
                          href={print.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-blue-50 rounded text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        {canEdit && (
                          <button
                            onClick={() => handleDeletePrint(print.id)}
                            className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
                    <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500">No prints uploaded</p>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 text-xs text-blue-600"
                        onClick={() => printFileInputRef.current?.click()}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Upload PDF
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Map Pane - fills remaining space */}
      <div
        className={cn(
          "flex-1 min-w-0 min-h-0 h-full bg-slate-100 relative overflow-hidden",
          mobileView === "form" && "hidden lg:block"
        )}
      >
        {isLoadingBom ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <DesignMapPane
              job={job}
              bom={bom}
              mapStyles={mapStyles}
              visibleLayers={visibleLayers}
              onToggleLayer={toggleLayer}
              selectMode={selectMode}
              hoveredFeatureId={hoveredFeatureId}
              selectedFeatureIds={selectedFeatureIds}
              visibleFileIds={visibleFileIds}
              onSelectionComplete={handleSelectionComplete}
              onFeatureSelect={handleFeatureSelect}
              onToggleSelectMode={setSelectMode}
              focusMode={focusMode}
              onToggleFocusMode={setFocusMode}
              // LayerManager props
              sourceFiles={sourceFiles}
              segments={segments}
              selectedFileIds={selectedFileIds}
              onSelectFile={handleSelectFile}
              onHoverFile={setHoveredFileId}
              onToggleFileVisibility={handleToggleFileVisibility}
              onCreateSegment={handleCreateSegment}
              onUpdateSegment={handleUpdateSegment}
              onDeleteSegment={handleDeleteSegment}
              canEdit={canEdit}
            />
            {/* Floating Action Bar for selections */}
            <FloatingActionBar
              selectionBOM={selectionBOM}
              onClearSelection={handleClearSelection}
              onReview={handleOpenPreview}
            />
            
            {/* Selection Preview Panel */}
            <SelectionPreviewPanel
              isOpen={showPreviewPanel}
              onClose={() => setShowPreviewPanel(false)}
              selectionBOM={selectionBOM}
              detectedAssemblies={detectedAssemblies}
              jobBuildType={(job.jobBuildType as JobBuildType) || "full_build"}
              onAssemblyOverride={handleAssemblyOverride}
              onApplyToBOM={handleApplyToBOM}
              onClearSelection={handleClearSelection}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default RouteDesignStep;
