"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileArchive,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Cable,
  Box,
  Milestone,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../../job-lifecycle-view";
import type { BOMData } from "../route-design-step";

interface MaterialsSectionProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
  bom: BOMData | null;
  isLoadingBom: boolean;
  refreshBom: () => Promise<void>;
  refreshJob?: () => Promise<void>;
}

export function MaterialsSection({
  job,
  updateJob,
  canEdit,
  bom,
  isLoadingBom,
  refreshBom,
  refreshJob,
}: MaterialsSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setUploadError("Please upload a ZIP file containing shapefiles");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File too large. Maximum size is 50MB");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

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
      setUploadError(error instanceof Error ? error.message : "Failed to import BOM");
    } finally {
      setIsUploading(false);
    }
  }, [job.id, refreshBom, refreshJob]);

  // Handle BOM deletion
  const handleDeleteBom = useCallback(async () => {
    if (!confirm("Delete imported BOM data?")) return;

    try {
      const response = await fetch(`/api/job-plans/${job.id}/bom`, {
        method: "DELETE",
      });

      if (response.ok) {
        await refreshBom();
      }
    } catch (error) {
      console.error("Error deleting BOM:", error);
    }
  }, [job.id, refreshBom]);

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const formatNumber = (num: number) => num.toLocaleString();

  // Loading state
  if (isLoadingBom) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-1">
      {/* GIS Import Section */}
      {bom ? (
        // BOM Summary (Compact)
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-slate-600">
                {bom.sourceFiles.length} files
              </span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Re-import
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleDeleteBom}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Compact Stats Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* Fiber */}
            {Object.keys(bom.summary.fiberByCount).length > 0 && (
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-1 mb-0.5">
                  <Cable className="h-3 w-3 text-blue-500" />
                  <span className="text-[10px] font-medium text-blue-700">Fiber</span>
                </div>
                <div className="space-y-0">
                  {Object.entries(bom.summary.fiberByCount)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .slice(0, 3)
                    .map(([count, footage]) => (
                      <div key={count} className="flex justify-between text-[10px]">
                        <span className="text-blue-600">{count}ct</span>
                        <span className="font-medium text-blue-700">{formatNumber(footage)}</span>
                      </div>
                    ))}
                  {Object.keys(bom.summary.fiberByCount).length > 3 && (
                    <p className="text-[10px] text-blue-400">
                      +{Object.keys(bom.summary.fiberByCount).length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Infrastructure */}
            <div className="p-2 bg-violet-50 rounded-lg border border-violet-100">
              <div className="flex items-center gap-1 mb-0.5">
                <Box className="h-3 w-3 text-violet-500" />
                <span className="text-[10px] font-medium text-violet-700">Infra</span>
              </div>
              <div className="space-y-0 text-[10px]">
                {bom.summary.mstCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-violet-600">MSTs</span>
                    <span className="font-medium text-violet-700">{bom.summary.mstCount}</span>
                  </div>
                )}
                {bom.summary.vaultCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-violet-600">Vaults</span>
                    <span className="font-medium text-violet-700">{bom.summary.vaultCount}</span>
                  </div>
                )}
                {bom.summary.spliceCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-violet-600">Splices</span>
                    <span className="font-medium text-violet-700">{bom.summary.spliceCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Poles */}
            {bom.summary.poleCount > 0 && (
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex items-center gap-1 mb-0.5">
                  <Milestone className="h-3 w-3 text-amber-500" />
                  <span className="text-[10px] font-medium text-amber-700">Poles</span>
                </div>
                <p className="text-sm font-bold text-amber-700">{bom.summary.poleCount}</p>
              </div>
            )}

            {/* Strand */}
            {bom.summary.totalStrandFootage > 0 && (
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <Cable className="h-3 w-3 text-slate-500" />
                  <span className="text-[10px] font-medium text-slate-600">Strand</span>
                </div>
                <p className="text-xs font-bold text-slate-700">
                  {formatNumber(bom.summary.totalStrandFootage)} ft
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Upload Zone (Compact)
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
            isDragging ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-violet-300",
            !canEdit && "opacity-60 pointer-events-none"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".zip"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileUpload(file);
                e.target.value = "";
              }
            }}
            disabled={!canEdit || isUploading}
          />

          {isUploading ? (
            <div className="space-y-1.5">
              <Loader2 className="h-6 w-6 mx-auto text-violet-500 animate-spin" />
              <p className="text-xs text-slate-600">Processing...</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="h-8 w-8 mx-auto rounded-lg bg-violet-100 flex items-center justify-center">
                <Upload className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">
                  Drop shapefile ZIP
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] text-violet-600 hover:text-violet-700"
                  disabled={!canEdit}
                >
                  or browse files
                </button>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="mt-3 p-2 bg-red-50 rounded flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600">{uploadError}</p>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input for re-import */}
      {bom && (
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".zip"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(file);
              e.target.value = "";
            }
          }}
          disabled={!canEdit || isUploading}
        />
      )}

      {/* Manual Override Section */}
      <div className="border-t border-slate-100 pt-3">
        <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2 block">
          {bom ? "Overrides" : "Manual Entry"}
        </Label>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-1">
            <Label className="text-[10px]">Strand ft</Label>
            <Input
              type="number"
              value={job.strandFootage || ""}
              onChange={(e) => updateJob({ strandFootage: Number(e.target.value) || 0 })}
              placeholder={bom ? formatNumber(bom.summary.totalStrandFootage) : "0"}
              className="h-7 text-xs"
              min="0"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Fiber ft</Label>
            <Input
              type="number"
              value={job.fiberFootage || ""}
              onChange={(e) => updateJob({ fiberFootage: Number(e.target.value) || 0 })}
              placeholder="×1.1"
              className="h-7 text-xs"
              min="0"
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* Hardware Counts */}
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          <div className="space-y-0.5">
            <Label className="text-[10px]">Dead-ends</Label>
            <Input
              type="number"
              value={job.deadEnds || ""}
              onChange={(e) => updateJob({ deadEnds: Number(e.target.value) || 0 })}
              placeholder="0"
              className="h-7 text-xs"
              min="0"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Tangents</Label>
            <Input
              type="number"
              value={job.tangents || ""}
              onChange={(e) => updateJob({ tangents: Number(e.target.value) || 0 })}
              placeholder="0"
              className="h-7 text-xs"
              min="0"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Anchors</Label>
            <Input
              type="number"
              value={job.anchors || ""}
              onChange={(e) => updateJob({ anchors: Number(e.target.value) || 0 })}
              placeholder="0"
              className="h-7 text-xs"
              min="0"
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
