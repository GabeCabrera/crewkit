"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { upload } from "@vercel/blob/client";
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
import { RedLightToggle } from "@/components/ui/red-light-toggle";
import {
  AlertCircle,
  Plus,
  Trash2,
  Upload as UploadIcon,
  FileText,
  Image as ImageIcon,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
  FileCheck,
  Zap,
  TrafficCone,
  MapPinned,
  Scale,
  Route,
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

// Traffic Light Icon Component
function TrafficLightIcon({ cleared }: { cleared: boolean }) {
  return (
    <div className="relative">
      {/* Glow effect */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full blur-xl opacity-50",
          cleared ? "bg-green-400" : "bg-red-400"
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Main light */}
      <motion.div
        className={cn(
          "relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center",
          "border-4 shadow-2xl",
          cleared
            ? "bg-green-500 border-green-300"
            : "bg-red-500 border-red-300"
        )}
        initial={false}
        animate={{
          backgroundColor: cleared ? "#22c55e" : "#ef4444",
          borderColor: cleared ? "#86efac" : "#fca5a5",
        }}
        transition={{ duration: 0.5 }}
      >
        {cleared ? (
          <motion.svg
            className="w-10 h-10 md:w-12 md:h-12 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.path d="M5 12l5 5L20 7" />
          </motion.svg>
        ) : (
          <motion.div
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-300/50"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
        )}
      </motion.div>
    </div>
  );
}

export function PermitsStep({ job, updateJob, canEdit, refreshJob }: PermitsStepProps) {
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

  // Calculate Red Light status
  const zoneACleared = 
    (job.redLightDotPermit ?? false) && 
    (job.redLightRowConfirmed ?? false);
  
  const zoneBCleared = 
    (job.redLightPowerLines ?? false) && 
    (job.redLightTrafficControl ?? false);
  
  const zoneCCleared = job.redLightPrintVerified ?? false;
  
  const allCleared = zoneACleared && zoneBCleared && zoneCCleared;

  // Count completed checks
  const totalChecks = 5;
  const completedChecks = [
    job.redLightDotPermit,
    job.redLightRowConfirmed,
    job.redLightPowerLines,
    job.redLightTrafficControl,
    job.redLightPrintVerified,
  ].filter(Boolean).length;

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
      const typeResponse = await fetch("/api/permit-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customTypeName.trim() }),
      });

      if (typeResponse.ok) {
        const newType = await typeResponse.json();
        
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
      await upload(file.name, file, {
        access: "public",
        handleUploadUrl: `/api/job-plans/${job.id}/permits/${permitId}/documents`,
      });
      await fetchPermits();
    } catch (error) {
      console.error("Error uploading document:", error);
      alert(error instanceof Error ? error.message : "Failed to upload document");
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
      return <ImageIcon className="h-4 w-4" />;
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
      {/* ============================================ */}
      {/* STATUS HERO BANNER */}
      {/* ============================================ */}
      <motion.div
        className={cn(
          "relative overflow-hidden rounded-2xl p-6 md:p-8",
          "transition-colors duration-500"
        )}
        initial={false}
        animate={{
          backgroundColor: allCleared ? "#dcfce7" : "#fef2f2",
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className={cn(
              "absolute inset-0",
              allCleared
                ? "bg-[radial-gradient(circle_at_50%_50%,_#22c55e_1px,_transparent_1px)]"
                : "bg-[radial-gradient(circle_at_50%_50%,_#ef4444_1px,_transparent_1px)]"
            )}
            style={{ backgroundSize: "20px 20px" }}
          />
        </div>

        <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Traffic Light */}
          <TrafficLightIcon cleared={allCleared} />

          {/* Status Text */}
          <div className="flex-1 text-center md:text-left">
            <motion.h2
              className={cn(
                "text-3xl md:text-4xl lg:text-5xl font-black tracking-tight",
                allCleared ? "text-green-700" : "text-red-700"
              )}
              initial={false}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.3 }}
              key={allCleared ? "cleared" : "stop"}
            >
              {allCleared ? "CLEARED FOR WORK" : "STOP"}
            </motion.h2>
            <p
              className={cn(
                "mt-2 text-lg font-medium",
                allCleared ? "text-green-600" : "text-red-600"
              )}
            >
              {allCleared
                ? "All safety checks passed. Crew may begin construction."
                : `${completedChecks} of ${totalChecks} checks complete`}
            </p>
          </div>

          {/* Progress Ring (mobile-friendly indicator) */}
          <div className="relative w-16 h-16 md:w-20 md:h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                className={allCleared ? "stroke-green-200" : "stroke-red-200"}
                strokeWidth="3"
              />
              <motion.circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                className={allCleared ? "stroke-green-500" : "stroke-red-500"}
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: completedChecks / totalChecks }}
                transition={{ duration: 0.5 }}
                style={{
                  strokeDasharray: "100",
                  strokeDashoffset: "0",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={cn(
                  "text-lg font-bold",
                  allCleared ? "text-green-700" : "text-red-700"
                )}
              >
                {completedChecks}/{totalChecks}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ============================================ */}
      {/* ZONE A: LEGAL & PERMITTING */}
      {/* ============================================ */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Scale className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Zone A: Legal & Permitting</h3>
            <p className="text-xs text-slate-500">Verify all permits and rights-of-way</p>
          </div>
          {zoneACleared && (
            <div className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Cleared
            </div>
          )}
        </div>

        <div className="space-y-2">
          {/* DOT Permit */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <RedLightToggle
              checked={job.redLightDotPermit ?? false}
              onCheckedChange={(checked) => updateJob({ redLightDotPermit: checked })}
              disabled={!canEdit}
              label="DOT Permit Approved"
              description="Department of Transportation permit is verified"
              icon={<FileCheck className="h-5 w-5" />}
            />
            
            {/* Evidence Field - Slides in when YES */}
            <AnimatePresence>
              {job.redLightDotPermit && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-2 bg-green-50/50 border-t border-green-100">
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                      Permit Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={job.dotPermitNumber ?? ""}
                      onChange={(e) => updateJob({ dotPermitNumber: e.target.value })}
                      placeholder="Enter DOT permit number..."
                      className="bg-white"
                      disabled={!canEdit}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ROW Confirmed */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <RedLightToggle
              checked={job.redLightRowConfirmed ?? false}
              onCheckedChange={(checked) => updateJob({ redLightRowConfirmed: checked })}
              disabled={!canEdit}
              label="Right of Way Confirmed"
              description="ROW access has been verified and secured"
              icon={<Route className="h-5 w-5" />}
            />
            
            <AnimatePresence>
              {job.redLightRowConfirmed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-2 bg-green-50/50 border-t border-green-100">
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                      Confirmation Notes
                    </label>
                    <Textarea
                      value={job.rowConfirmationNotes ?? ""}
                      onChange={(e) => updateJob({ rowConfirmationNotes: e.target.value })}
                      placeholder="Enter ROW confirmation details..."
                      className="bg-white resize-none"
                      rows={2}
                      disabled={!canEdit}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* ZONE B: SAFETY (LIFE SAVERS) */}
      {/* ============================================ */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Zone B: Safety</h3>
            <p className="text-xs text-amber-600 font-medium">LIFE SAVERS - These protect the crew</p>
          </div>
          {zoneBCleared && (
            <div className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Cleared
            </div>
          )}
        </div>

        <div className="space-y-2">
          {/* Power Lines */}
          <div className="rounded-xl border-2 border-amber-200 overflow-hidden bg-amber-50/30">
            <RedLightToggle
              checked={job.redLightPowerLines ?? false}
              onCheckedChange={(checked) => updateJob({ redLightPowerLines: checked })}
              disabled={!canEdit}
              label="Power Lines Identified"
              description="All overhead power lines have been located and marked"
              icon={<Zap className="h-5 w-5" />}
              className="bg-transparent hover:bg-amber-50/50"
            />
            
            <AnimatePresence>
              {job.redLightPowerLines && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-2 bg-green-50/50 border-t border-green-100">
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                      Power Line Notes
                    </label>
                    <Textarea
                      value={job.powerLineNotes ?? ""}
                      onChange={(e) => updateJob({ powerLineNotes: e.target.value })}
                      placeholder="Document power line locations and safety measures..."
                      className="bg-white resize-none"
                      rows={2}
                      disabled={!canEdit}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Traffic Control */}
          <div className="rounded-xl border-2 border-amber-200 overflow-hidden bg-amber-50/30">
            <RedLightToggle
              checked={job.redLightTrafficControl ?? false}
              onCheckedChange={(checked) => updateJob({ redLightTrafficControl: checked })}
              disabled={!canEdit}
              label="Traffic Control Set Up"
              description="Cones, signs, and flaggers are in position"
              icon={<TrafficCone className="h-5 w-5" />}
              className="bg-transparent hover:bg-amber-50/50"
            />
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* ZONE C: DESIGN */}
      {/* ============================================ */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <MapPinned className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Zone C: Design Verification</h3>
            <p className="text-xs text-slate-500">Sanity check - does the plan match reality?</p>
          </div>
          {zoneCCleared && (
            <div className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Cleared
            </div>
          )}
        </div>

        <div className="space-y-2">
          {/* Print Verification */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <RedLightToggle
              checked={job.redLightPrintVerified ?? false}
              onCheckedChange={(checked) => updateJob({ redLightPrintVerified: checked })}
              disabled={!canEdit}
              label="Print Matches Street"
              description="The design print has been verified against actual field conditions"
              icon={<MapPinned className="h-5 w-5" />}
            />
            
            <AnimatePresence>
              {job.redLightPrintVerified && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-2 bg-green-50/50 border-t border-green-100">
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                      Verification Notes
                    </label>
                    <Textarea
                      value={job.printVerificationNotes ?? ""}
                      onChange={(e) => updateJob({ printVerificationNotes: e.target.value })}
                      placeholder="Note any discrepancies or confirm match..."
                      className="bg-white resize-none"
                      rows={2}
                      disabled={!canEdit}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* ADDITIONAL PERMITS (Dynamic System) */}
      {/* ============================================ */}
      <div className="pt-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-1 mb-4">
          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <FileText className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Additional Permits</h3>
            <p className="text-xs text-slate-500">Track other permits specific to this job</p>
          </div>
        </div>

        {/* Add Permit Section */}
        {canEdit && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-3 mb-4">
            <h4 className="font-medium text-sm text-slate-700">Add Permit</h4>
            
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
                  <RedLightToggle
                    checked={permit.isApproved}
                    onCheckedChange={(checked) =>
                      handleUpdatePermit(permit.id, { isApproved: checked })
                    }
                    disabled={!canEdit}
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
                                <UploadIcon className="h-3 w-3 mr-1" />
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
            <div className="text-center py-6 text-slate-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No additional permits added</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
