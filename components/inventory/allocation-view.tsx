"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  AlertTriangle, 
  Package, 
  Briefcase,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JobPlan {
  id: string;
  jobName: string;
  status: string;
}

interface Equipment {
  id: string;
  name: string;
  sku: string;
  unitType: string;
  inventory?: {
    quantity: number;
  } | null;
}

interface Allocation {
  id: string;
  quantity: number;
  unit: string;
  source: string;
  equipment: Equipment;
  jobPlan: JobPlan;
}

interface AllocationSummary {
  equipmentId: string;
  equipment: Equipment;
  totalAllocated: number;
  inStock: number;
  available: number;
  allocations: Allocation[];
}

interface AllocationViewProps {
  className?: string;
}

export function AllocationView({ className }: AllocationViewProps) {
  const [allocations, setAllocations] = useState<AllocationSummary[]>([]);
  const [jobs, setJobs] = useState<JobPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [showLowOnly, setShowLowOnly] = useState(false);

  // Fetch allocations and jobs
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all allocations
        const response = await fetch("/api/inventory/allocations");
        if (response.ok) {
          const data = await response.json();
          setAllocations(data.allocations || []);
          setJobs(data.jobs || []);
        }
      } catch (error) {
        console.error("Error fetching allocations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter allocations
  const filteredAllocations = allocations.filter((alloc) => {
    // Search filter
    const matchesSearch = searchTerm === "" ||
      alloc.equipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alloc.equipment.sku.toLowerCase().includes(searchTerm.toLowerCase());

    // Job filter
    const matchesJob = selectedJob === "all" ||
      alloc.allocations.some((a) => a.jobPlan.id === selectedJob);

    // Low stock filter
    const matchesLow = !showLowOnly || alloc.available < 0;

    return matchesSearch && matchesJob && matchesLow;
  });

  // Format number
  const formatNumber = (num: number) => {
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  // Get status badge
  const getStatusBadge = (available: number, allocated: number) => {
    if (available < 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Shortage
        </Badge>
      );
    }
    if (available === 0 && allocated > 0) {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-700">
          Fully Allocated
        </Badge>
      );
    }
    if (allocated > 0) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          Allocated
        </Badge>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedJob} onValueChange={setSelectedJob}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.jobName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showLowOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowLowOnly(!showLowOnly)}
          className="gap-1.5"
        >
          <AlertTriangle className="w-4 h-4" />
          Low Stock Only
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground">Total Equipment</div>
          <div className="text-2xl font-semibold">{allocations.length}</div>
        </div>
        <div className="p-4 border rounded-lg bg-blue-50">
          <div className="text-sm text-blue-600">With Allocations</div>
          <div className="text-2xl font-semibold text-blue-700">
            {allocations.filter((a) => a.totalAllocated > 0).length}
          </div>
        </div>
        <div className="p-4 border rounded-lg bg-amber-50">
          <div className="text-sm text-amber-600">Fully Allocated</div>
          <div className="text-2xl font-semibold text-amber-700">
            {allocations.filter((a) => a.available === 0 && a.totalAllocated > 0).length}
          </div>
        </div>
        <div className="p-4 border rounded-lg bg-red-50">
          <div className="text-sm text-red-600">Shortages</div>
          <div className="text-2xl font-semibold text-red-700">
            {allocations.filter((a) => a.available < 0).length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Equipment</TableHead>
              <TableHead className="text-right">In Stock</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Jobs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAllocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Package className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">No allocations found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredAllocations.map((alloc) => (
                <TableRow key={alloc.equipmentId}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{alloc.equipment.name}</div>
                      <div className="text-xs text-muted-foreground">{alloc.equipment.sku}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(alloc.inStock)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(alloc.totalAllocated)}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-mono",
                    alloc.available < 0 && "text-red-600 font-semibold"
                  )}>
                    {formatNumber(alloc.available)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(alloc.available, alloc.totalAllocated)}
                  </TableCell>
                  <TableCell>
                    {alloc.allocations.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {alloc.allocations.slice(0, 2).map((a) => (
                          <Badge key={a.id} variant="outline" className="text-xs gap-1">
                            <Briefcase className="w-3 h-3" />
                            {a.jobPlan.jobName}
                          </Badge>
                        ))}
                        {alloc.allocations.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{alloc.allocations.length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default AllocationView;
