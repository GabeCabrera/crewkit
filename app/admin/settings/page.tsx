"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Settings, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Building2,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
  Calendar,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ProjectArea {
  id: string;
  name: string;
  prefix: string;
  nextSeq: number;
  _count: {
    jobPlans: number;
  };
}

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const isSuperuser = session?.user?.role === "SUPERUSER";
  const isAdmin = session?.user?.role === "ADMIN" || isSuperuser;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Company name settings (SUPERUSER only)
  const [companyName, setCompanyName] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySuccess, setCompanySuccess] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Work Schedule settings (ADMIN/SUPERUSER)
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4]); // Default Mon-Thu
  const [shiftHours, setShiftHours] = useState<number>(12);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Project Areas settings (ADMIN/SUPERUSER)
  const [projectAreas, setProjectAreas] = useState<ProjectArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [areasSuccess, setAreasSuccess] = useState<string | null>(null);
  
  // New area form
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaPrefix, setNewAreaPrefix] = useState("");
  const [addingArea, setAddingArea] = useState(false);
  
  // Edit area
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaName, setEditingAreaName] = useState("");
  const [editingAreaPrefix, setEditingAreaPrefix] = useState("");
  const [savingArea, setSavingArea] = useState(false);

  // Fetch project areas
  const fetchProjectAreas = useCallback(async () => {
    if (!isAdmin) return;
    
    setAreasLoading(true);
    try {
      const response = await fetch("/api/project-areas");
      if (response.ok) {
        const data = await response.json();
        setProjectAreas(data);
      }
    } catch (err) {
      console.error("Error fetching project areas:", err);
    } finally {
      setAreasLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    // Fetch system settings (company name for superuser, work schedule for admin+)
    if (isAdmin) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data.companyName) {
            setCompanyName(data.companyName);
          }
          if (data.workDays) {
            try {
              setWorkDays(JSON.parse(data.workDays));
            } catch {
              setWorkDays([1, 2, 3, 4]);
            }
          }
          if (data.shiftHours) {
            setShiftHours(data.shiftHours);
          }
        })
        .catch(console.error);
    }
    
    fetchProjectAreas();
  }, [isAdmin, fetchProjectAreas]);

  const handleSaveCompanyName = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanySuccess(null);
    setCompanyError(null);

    if (!companyName.trim()) {
      setCompanyError("Company name is required");
      return;
    }

    setCompanyLoading(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() }),
      });

      if (response.ok) {
        setCompanySuccess("Company name updated successfully");
        window.location.reload();
      } else {
        const data = await response.json();
        setCompanyError(data.error || "Failed to update company name");
      }
    } catch (err) {
      setCompanyError("An error occurred");
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleSaveWorkSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleSuccess(null);
    setScheduleError(null);

    if (workDays.length === 0) {
      setScheduleError("At least one work day must be selected");
      return;
    }

    if (shiftHours < 1 || shiftHours > 24) {
      setScheduleError("Shift hours must be between 1 and 24");
      return;
    }

    setScheduleLoading(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          workDays: JSON.stringify(workDays.sort((a, b) => a - b)),
          shiftHours 
        }),
      });

      if (response.ok) {
        setScheduleSuccess("Work schedule updated successfully");
        setTimeout(() => setScheduleSuccess(null), 3000);
      } else {
        const data = await response.json();
        setScheduleError(data.error || "Failed to update work schedule");
      }
    } catch (err) {
      setScheduleError("An error occurred");
    } finally {
      setScheduleLoading(false);
    }
  };

  const toggleWorkDay = (day: number) => {
    setWorkDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const DAYS_OF_WEEK = [
    { value: 0, label: "Sun" },
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
  ];

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/users/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        setSuccess("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to change password");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Project Areas handlers
  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setAreasError(null);
    setAreasSuccess(null);

    if (!newAreaName.trim() || !newAreaPrefix.trim()) {
      setAreasError("Name and prefix are required");
      return;
    }

    setAddingArea(true);
    try {
      const response = await fetch("/api/project-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAreaName.trim(),
          prefix: newAreaPrefix.trim().toUpperCase(),
        }),
      });

      if (response.ok) {
        setAreasSuccess("Project area added successfully");
        setNewAreaName("");
        setNewAreaPrefix("");
        await fetchProjectAreas();
        setTimeout(() => setAreasSuccess(null), 3000);
      } else {
        const data = await response.json();
        setAreasError(data.error || "Failed to add project area");
      }
    } catch (err) {
      setAreasError("An error occurred");
    } finally {
      setAddingArea(false);
    }
  };

  const startEditingArea = (area: ProjectArea) => {
    setEditingAreaId(area.id);
    setEditingAreaName(area.name);
    setEditingAreaPrefix(area.prefix);
  };

  const cancelEditingArea = () => {
    setEditingAreaId(null);
    setEditingAreaName("");
    setEditingAreaPrefix("");
  };

  const handleSaveArea = async () => {
    if (!editingAreaId) return;
    
    setAreasError(null);
    setSavingArea(true);
    
    try {
      const response = await fetch(`/api/project-areas/${editingAreaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingAreaName.trim(),
          prefix: editingAreaPrefix.trim().toUpperCase(),
        }),
      });

      if (response.ok) {
        setAreasSuccess("Project area updated successfully");
        cancelEditingArea();
        await fetchProjectAreas();
        setTimeout(() => setAreasSuccess(null), 3000);
      } else {
        const data = await response.json();
        setAreasError(data.error || "Failed to update project area");
      }
    } catch (err) {
      setAreasError("An error occurred");
    } finally {
      setSavingArea(false);
    }
  };

  const handleArchiveArea = async (areaId: string, areaName: string) => {
    if (!confirm(`Are you sure you want to archive "${areaName}"? Jobs in this area will keep their names, but you won't be able to create new jobs in this area.`)) {
      return;
    }

    setAreasError(null);
    try {
      const response = await fetch(`/api/project-areas/${areaId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAreasSuccess("Project area archived successfully");
        await fetchProjectAreas();
        setTimeout(() => setAreasSuccess(null), 3000);
      } else {
        const data = await response.json();
        setAreasError(data.error || "Failed to archive project area");
      }
    } catch (err) {
      setAreasError("An error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
              <p className="text-slate-500 text-sm sm:text-base">Manage your account settings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-3xl mx-auto space-y-8">
        {/* Change Password Section */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
              <p className="text-sm text-slate-500">Update your account password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-5">
            {success && (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl text-sm">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </div>
            )}
            
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="h-12 rounded-xl pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-slate-900 hover:bg-slate-800 rounded-xl h-12 px-6"
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </div>

        {/* Company Name Settings (SUPERUSER only) */}
        {isSuperuser && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Company Name</h2>
                <p className="text-sm text-slate-500">Configure the company name displayed in the app</p>
              </div>
            </div>

            <form onSubmit={handleSaveCompanyName} className="space-y-5">
              {companySuccess && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  {companySuccess}
                </div>
              )}
              
              {companyError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {companyError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className="h-12 rounded-xl"
                  maxLength={50}
                  required
                />
                <p className="text-xs text-slate-400">This name appears in the navigation bar</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="submit" 
                  disabled={companyLoading}
                  className="bg-orange-500 hover:bg-orange-600 rounded-xl h-12 px-6"
                >
                  {companyLoading ? "Saving..." : "Save Company Name"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Work Schedule Settings (ADMIN/SUPERUSER) */}
        {isAdmin && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Work Schedule</h2>
                <p className="text-sm text-slate-500">Configure default work days and shift length</p>
              </div>
            </div>

            <form onSubmit={handleSaveWorkSchedule} className="space-y-6">
              {scheduleSuccess && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  {scheduleSuccess}
                </div>
              )}
              
              {scheduleError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {scheduleError}
                </div>
              )}

              {/* Work Days Selection */}
              <div className="space-y-3">
                <Label>Default Work Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWorkDay(day.value)}
                      className={`
                        px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                        ${workDays.includes(day.value)
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }
                      `}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  Select the days your crew typically works. Jobs will auto-calculate end dates based on these days.
                </p>
              </div>

              {/* Shift Hours */}
              <div className="space-y-2">
                <Label htmlFor="shiftHours">Shift Length (hours)</Label>
                <Input
                  id="shiftHours"
                  type="number"
                  value={shiftHours}
                  onChange={(e) => setShiftHours(Number(e.target.value) || 12)}
                  placeholder="12"
                  className="h-12 rounded-xl w-32"
                  min="1"
                  max="24"
                  step="0.5"
                />
                <p className="text-xs text-slate-400">
                  Hours per shift. Used to convert hour estimates to work days.
                </p>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Current schedule:</span>{" "}
                  {workDays.length === 0 ? (
                    <span className="text-amber-600">No days selected</span>
                  ) : (
                    <>
                      {DAYS_OF_WEEK.filter(d => workDays.includes(d.value)).map(d => d.label).join(", ")}
                      {" "}({workDays.length} day{workDays.length !== 1 ? "s" : ""}/week, {shiftHours}hr shifts)
                    </>
                  )}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="submit" 
                  disabled={scheduleLoading}
                  className="bg-emerald-500 hover:bg-emerald-600 rounded-xl h-12 px-6"
                >
                  {scheduleLoading ? "Saving..." : "Save Schedule"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Project Areas Settings (ADMIN/SUPERUSER) */}
        {isAdmin && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Project Areas</h2>
                <p className="text-sm text-slate-500">Configure job naming prefixes by area</p>
              </div>
            </div>

            {areasSuccess && (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl text-sm mb-4">
                <CheckCircle2 className="h-4 w-4" />
                {areasSuccess}
              </div>
            )}
            
            {areasError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm mb-4">
                <AlertCircle className="h-4 w-4" />
                {areasError}
              </div>
            )}

            {/* Existing Areas List */}
            <div className="space-y-3 mb-6">
              {areasLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading areas...
                </div>
              ) : projectAreas.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No project areas defined yet</p>
                  <p className="text-sm mt-1">Add your first area below</p>
                </div>
              ) : (
                projectAreas.map((area) => (
                  <div
                    key={area.id}
                    className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    {editingAreaId === area.id ? (
                      // Editing mode
                      <>
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editingAreaPrefix}
                            onChange={(e) => setEditingAreaPrefix(e.target.value.toUpperCase())}
                            className="w-20 h-9 text-center font-mono font-bold"
                            maxLength={10}
                            placeholder="WM"
                          />
                          <Input
                            value={editingAreaName}
                            onChange={(e) => setEditingAreaName(e.target.value)}
                            className="flex-1 h-9"
                            placeholder="Area name"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleSaveArea}
                            disabled={savingArea}
                          >
                            {savingArea ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 text-emerald-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={cancelEditingArea}
                          >
                            <X className="h-4 w-4 text-slate-400" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      // Display mode
                      <>
                        <div className="h-9 px-3 rounded-lg bg-blue-100 text-blue-700 font-mono font-bold flex items-center justify-center min-w-[60px]">
                          {area.prefix}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-700 truncate">{area.name}</p>
                          <p className="text-xs text-slate-400">
                            {area._count.jobPlans} job{area._count.jobPlans !== 1 ? "s" : ""} • Next: {area.prefix}-MMYY-{String(area.nextSeq).padStart(3, '0')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-600"
                            onClick={() => startEditingArea(area)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                            onClick={() => handleArchiveArea(area.id, area.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add New Area Form */}
            <form onSubmit={handleAddArea} className="pt-4 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-700 mb-3">Add New Area</p>
              <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="newAreaPrefix" className="text-xs text-slate-500">Prefix</Label>
                  <Input
                    id="newAreaPrefix"
                    value={newAreaPrefix}
                    onChange={(e) => setNewAreaPrefix(e.target.value.toUpperCase())}
                    placeholder="WM"
                    className="w-20 h-11 text-center font-mono font-bold"
                    maxLength={10}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="newAreaName" className="text-xs text-slate-500">Name</Label>
                  <Input
                    id="newAreaName"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder="West Mountain"
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={addingArea || !newAreaName.trim() || !newAreaPrefix.trim()}
                  className="bg-blue-500 hover:bg-blue-600 h-11 px-4"
                >
                  {addingArea ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Jobs will be named: <span className="font-mono">{newAreaPrefix || "XX"}-MMYY-001</span>
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
