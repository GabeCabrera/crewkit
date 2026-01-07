"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePageSkeleton, PageContent } from "@/components/layout/page-skeleton";
import { 
  Users, 
  Package, 
  Layers,
  Check,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Team {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface UsageLog {
  id: string;
  quantity: number;
  assembly: {
    id: string;
    name: string;
    categories: string[];
    items: {
      quantity: number;
      equipment: {
        id: string;
        name: string;
        pricePerUnit: number;
      };
    }[];
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface WorkerUsage {
  user: TeamMember;
  hasActivity: boolean;
  totalAssemblies: number;
  totalItems: number;
  logs: UsageLog[];
}

interface SummaryData {
  date: string;
  teamId: string | null;
  teamMembers: TeamMember[];
  usageByWorker: WorkerUsage[];
  totals: {
    assembliesUsed: number;
    itemsConsumed: number;
    fiberFootage: number | null;
  };
  reportExists: boolean;
  existingReportId: string | null;
}

export default function AdminEndOfDayPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [issues, setIssues] = useState("");

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchSummary(selectedTeamId);
    } else {
      setSummary(null);
    }
  }, [selectedTeamId]);

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams");
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
        if (data.length > 0) {
          setSelectedTeamId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching teams:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (teamId: string) => {
    setLoadingSummary(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/eod/summary?teamId=${teamId}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
        
        // Pre-select workers who had activity
        const activeWorkers = data.usageByWorker
          .filter((w: WorkerUsage) => w.hasActivity)
          .map((w: WorkerUsage) => w.user.id);
        setSelectedWorkers(activeWorkers);
      } else {
        const err = await response.json();
        setError(err.error || "Failed to load summary");
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
      setError("Failed to load summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const toggleWorker = (userId: string) => {
    setSelectedWorkers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!summary || selectedWorkers.length === 0 || !selectedTeamId) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/reports/eod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: summary.date,
          teamId: selectedTeamId,
          workersPresent: selectedWorkers,
          totalAssembliesUsed: summary.totals.assembliesUsed,
          totalItemsConsumed: summary.totals.itemsConsumed,
          totalFiberFootage: summary.totals.fiberFootage,
          notes: notes || null,
          issues: issues || null,
        }),
      });

      if (response.ok) {
        router.push("/admin/reports");
      } else {
        const err = await response.json();
        setError(err.error || "Failed to submit report");
      }
    } catch (err) {
      console.error("Error submitting report:", err);
      setError("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <TablePageSkeleton />;
  }

  if (teams.length === 0) {
    return (
      <PageContent>
        <div className="space-y-6">
          <PageHeader 
            title="End of Day Report" 
            description="Generate today&apos;s equipment usage report"
          />
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No Teams Found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a team first before generating reports.
              </p>
              <Button className="mt-4" onClick={() => router.push("/admin/teams")}>
                Create Team
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <div className="space-y-6">
        <PageHeader 
          title="End of Day Report" 
          description="Generate equipment usage report for a team"
        />

        {/* Team Selection */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Select Team</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loadingSummary && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-muted-foreground">Loading team data...</p>
            </CardContent>
          </Card>
        )}

        {error && !summary && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive/50" />
              <h3 className="mt-4 text-lg font-medium">Unable to Load</h3>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        {summary && summary.reportExists && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-medium">Report Already Submitted</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Today&apos;s end of day report has already been created for this team.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => router.push("/admin/reports")}
              >
                View Reports
              </Button>
            </CardContent>
          </Card>
        )}

        {summary && !summary.reportExists && !loadingSummary && (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Assemblies Used
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{summary.totals.assembliesUsed}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Items Consumed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{summary.totals.itemsConsumed}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{summary.teamMembers.length}</span>
                  </div>
                </CardContent>
              </Card>

              {summary.totals.fiberFootage !== null && summary.totals.fiberFootage > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Fiber Footage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Ruler className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold">{summary.totals.fiberFootage} ft</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Who Worked Today */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Who Worked Today
                </CardTitle>
                <CardDescription>
                  Select which team members worked today.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {summary.usageByWorker.map((worker) => (
                    <div
                      key={worker.user.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedWorkers.includes(worker.user.id)
                          ? "bg-primary/5 border-primary"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleWorker(worker.user.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {worker.user.name || worker.user.email}
                        </p>
                        {worker.hasActivity && (
                          <p className="text-xs text-muted-foreground">
                            {worker.totalAssemblies} assemblies, {worker.totalItems} items
                          </p>
                        )}
                      </div>
                      <div
                        className={cn(
                          "h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 ml-2",
                          selectedWorkers.includes(worker.user.id)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selectedWorkers.includes(worker.user.id) && (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {summary.usageByWorker.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No team members found for this team.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Usage Breakdown */}
            {selectedWorkers.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Usage Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {summary.usageByWorker
                      .filter((w) => selectedWorkers.includes(w.user.id) && w.hasActivity)
                      .map((worker) => (
                        <div key={worker.user.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">
                              {worker.user.name || worker.user.email}
                            </h4>
                            <span className="text-sm text-muted-foreground">
                              {worker.totalAssemblies} assemblies
                            </span>
                          </div>
                          <div className="space-y-2">
                            {worker.logs.map((log) => (
                              <div
                                key={log.id}
                                className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2"
                              >
                                <span>{log.assembly.name}</span>
                                <span className="text-muted-foreground">x{log.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    {summary.usageByWorker.filter(
                      (w) => selectedWorkers.includes(w.user.id) && w.hasActivity
                    ).length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No activity logged by selected workers today.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes and Issues */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                  <CardDescription>
                    Optional notes about today&apos;s work
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Any additional notes about today's work..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Issues or Blockers</CardTitle>
                  <CardDescription>
                    Document any problems encountered
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Any issues, blockers, or concerns..."
                    value={issues}
                    onChange={(e) => setIssues(e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Submit */}
            <Card className="border-0 shadow-sm">
              <CardContent className="py-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Ready to submit?</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedWorkers.length} worker{selectedWorkers.length !== 1 ? "s" : ""} selected
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={submitting || selectedWorkers.length === 0}
                  >
                    {submitting ? "Submitting..." : "Submit End of Day Report"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageContent>
  );
}
