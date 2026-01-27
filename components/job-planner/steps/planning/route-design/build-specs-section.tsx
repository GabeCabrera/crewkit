"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  SegmentedControl,
  primaryMethodOptions,
  constructionTypeOptions,
  trafficControlOptions,
} from "@/components/ui/segmented-control";
import {
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSmartNavigationUrl } from "@/lib/mapbox";
import type { JobPlanData } from "../../../job-lifecycle-view";

interface BuildSpecsSectionProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function BuildSpecsSection({ job, updateJob, canEdit }: BuildSpecsSectionProps) {
  const primaryMethod = job.primaryMethod || "aerial";
  const showAerialFields = primaryMethod === "aerial" || primaryMethod === "both";
  const showUndergroundFields = primaryMethod === "underground" || primaryMethod === "both";

  // Calculate total footage for display
  const totalFootage = (job.aerialFootage || 0) + (job.undergroundFootage || 0) + (job.slackLoopFootage || 0);

  // Navigation URL
  const navigationUrl = getSmartNavigationUrl({
    address: job.locationAddress || undefined,
    lat: job.locationLat || undefined,
    lng: job.locationLng || undefined,
  });

  return (
    <div className="space-y-4 pb-1">
      {/* Primary Method */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
          Primary Method
        </Label>
        <SegmentedControl
          options={primaryMethodOptions}
          value={job.primaryMethod as "aerial" | "underground" | "both" | null}
          onChange={(value) => updateJob({ primaryMethod: value })}
          disabled={!canEdit}
          fullWidth
        />
      </div>

      {/* Construction Type */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
          Construction Type
        </Label>
        <SegmentedControl
          options={constructionTypeOptions}
          value={job.constructionType as "new_strand" | "overlash" | "adss" | "ug_dip" | null}
          onChange={(value) => updateJob({ constructionType: value })}
          disabled={!canEdit}
          fullWidth
        />
      </div>

      {/* Cable & Sag */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] flex items-center gap-1">
            <Cable className="h-2.5 w-2.5 text-slate-400" />
            Cable Profile
          </Label>
          <Input
            value={job.cableProfile || ""}
            onChange={(e) => updateJob({ cableProfile: e.target.value })}
            placeholder="144ct"
            className="h-8 text-xs"
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] flex items-center gap-1">
            <Ruler className="h-2.5 w-2.5 text-slate-400" />
            Sag/Tension
          </Label>
          <Input
            value={job.sagTensionSpec || ""}
            onChange={(e) => updateJob({ sagTensionSpec: e.target.value })}
            placeholder="NESC Heavy"
            className="h-8 text-xs"
            disabled={!canEdit}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            Scope of Work
          </Label>
          {totalFootage > 0 && (
            <span className="text-xs font-semibold text-slate-800">
              {totalFootage.toLocaleString()} ft
            </span>
          )}
        </div>

        {/* Aerial Fields */}
        {showAerialFields && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Aerial
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Aerial Footage</Label>
                <Input
                  type="number"
                  value={job.aerialFootage || ""}
                  onChange={(e) => updateJob({ aerialFootage: Number(e.target.value) || 0 })}
                  placeholder="8500"
                  className="h-8 text-xs"
                  min="0"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] flex items-center gap-1">
                  <Milestone className="h-2.5 w-2.5 text-slate-400" />
                  Poles
                </Label>
                <Input
                  type="number"
                  value={job.poleCount || ""}
                  onChange={(e) => updateJob({ poleCount: Number(e.target.value) || 0 })}
                  placeholder="45"
                  className="h-8 text-xs"
                  min="0"
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>
        )}

        {/* Underground Fields */}
        {showUndergroundFields && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Underground
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Underground / Riser Footage</Label>
              <Input
                type="number"
                value={job.undergroundFootage || ""}
                onChange={(e) => updateJob({ undergroundFootage: Number(e.target.value) || 0 })}
                placeholder="2500"
                className="h-8 text-xs"
                min="0"
                disabled={!canEdit}
              />
            </div>
          </div>
        )}

        {/* Slack Loop */}
        <div className="space-y-1 mb-3">
          <Label className="text-[10px]">Slack Loop Footage</Label>
          <Input
            type="number"
            value={job.slackLoopFootage || ""}
            onChange={(e) => updateJob({ slackLoopFootage: Number(e.target.value) || 0 })}
            placeholder="500"
            className="h-8 text-xs"
            min="0"
            disabled={!canEdit}
          />
        </div>

        {/* Make-Ready Toggle */}
        <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-100">
          <div className="flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5 text-amber-600" />
            <div>
              <p className="text-xs font-medium text-slate-800">Make-Ready</p>
              <p className="text-[10px] text-slate-500">Pre-work required</p>
            </div>
          </div>
          <Switch
            checked={job.makeReadyRequired || false}
            onCheckedChange={(checked) => updateJob({ makeReadyRequired: checked === true })}
            disabled={!canEdit}
          />
        </div>
      </div>

      {/* Access & Logistics */}
      <div className="border-t border-slate-100 pt-3">
        <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2 block">
          Access & Logistics
        </Label>

        {/* Address */}
        <div className="space-y-1 mb-2">
          <Label className="text-[10px] flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5 text-slate-400" />
            Site Address
          </Label>
          <div className="flex gap-1">
            <Input
              value={job.locationAddress || ""}
              onChange={(e) => updateJob({ locationAddress: e.target.value })}
              placeholder="123 Main St, City"
              className="h-8 text-xs flex-1"
              disabled={!canEdit}
            />
            {(job.locationAddress || (job.locationLat && job.locationLng)) && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 shrink-0"
                onClick={() => window.open(navigationUrl, "_blank")}
              >
                <Navigation className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div className="space-y-0.5">
            <Label className="text-[10px] text-slate-400">Lat</Label>
            <Input
              type="number"
              step="any"
              value={job.locationLat || ""}
              onChange={(e) => updateJob({ locationLat: e.target.value ? Number(e.target.value) : null })}
              placeholder="40.7128"
              className="h-7 text-[10px]"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px] text-slate-400">Lng</Label>
            <Input
              type="number"
              step="any"
              value={job.locationLng || ""}
              onChange={(e) => updateJob({ locationLng: e.target.value ? Number(e.target.value) : null })}
              placeholder="-74.0060"
              className="h-7 text-[10px]"
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* Gate Code */}
        <div className="space-y-1 mb-2">
          <Label className="text-[10px] flex items-center gap-1">
            <Lock className="h-2.5 w-2.5 text-slate-400" />
            Gate Code
          </Label>
          <Input
            value={job.gateCode || ""}
            onChange={(e) => updateJob({ gateCode: e.target.value })}
            placeholder="1234"
            className="h-8 text-sm font-mono tracking-wider"
            disabled={!canEdit}
          />
        </div>

        {/* Traffic Control */}
        <div className="space-y-1.5 mb-2">
          <Label className="text-[10px]">Traffic Control</Label>
          <SegmentedControl
            options={trafficControlOptions}
            value={job.trafficControlTier as "none" | "cones" | "flaggers" | null}
            onChange={(value) => updateJob({ trafficControlTier: value })}
            disabled={!canEdit}
            fullWidth
          />
        </div>

        {/* Pole Owner */}
        <div className="space-y-1 mb-2">
          <Label className="text-[10px] flex items-center gap-1">
            <Building className="h-2.5 w-2.5 text-slate-400" />
            Pole Owner
          </Label>
          <Input
            value={job.poleOwner || ""}
            onChange={(e) => updateJob({ poleOwner: e.target.value })}
            placeholder="Rocky Mountain Power"
            className="h-8 text-xs"
            disabled={!canEdit}
          />
        </div>

        {/* Site Contact */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-1">
            <Label className="text-[10px] flex items-center gap-1">
              <User className="h-2.5 w-2.5 text-slate-400" />
              Contact
            </Label>
            <Input
              value={job.siteContactName || ""}
              onChange={(e) => updateJob({ siteContactName: e.target.value })}
              placeholder="Name"
              className="h-8 text-xs"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] flex items-center gap-1">
              <Phone className="h-2.5 w-2.5 text-slate-400" />
              Phone
            </Label>
            <div className="flex gap-1">
              <Input
                value={job.siteContactPhone || ""}
                onChange={(e) => updateJob({ siteContactPhone: e.target.value })}
                placeholder="(555) 123-4567"
                className="h-8 text-xs flex-1"
                disabled={!canEdit}
              />
              {job.siteContactPhone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => window.open(`tel:${job.siteContactPhone}`, "_self")}
                >
                  <Phone className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
