"use client";

import { useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  FolderOpen,
  File,
  Trash2,
  Edit2,
  Check,
  X,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Types
export interface Segment {
  id: string;
  name: string;
  fileIds: string[];
  color?: string | null;
  order: number;
}

export interface SourceFile {
  id: string;
  name: string;
  featureCount: number;
  footage?: number;
}

interface LayerManagerProps {
  sourceFiles: SourceFile[];
  segments: Segment[];
  selectedFileIds: Set<string>;
  hoveredFileId: string | null;
  visibleFileIds: Set<string>;
  onSelectFile: (fileId: string, multi?: boolean) => void;
  onHoverFile: (fileId: string | null) => void;
  onToggleFileVisibility: (fileId: string) => void;
  onCreateSegment: (name: string, fileIds: string[]) => Promise<void>;
  onUpdateSegment: (segmentId: string, updates: { name?: string; fileIds?: string[] }) => Promise<void>;
  onDeleteSegment: (segmentId: string) => Promise<void>;
  canEdit: boolean;
}

// Segment colors for visual distinction
const SEGMENT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
];

export function LayerManager({
  sourceFiles,
  segments,
  selectedFileIds,
  hoveredFileId,
  visibleFileIds,
  onSelectFile,
  onHoverFile,
  onToggleFileVisibility,
  onCreateSegment,
  onUpdateSegment,
  onDeleteSegment,
  canEdit,
}: LayerManagerProps) {
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Calculate unassigned files
  const assignedFileIds = new Set(segments.flatMap((s) => s.fileIds));
  const unassignedFiles = sourceFiles.filter((f) => !assignedFileIds.has(f.id));

  // Toggle segment expansion
  const toggleSegment = useCallback((segmentId: string) => {
    setExpandedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(segmentId)) {
        next.delete(segmentId);
      } else {
        next.add(segmentId);
      }
      return next;
    });
  }, []);

  // Start editing segment name
  const startEditing = useCallback((segment: Segment) => {
    setEditingSegmentId(segment.id);
    setEditingName(segment.name);
  }, []);

  // Save segment name
  const saveSegmentName = useCallback(async () => {
    if (editingSegmentId && editingName.trim()) {
      await onUpdateSegment(editingSegmentId, { name: editingName.trim() });
    }
    setEditingSegmentId(null);
    setEditingName("");
  }, [editingSegmentId, editingName, onUpdateSegment]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingSegmentId(null);
    setEditingName("");
  }, []);

  // Handle file click
  const handleFileClick = useCallback(
    (fileId: string, e: React.MouseEvent) => {
      onSelectFile(fileId, e.shiftKey || e.metaKey || e.ctrlKey);
    },
    [onSelectFile]
  );

  // Get file by ID
  const getFile = useCallback(
    (fileId: string) => sourceFiles.find((f) => f.id === fileId),
    [sourceFiles]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Layers</span>
        </div>
        <span className="text-xs text-slate-400">
          {sourceFiles.length} files
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Segments Section */}
        {segments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">
              Segments
            </p>
            {segments.map((segment, idx) => {
              const isExpanded = expandedSegments.has(segment.id);
              const isEditing = editingSegmentId === segment.id;
              const segmentColor = segment.color || SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
              const segmentFiles = segment.fileIds.map(getFile).filter(Boolean) as SourceFile[];

              return (
                <div
                  key={segment.id}
                  className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden"
                >
                  {/* Segment Header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => !isEditing && toggleSegment(segment.id)}
                  >
                    <button className="p-0.5 -ml-0.5">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: segmentColor }}
                    />
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveSegmentName();
                            if (e.key === "Escape") cancelEditing();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={saveSegmentName}
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={cancelEditing}
                        >
                          <X className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                          {segment.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {segment.fileIds.length} files
                        </span>
                        {canEdit && (
                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => startEditing(segment)}
                            >
                              <Edit2 className="h-3 w-3 text-slate-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => onDeleteSegment(segment.id)}
                            >
                              <Trash2 className="h-3 w-3 text-red-400" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Segment Files (Expanded) */}
                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-1">
                      {segmentFiles.map((file) => (
                        <FileItem
                          key={file.id}
                          file={file}
                          isSelected={selectedFileIds.has(file.id)}
                          isHovered={hoveredFileId === file.id}
                          isVisible={visibleFileIds.has(file.id)}
                          onClick={handleFileClick}
                          onHover={onHoverFile}
                          onToggleVisibility={onToggleFileVisibility}
                          indent
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Unassigned Files Section */}
        {unassignedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">
              Unassigned Layers
            </p>
            <div className="space-y-1">
              {unassignedFiles.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  isSelected={selectedFileIds.has(file.id)}
                  isHovered={hoveredFileId === file.id}
                  isVisible={visibleFileIds.has(file.id)}
                  onClick={handleFileClick}
                  onHover={onHoverFile}
                  onToggleVisibility={onToggleFileVisibility}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {sourceFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderOpen className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No layers imported</p>
            <p className="text-xs text-slate-400 mt-1">
              Import shapefiles to see layers here
            </p>
          </div>
        )}
      </div>

      {/* Selection Summary Footer */}
      {selectedFileIds.size > 0 && (
        <div className="border-t border-slate-200 px-4 py-3 bg-blue-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">
              {selectedFileIds.size} layer{selectedFileIds.size !== 1 ? "s" : ""} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100"
              onClick={() => {
                // Clear selection by clicking each selected file
                selectedFileIds.forEach((id) => onSelectFile(id, false));
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual file item component
interface FileItemProps {
  file: SourceFile;
  isSelected: boolean;
  isHovered: boolean;
  isVisible: boolean;
  onClick: (fileId: string, e: React.MouseEvent) => void;
  onHover: (fileId: string | null) => void;
  onToggleVisibility: (fileId: string) => void;
  indent?: boolean;
}

function FileItem({
  file,
  isSelected,
  isHovered,
  isVisible,
  onClick,
  onHover,
  onToggleVisibility,
  indent,
}: FileItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors group",
        indent && "ml-5",
        isSelected && "bg-blue-100 border border-blue-200",
        isHovered && !isSelected && "bg-slate-100",
        !isSelected && !isHovered && "hover:bg-slate-50"
      )}
      onClick={(e) => onClick(file.id, e)}
      onMouseEnter={() => onHover(file.id)}
      onMouseLeave={() => onHover(null)}
    >
      <File className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <span
        className={cn(
          "flex-1 text-sm truncate",
          isSelected ? "text-blue-700 font-medium" : "text-slate-600"
        )}
      >
        {file.name}
      </span>
      <span className="text-xs text-slate-400 tabular-nums">
        {file.featureCount}
      </span>
      <button
        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility(file.id);
        }}
      >
        {isVisible ? (
          <Eye className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 text-slate-300" />
        )}
      </button>
    </div>
  );
}

export default LayerManager;
