"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  SegmentedControl,
  primaryMethodOptions,
  constructionTypeOptions,
  trafficControlOptions,
} from "@/components/ui/segmented-control";
import {
  ExternalLink,
  MapPin,
  Hash,
  FileText,
  Ruler,
  Milestone,
  Pencil,
  Check,
  X,
  ArrowRight,
  Navigation,
  Phone,
  Upload,
  Trash2,
  Download,
  Loader2,
  AlertTriangle,
  Cable,
  Wrench,
  Lock,
  Map,
  Building,
  User,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMapThumbnailUrl, getSmartNavigationUrl } from "@/lib/mapbox";
import type { JobPlanData } from "../../job-lifecycle-view";

interface RouteStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  refreshJob?: () => Promise<void>;
  canEdit: boolean;
  onNavigate?: (stepId: string) => void;
}

export function RouteStep({ job, updateJob, canEdit, onNavigate, refreshJob }: RouteStepProps) {
  const hasVetroLink = job.vetroProjectUrl && job.vetroProjectUrl.trim() !== "";
  
  // Click-to-edit state for job name
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(job.jobName);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine which fields to show based on primary method
  const primaryMethod = job.primaryMethod || "aerial";
  const showAerialFields = primaryMethod === "aerial" || primaryMethod === "both";
  const showUndergroundFields = primaryMethod === "underground" || primaryMethod === "both";

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Sync editedName with job.jobName
  useEffect(() => {
    setEditedName(job.jobName);
  }, [job.jobName]);

  const handleNameSave = () => {
    if (editedName.trim()) {
      updateJob({ jobName: editedName.trim() });
    } else {
      setEditedName(job.jobName);
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setEditedName(job.jobName);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === "Escape") {
      handleNameCancel();
    }
  };

  // File upload handler
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      await upload(file.name, file, {
        access: "public",
        handleUploadUrl: `/api/job-plans/${job.id}/prints`,
      });
      
      // Refresh job data to get the new print
      if (refreshJob) {
        await refreshJob();
      }
    } catch (error) {
      console.error("Error uploading construction print:", error);
      alert(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
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

  // Generate map thumbnail URL
  const mapThumbnailUrl = job.locationLat && job.locationLng
    ? getMapThumbnailUrl({
        lat: job.locationLat,
        lng: job.locationLng,
        zoom: 15,
        width: 400,
        height: 200,
      })
    : null;

  // Navigation URL
  const navigationUrl = getSmartNavigationUrl({
    address: job.locationAddress || undefined,
    lat: job.locationLat || undefined,
    lng: job.locationLng || undefined,
  });

  // Get hazard warnings to display
  const hazardWarnings = [];
  if (job.trafficControl) hazardWarnings.push("Traffic Control");
  if (job.treeTrimming) hazardWarnings.push("Tree Trimming");
  if (job.animalHazards) hazardWarnings.push("Animal Hazards");
  if (job.waterRailCrossing) hazardWarnings.push("Water/Rail Crossing");

  // Calculate total footage for display
  const totalFootage = (job.aerialFootage || 0) + (job.undergroundFootage || 0) + (job.slackLoopFootage || 0);

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* IDENTITY HEADER */}
      {/* ============================================ */}
      <div className="space-y-4">
        {/* Job Name - Click to Edit Title */}
        <div className="pb-4 border-b border-slate-200">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                ref={nameInputRef}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={handleNameSave}
                className="text-2xl font-bold h-12 px-3"
                placeholder="Enter job name..."
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNameSave}
                className="h-10 w-10 shrink-0"
              >
                <Check className="h-5 w-5 text-emerald-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNameCancel}
                className="h-10 w-10 shrink-0"
              >
                <X className="h-5 w-5 text-slate-400" />
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "group flex items-center gap-3",
                canEdit && "cursor-pointer"
              )}
              onClick={() => canEdit && setIsEditingName(true)}
            >
              <h1 className="text-2xl font-bold text-slate-900">
                {job.jobName || "Untitled Job"}
              </h1>
              {canEdit && (
                <Pencil className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          )}
          <p className="text-sm text-slate-500 mt-1">
            {job.locationName || job.jobNumber || "Define job details below"}
          </p>
        </div>

        {/* Job Number & Location - Side by Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="jobNumber" className="text-sm font-medium flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-slate-400" />
              Job Number
            </Label>
            <Input
              id="jobNumber"
              type="text"
              value={job.jobNumber || ""}
              onChange={(e) => updateJob({ jobNumber: e.target.value })}
              placeholder="e.g., JOB-2024-001"
              className="h-11 rounded-lg"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationName" className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Location / Area
            </Label>
            <Input
              id="locationName"
              type="text"
              value={job.locationName || ""}
              onChange={(e) => updateJob({ locationName: e.target.value })}
              placeholder="e.g., Oak Hills Phase 2"
              className="h-11 rounded-lg"
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION A: BUILD SPEC */}
      {/* ============================================ */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white border border-blue-200 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <span className="font-semibold text-slate-700">Build Spec</span>
              <p className="text-xs text-slate-500">Technical specifications for the crew</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 bg-white">
          {/* Primary Method Toggle */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Primary Method</Label>
            <SegmentedControl
              options={primaryMethodOptions}
              value={job.primaryMethod as "aerial" | "underground" | "both" | null}
              onChange={(value) => updateJob({ primaryMethod: value })}
              disabled={!canEdit}
              fullWidth
            />
            <p className="text-xs text-slate-500">
              This controls which scope fields are shown below
            </p>
          </div>

          {/* Construction Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Construction Type</Label>
            <SegmentedControl
              options={constructionTypeOptions}
              value={job.constructionType as "new_strand" | "overlash" | "adss" | "ug_dip" | null}
              onChange={(value) => updateJob({ constructionType: value })}
              disabled={!canEdit}
              fullWidth
            />
            <p className="text-xs text-slate-500">
              {job.constructionType === "new_strand" && "New strand installation - expect a slower day"}
              {job.constructionType === "overlash" && "Overlash on existing strand - faster pacing"}
              {job.constructionType === "adss" && "All-Dielectric Self-Supporting cable"}
              {job.constructionType === "ug_dip" && "Underground dip/transition point"}
              {!job.constructionType && "Select the type of work being performed"}
            </p>
          </div>

          {/* Cable Profile & Sag Spec */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cableProfile" className="text-sm font-medium flex items-center gap-1.5">
                <Cable className="h-3.5 w-3.5 text-slate-400" />
                Cable Profile
              </Label>
              <Input
                id="cableProfile"
                type="text"
                value={job.cableProfile || ""}
                onChange={(e) => updateJob({ cableProfile: e.target.value })}
                placeholder="e.g., 144ct Loose Tube"
                className="h-11 rounded-lg"
                disabled={!canEdit}
              />
              <p className="text-xs text-slate-500">
                Cable size affects equipment needs
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sagTensionSpec" className="text-sm font-medium flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5 text-slate-400" />
                Sag/Tension Spec
              </Label>
              <Input
                id="sagTensionSpec"
                type="text"
                value={job.sagTensionSpec || ""}
                onChange={(e) => updateJob({ sagTensionSpec: e.target.value })}
                placeholder="e.g., NESC Heavy, 1% Initial"
                className="h-11 rounded-lg"
                disabled={!canEdit}
              />
              <p className="text-xs text-slate-500">
                Required for correct line sagging
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION B: MAPS & PRINTS */}
      {/* ============================================ */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white border border-violet-200 flex items-center justify-center">
              <Map className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <span className="font-semibold text-slate-700">Maps & Prints</span>
              <p className="text-xs text-slate-500">Design documents and route visualization</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 bg-white">
          {/* Vetro Link */}
          <div className="space-y-2">
            <Label htmlFor="vetroProjectUrl" className="text-sm font-medium">
              Vetro Design Link
            </Label>
            <div className="flex gap-2">
              <Input
                id="vetroProjectUrl"
                type="url"
                value={job.vetroProjectUrl || ""}
                onChange={(e) => updateJob({ vetroProjectUrl: e.target.value })}
                placeholder="https://fibermap.vetro.io/..."
                className="h-11 rounded-lg flex-1"
                disabled={!canEdit}
              />
              {hasVetroLink && (
                <Button
                  variant="outline"
                  size="default"
                  className="h-11 px-4 gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
                  onClick={() => window.open(job.vetroProjectUrl!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Live Map
                </Button>
              )}
            </div>
          </div>

          {/* Construction Prints Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Construction Prints (PDF)</Label>
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="h-8 text-xs gap-1.5"
                  >
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload Print
                  </Button>
                </>
              )}
            </div>

            {/* Uploaded Prints List */}
            {job.constructionPrints && job.constructionPrints.length > 0 ? (
              <div className="space-y-2">
                {job.constructionPrints.map((print) => (
                  <div
                    key={print.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <FileText className="h-5 w-5 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {print.fileName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(print.fileSize / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <a
                      href={print.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    {canEdit && (
                      <button
                        onClick={() => handleDeletePrint(print.id)}
                        className="p-2 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No construction prints uploaded</p>
                <p className="text-xs mt-1">Upload PDFs with red lines and pole notes</p>
              </div>
            )}
          </div>

          {/* Map Thumbnail Preview */}
          {mapThumbnailUrl ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Location Preview</Label>
              <div className="relative rounded-lg overflow-hidden border border-slate-200">
                <img
                  src={mapThumbnailUrl}
                  alt="Job location map"
                  className="w-full h-40 object-cover"
                />
                <div className="absolute bottom-2 right-2">
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 bg-white/90 text-slate-700 hover:bg-white shadow-sm"
                    onClick={() => window.open(navigationUrl, "_blank")}
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Navigate
                  </Button>
                </div>
              </div>
            </div>
          ) : job.locationAddress ? (
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-sm text-slate-500">
                Add coordinates for map preview
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION C: SCOPE OF WORK */}
      {/* ============================================ */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
              <Ruler className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex-1">
              <span className="font-semibold text-slate-700">Scope of Work</span>
              <p className="text-xs text-slate-500">Footage and quantities to be completed</p>
            </div>
            {totalFootage > 0 && (
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">{totalFootage.toLocaleString()} ft</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4 bg-white">
          {/* Aerial Fields - shown when aerial or both */}
          {showAerialFields && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Aerial Construction
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aerialFootage" className="text-sm font-medium">
                    Aerial Footage (ft)
                  </Label>
                  <Input
                    id="aerialFootage"
                    type="number"
                    value={job.aerialFootage || ""}
                    onChange={(e) => updateJob({ aerialFootage: Number(e.target.value) || 0 })}
                    placeholder="e.g., 8500"
                    className="h-11 rounded-lg"
                    min="0"
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poleCount" className="text-sm font-medium flex items-center gap-1.5">
                    <Milestone className="h-3.5 w-3.5 text-slate-400" />
                    Pole Attachments
                  </Label>
                  <Input
                    id="poleCount"
                    type="number"
                    value={job.poleCount || ""}
                    onChange={(e) => updateJob({ poleCount: Number(e.target.value) || 0 })}
                    placeholder="e.g., 45"
                    className="h-11 rounded-lg"
                    min="0"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Underground Fields - shown when underground or both */}
          {showUndergroundFields && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Underground Construction
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="undergroundFootage" className="text-sm font-medium">
                  Underground / Riser Footage (ft)
                </Label>
                <Input
                  id="undergroundFootage"
                  type="number"
                  value={job.undergroundFootage || ""}
                  onChange={(e) => updateJob({ undergroundFootage: Number(e.target.value) || 0 })}
                  placeholder="e.g., 2500"
                  className="h-11 rounded-lg"
                  min="0"
                  disabled={!canEdit}
                />
                <p className="text-xs text-slate-500">Includes conduit, bore, and trench footage</p>
              </div>
            </div>
          )}

          {/* Slack Loop - always shown */}
          <div className="space-y-2">
            <Label htmlFor="slackLoopFootage" className="text-sm font-medium">
              Slack Loop Footage (ft)
            </Label>
            <Input
              id="slackLoopFootage"
              type="number"
              value={job.slackLoopFootage || ""}
              onChange={(e) => updateJob({ slackLoopFootage: Number(e.target.value) || 0 })}
              placeholder="e.g., 500"
              className="h-11 rounded-lg"
              min="0"
              disabled={!canEdit}
            />
            <p className="text-xs text-slate-500">Often missed - 10 loops @ 50ft adds up</p>
          </div>

          {/* Make-Ready Toggle */}
          <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Wrench className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Make-Ready Required</p>
                <p className="text-xs text-slate-500">Moving power/comm lines before fiber work</p>
              </div>
            </div>
            <Switch
              checked={job.makeReadyRequired || false}
              onCheckedChange={(checked) => updateJob({ makeReadyRequired: checked === true })}
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION D: ACCESS & LOGISTICS */}
      {/* ============================================ */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white border border-emerald-200 flex items-center justify-center">
              <Navigation className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <span className="font-semibold text-slate-700">Access & Logistics</span>
              <p className="text-xs text-slate-500">Everything the crew needs to arrive and work</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 bg-white">
          {/* Location Address with Navigate */}
          <div className="space-y-2">
            <Label htmlFor="locationAddress" className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Site Address
            </Label>
            <div className="flex gap-2">
              <Input
                id="locationAddress"
                type="text"
                value={job.locationAddress || ""}
                onChange={(e) => updateJob({ locationAddress: e.target.value })}
                placeholder="123 Main St, City, State 12345"
                className="h-11 rounded-lg flex-1"
                disabled={!canEdit}
              />
              {(job.locationAddress || (job.locationLat && job.locationLng)) && (
                <Button
                  variant="outline"
                  size="default"
                  className="h-11 px-4 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => window.open(navigationUrl, "_blank")}
                >
                  <Navigation className="h-4 w-4" />
                  Navigate
                </Button>
              )}
            </div>
          </div>

          {/* Coordinates - collapsed unless needed */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locationLat" className="text-xs font-medium text-slate-500">
                Latitude
              </Label>
              <Input
                id="locationLat"
                type="number"
                step="any"
                value={job.locationLat || ""}
                onChange={(e) => updateJob({ locationLat: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 40.7128"
                className="h-9 rounded-lg text-sm"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationLng" className="text-xs font-medium text-slate-500">
                Longitude
              </Label>
              <Input
                id="locationLng"
                type="number"
                step="any"
                value={job.locationLng || ""}
                onChange={(e) => updateJob({ locationLng: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., -74.0060"
                className="h-9 rounded-lg text-sm"
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Gate Code - Large, easy to read */}
          <div className="space-y-2">
            <Label htmlFor="gateCode" className="text-sm font-medium flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              Gate Code / Access Info
            </Label>
            <Input
              id="gateCode"
              type="text"
              value={job.gateCode || ""}
              onChange={(e) => updateJob({ gateCode: e.target.value })}
              placeholder="e.g., 1234 or 'Key under mat'"
              className="h-12 rounded-lg text-lg font-mono tracking-wider"
              inputMode="numeric"
              disabled={!canEdit}
            />
          </div>

          {/* Traffic Control - Segmented */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Traffic Control Level</Label>
            <SegmentedControl
              options={trafficControlOptions}
              value={job.trafficControlTier as "none" | "cones" | "flaggers" | null}
              onChange={(value) => updateJob({ trafficControlTier: value })}
              disabled={!canEdit}
              fullWidth
              size="lg"
            />
          </div>

          {/* Pole Owner */}
          <div className="space-y-2">
            <Label htmlFor="poleOwner" className="text-sm font-medium flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              Pole Owner
            </Label>
            <Input
              id="poleOwner"
              type="text"
              value={job.poleOwner || ""}
              onChange={(e) => updateJob({ poleOwner: e.target.value })}
              placeholder="e.g., Rocky Mountain Power, CenturyLink"
              className="h-11 rounded-lg"
              disabled={!canEdit}
            />
            <p className="text-xs text-slate-500">Determines whose rules you follow on-site</p>
          </div>

          {/* Site Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteContactName" className="text-sm font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Site Contact Name
              </Label>
              <Input
                id="siteContactName"
                type="text"
                value={job.siteContactName || ""}
                onChange={(e) => updateJob({ siteContactName: e.target.value })}
                placeholder="e.g., John Smith"
                className="h-11 rounded-lg"
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteContactPhone" className="text-sm font-medium flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                Contact Phone
              </Label>
              <div className="flex gap-2">
                <Input
                  id="siteContactPhone"
                  type="tel"
                  value={job.siteContactPhone || ""}
                  onChange={(e) => updateJob({ siteContactPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="h-11 rounded-lg flex-1"
                  disabled={!canEdit}
                />
                {job.siteContactPhone && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => window.open(`tel:${job.siteContactPhone}`, "_self")}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Hazard Tags - Auto-pulled from Hazards step */}
          {hazardWarnings.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Hazards Identified</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hazardWarnings.map((hazard) => (
                  <span
                    key={hazard}
                    className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium"
                  >
                    {hazard}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* CONTINUE NAVIGATION */}
      {/* ============================================ */}
      {onNavigate && job.jobName && totalFootage > 0 && (
        <div className="pt-4 border-t border-slate-200">
          <Button
            onClick={() => onNavigate("permits")}
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white gap-2"
          >
            Continue to Red Light Check
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
