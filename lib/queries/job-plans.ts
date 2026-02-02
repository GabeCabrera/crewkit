"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface JobPlanFilters {
  status?: string;
  assignedToMe?: boolean;
  page?: number;
  limit?: number;
}

export interface JobPlanListItem {
  id: string;
  jobName: string;
  jobNumber: string | null;
  locationName: string | null;
  status: string;
  totalDistance: number;
  poleCount: number;
  plannedStartDate: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  assignments: Array<{
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  projectArea?: {
    id: string;
    name: string;
    prefix: string;
  } | null;
  _count: {
    comments: number;
  };
}

export interface PaginatedJobPlans {
  jobPlans: JobPlanListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Query keys factory for consistent cache key management
export const jobPlanKeys = {
  all: ["job-plans"] as const,
  lists: () => [...jobPlanKeys.all, "list"] as const,
  list: (filters: JobPlanFilters) => [...jobPlanKeys.lists(), filters] as const,
  details: () => [...jobPlanKeys.all, "detail"] as const,
  detail: (id: string) => [...jobPlanKeys.details(), id] as const,
};

// Fetch functions
async function fetchJobPlans(filters: JobPlanFilters = {}): Promise<PaginatedJobPlans> {
  const params = new URLSearchParams();
  
  if (filters.status) params.set("status", filters.status);
  if (filters.assignedToMe) params.set("assignedToMe", "true");
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  
  const response = await fetch(`/api/job-plans?${params}`);
  
  if (!response.ok) {
    throw new Error("Failed to fetch job plans");
  }
  
  return response.json();
}

async function fetchJobPlan(id: string) {
  const response = await fetch(`/api/job-plans/${id}`);
  
  if (!response.ok) {
    throw new Error("Failed to fetch job plan");
  }
  
  return response.json();
}

async function updateJobPlan(id: string, data: Record<string, unknown>) {
  const response = await fetch(`/api/job-plans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update job plan");
  }
  
  return response.json();
}

// Hooks

/**
 * Hook to fetch paginated list of job plans
 * @param filters - Optional filters for status, assignment, pagination
 * @param options - Additional React Query options
 */
export function useJobPlans(
  filters: JobPlanFilters = {},
  options: { enabled?: boolean; refetchInterval?: number } = {}
) {
  return useQuery({
    queryKey: jobPlanKeys.list(filters),
    queryFn: () => fetchJobPlans(filters),
    staleTime: 30_000, // Consider data fresh for 30 seconds
    ...options,
  });
}

/**
 * Hook to fetch a single job plan by ID
 * @param id - Job plan ID
 * @param options - Additional React Query options
 */
export function useJobPlan(
  id: string | null | undefined,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: jobPlanKeys.detail(id || ""),
    queryFn: () => fetchJobPlan(id!),
    enabled: !!id && (options.enabled !== false),
    staleTime: 30_000,
  });
}

/**
 * Hook to update a job plan
 * Automatically invalidates the job plans list cache on success
 */
export function useUpdateJobPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateJobPlan(id, data),
    onSuccess: (_, variables) => {
      // Invalidate both the specific job and the list
      queryClient.invalidateQueries({ queryKey: jobPlanKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: jobPlanKeys.lists() });
    },
  });
}

/**
 * Hook to prefetch a job plan (useful for hover states)
 */
export function usePrefetchJobPlan() {
  const queryClient = useQueryClient();
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: jobPlanKeys.detail(id),
      queryFn: () => fetchJobPlan(id),
      staleTime: 30_000,
    });
  };
}
