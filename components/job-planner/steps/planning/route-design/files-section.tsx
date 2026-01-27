"use client";

import { useState, useRef, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  FileText,
  Upload,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../../job-lifecycle-view";

interface FilesSectionProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
  refreshJob?: () => Promise<void>;
}

export function FilesSection({ job, updateJob, canEdit, refreshJob }: FilesSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasVetroLink = job.vetroProjectUrl && job.vetroProjectUrl.trim() !== "";

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    setIsUploading(true);
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
      setIsUploading(false);
    }
  }, [job.id, refreshJob]);

  // Handle print deletion
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

  return (
    <div className="space-y-3 pb-1">
      {/* Vetro Link */}
      <div className="space-y-1">
        <Label className="text-[10px]">Vetro Design Link</Label>
        <div className="flex gap-1">
          <Input
            type="url"
            value={job.vetroProjectUrl || ""}
            onChange={(e) => updateJob({ vetroProjectUrl: e.target.value })}
            placeholder="https://fibermap.vetro.io/..."
            className="h-8 text-xs flex-1"
            disabled={!canEdit}
          />
          {hasVetroLink && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => window.open(job.vetroProjectUrl!, "_blank")}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Construction Prints */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px]">Construction Prints</Label>
          {canEdit && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                    e.target.value = "";
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1 px-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  <Upload className="h-2.5 w-2.5" />
                )}
                Upload
              </Button>
            </>
          )}
        </div>

        {/* Prints List */}
        {job.constructionPrints && job.constructionPrints.length > 0 ? (
          <div className="space-y-1">
            {job.constructionPrints.map((print) => (
              <div
                key={print.id}
                className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded border border-slate-200"
              >
                <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-slate-700 truncate">
                    {print.fileName}
                  </p>
                </div>
                <a
                  href={print.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700"
                >
                  <Download className="h-3 w-3" />
                </a>
                {canEdit && (
                  <button
                    onClick={() => handleDeletePrint(print.id)}
                    className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            <FileText className="h-6 w-6 mx-auto text-slate-300 mb-1" />
            <p className="text-[10px] text-slate-500">No prints uploaded</p>
          </div>
        )}
      </div>
    </div>
  );
}
