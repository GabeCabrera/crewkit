"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Upload,
  FileText,
  Image,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";

interface PermitType {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
}

interface PermitDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface JobPermit {
  id: string;
  permitTypeId: string;
  permitType: PermitType;
  isApproved: boolean;
  notes: string | null;
  documents: PermitDocument[];
  createdAt: string;
}

interface PermitsStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  refreshJob: () => Promise<void>;
  canEdit: boolean;
}

export function PermitsStep({ job, canEdit, refreshJob }: PermitsStepProps) {
  const [permitTypes, setPermitTypes] = useState<PermitType[]>([]);
  const [permits, setPermits] = useState<JobPermit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [customTypeName, setCustomTypeName] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [isAddingPermit, setIsAddingPermit] = useState(false);
  const [expandedPermits, setExpandedPermits] = useState<Set<string>>(new Set());
  const [uploadingPermitId, setUploadingPermitId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const allApproved = permits.length > 0 && permits.every((p) => p.isApproved);

  // Fetch permit types
  const fetchPermitTypes = useCallback(async () => {
    try {
      const response = await fetch("/api/permit-types");
      if (response.ok) {
        const data = await response.json();
        setPermitTypes(data);
      }
    } catch (error) {
      console.error("Error fetching permit types:", error);
    }
  }, []);

  // Fetch permits for this job
  const fetchPermits = useCallback(async () => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/permits`);
      if (response.ok) {
        const data = await response.json();
        setPermits(data);
      }
    } catch (error) {
      console.error("Error fetching permits:", error);
    } finally {
      setIsLoading(false);
    }
  }, [job.id]);

  useEffect(() => {
    fetchPermitTypes();
    fetchPermits();
  }, [fetchPermitTypes, fetchPermits]);

  // Get available permit types (not already added)
  const availableTypes = permitTypes.filter(
    (type) => !permits.some((p) => p.permitTypeId === type.id)
  );

  // Add permit to job
  const handleAddPermit = async () => {
    if (!selectedTypeId || isAddingPermit) return;

    setIsAddingPermit(true);
    try {
      const response = await fetch(`/api/job-plans/${job.id}/permits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permitTypeId: selectedTypeId }),
      });

      if (response.ok) {
        await fetchPermits();
        setSelectedTypeId("");
      }
    } catch (error) {
      console.error("Error adding permit:", error);
    } finally {
      setIsAddingPermit(false);
    }
  };

  // Create custom permit type and add to job
  const handleCreateCustomType = async () => {
    if (!customTypeName.trim() || isAddingPermit) return;

    setIsAddingPermit(true);
    try {
      // Create the custom permit type
      const typeResponse = await fetch("/api/permit-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customTypeName.trim() }),
      });

      if (typeResponse.ok) {
        const newType = await typeResponse.json();
        
        // Add it to the job
        const permitResponse = await fetch(`/api/job-plans/${job.id}/permits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permitTypeId: newType.id }),
        });

        if (permitResponse.ok) {
          await fetchPermitTypes();
          await fetchPermits();
          setCustomTypeName("");
          setIsAddingCustom(false);
        }
      }
    } catch (error) {
      console.error("Error creating custom permit type:", error);
    } finally {
      setIsAddingPermit(false);
    }
  };

  // Update permit approval status or notes
  const handleUpdatePermit = async (permitId: string, updates: { isApproved?: boolean; notes?: string }) => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/permits?permitId=${permitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedPermit = await response.json();
        setPermits((prev) =>
          prev.map((p) => (p.id === permitId ? updatedPermit : p))
        );
      }
    } catch (error) {
      console.error("Error updating permit:", error);
    }
  };

  // Delete permit from job
  const handleDeletePermit = async (permitId: string) => {
    try {
      const response = await fetch(`/api/job-plans/${job.id}/permits?permitId=${permitId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPermits((prev) => prev.filter((p) => p.id !== permitId));
      }
    } catch (error) {
      console.error("Error deleting permit:", error);
    }
  };

  // Upload document
  const handleFileUpload = async (permitId: string, file: File) => {
    setUploadingPermitId(permitId);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `/api/job-plans/${job.id}/permits/${permitId}/documents`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        await fetchPermits();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to upload document");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
    } finally {
      setUploadingPermitId(null);
    }
  };

  // Delete document
  const handleDeleteDocument = async (permitId: string, documentId: string) => {
    try {
      const response = await fetch(
        `/api/job-plans/${job.id}/permits/${permitId}/documents?documentId=${documentId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await fetchPermits();
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  // Toggle permit expansion
  const toggleExpanded = (permitId: string) => {
    setExpandedPermits((prev) => {
      const next = new Set(prev);
      if (next.has(permitId)) {
        next.delete(permitId);
      } else {
        next.add(permitId);
      }
      return next;
    });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all duration-300 ease-out",
          permits.length === 0
            ? "text-amber-600 bg-amber-50"
            : allApproved
            ? "text-emerald-600 bg-emerald-50"
            : "text-red-600 bg-red-50"
        )}
      >
        <div className="relative h-4 w-4 shrink-0">
          {permits.length === 0 ? (
            <AlertCircle className="h-4 w-4" />
          ) : allApproved ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
        </div>
        <span className="font-medium">
          {permits.length === 0
            ? "No permits added. Add required permits to proceed."
            : allApproved
            ? "All permits verified. Job is ready to proceed."
            : `${permits.filter((p) => p.isApproved).length} of ${permits.length} permits approved.`}
        </span>
      </div>

      {/* Add Permit Section */}
      {canEdit && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <h3 className="font-medium text-sm text-slate-700">Add Permit</h3>
          
          {!isAddingCustom ? (
            <div className="flex gap-2">
              <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                <SelectTrigger className="flex-1 bg-white">
                  <SelectValue placeholder="Select permit type..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ Create Custom Type</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  if (selectedTypeId === "__custom__") {
                    setIsAddingCustom(true);
                    setSelectedTypeId("");
                  } else {
                    handleAddPermit();
                  }
                }}
                disabled={!selectedTypeId || isAddingPermit}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isAddingPermit ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={customTypeName}
                onChange={(e) => setCustomTypeName(e.target.value)}
                placeholder="Enter custom permit type name..."
                className="flex-1 bg-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateCustomType();
                  if (e.key === "Escape") {
                    setIsAddingCustom(false);
                    setCustomTypeName("");
                  }
                }}
              />
              <Button
                onClick={handleCreateCustomType}
                disabled={!customTypeName.trim() || isAddingPermit}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isAddingPermit ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsAddingCustom(false);
                  setCustomTypeName("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Permits List */}
      <div className="space-y-3">
        {permits.map((permit) => {
          const isExpanded = expandedPermits.has(permit.id);
          const isUploading = uploadingPermitId === permit.id;

          return (
            <div
              key={permit.id}
              className={cn(
                "bg-white border rounded-xl overflow-hidden transition-all",
                permit.isApproved ? "border-emerald-200" : "border-slate-200"
              )}
            >
              {/* Permit Header */}
              <div className="flex items-center gap-3 p-4">
                <Checkbox
                  checked={permit.isApproved}
                  disabled={!canEdit}
                  onCheckedChange={(checked) =>
                    handleUpdatePermit(permit.id, { isApproved: checked === true })
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700 truncate">
                      {permit.permitType.name}
                    </span>
                    {permit.documents.length > 0 && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {permit.documents.length} doc{permit.documents.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {permit.permitType.description && (
                    <p className="text-xs text-slate-500 truncate">
                      {permit.permitType.description}
                    </p>
                  )}
                </div>
                <CheckCircle2
                  className={cn(
                    "h-5 w-5 transition-all duration-200 shrink-0",
                    permit.isApproved
                      ? "text-emerald-500 opacity-100"
                      : "text-slate-200 opacity-50"
                  )}
                />
                <button
                  onClick={() => toggleExpanded(permit.id)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50">
                  {/* Notes */}
                  {canEdit && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">Notes</label>
                      <Textarea
                        value={permit.notes || ""}
                        onChange={(e) =>
                          handleUpdatePermit(permit.id, { notes: e.target.value })
                        }
                        placeholder="Add notes about this permit..."
                        className="bg-white text-sm resize-none"
                        rows={2}
                      />
                    </div>
                  )}
                  {!canEdit && permit.notes && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Notes</label>
                      <p className="text-sm text-slate-600">{permit.notes}</p>
                    </div>
                  )}

                  {/* Documents */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-500">Documents</label>
                      {canEdit && (
                        <>
                          <input
                            ref={(el) => { fileInputRefs.current[permit.id] = el; }}
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(permit.id, file);
                                e.target.value = "";
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRefs.current[permit.id]?.click()}
                            disabled={isUploading}
                            className="h-7 text-xs"
                          >
                            {isUploading ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Upload className="h-3 w-3 mr-1" />
                            )}
                            Upload
                          </Button>
                        </>
                      )}
                    </div>

                    {permit.documents.length > 0 ? (
                      <div className="space-y-2">
                        {permit.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200"
                          >
                            <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                              {getFileIcon(doc.fileType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {doc.fileName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatFileSize(doc.fileSize)} • {doc.uploadedBy.name || doc.uploadedBy.email}
                              </p>
                            </div>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            {canEdit && (
                              <button
                                onClick={() => handleDeleteDocument(permit.id, doc.id)}
                                className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No documents uploaded</p>
                    )}
                  </div>

                  {/* Delete Permit */}
                  {canEdit && (
                    <div className="pt-2 border-t border-slate-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePermit(permit.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove Permit
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {permits.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No permits added yet</p>
            {canEdit && (
              <p className="text-xs mt-1">Use the dropdown above to add permits</p>
            )}
          </div>
        )}
      </div>

      <p className="text-sm text-slate-500">
        Add all required permits and verify them before construction can begin.
        Upload supporting documents for each permit as needed.
      </p>
    </div>
  );
}
