"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, X, Search, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface CrewStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  refreshJob: () => Promise<void>;
  canEdit: boolean;
}

export function CrewStep({ job, refreshJob, canEdit }: CrewStepProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  // Search for users
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const users = await response.json();
        // Filter out already assigned users
        const assignedIds = new Set(job.assignments.map((a) => a.userId));
        setSearchResults(users.filter((u: User) => !assignedIds.has(u.id)));
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  }, [job.assignments]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, searchUsers]);

  // Assign user to job
  const assignUser = async (userId: string) => {
    setIsAssigning(userId);
    try {
      const response = await fetch(`/api/job-plans/${job.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        await refreshJob();
        setSearchQuery("");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error assigning user:", error);
    } finally {
      setIsAssigning(null);
    }
  };

  // Remove assignment
  const removeAssignment = async (assignmentId: string) => {
    setIsRemoving(assignmentId);
    try {
      const response = await fetch(`/api/job-plans/${job.id}/assign`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });

      if (response.ok) {
        await refreshJob();
      }
    } catch (error) {
      console.error("Error removing assignment:", error);
    } finally {
      setIsRemoving(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Assignments */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">
          Assigned Crew ({job.assignments.length})
        </h3>

        {job.assignments.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-6 text-center">
            <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No crew members assigned yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {job.assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-orange-600">
                      {assignment.user.name?.[0] || assignment.user.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {assignment.user.name || assignment.user.email}
                    </p>
                    {assignment.user.name && (
                      <p className="text-xs text-slate-500">{assignment.user.email}</p>
                    )}
                  </div>
                </div>

                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAssignment(assignment.id)}
                    disabled={isRemoving === assignment.id}
                    className="h-8 w-8 text-slate-400 hover:text-red-500"
                  >
                    {isRemoving === assignment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Crew Member */}
      {canEdit && (
        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Add Crew Member</h3>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-10 h-12 rounded-xl"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => assignUser(user.id)}
                  disabled={isAssigning === user.id}
                  className={cn(
                    "w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors",
                    "border-b border-slate-100 last:border-b-0"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-slate-600">
                        {user.name?.[0] || user.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900">
                        {user.name || user.email}
                      </p>
                      {user.name && (
                        <p className="text-xs text-slate-500">{user.email}</p>
                      )}
                    </div>
                  </div>

                  {isAssigning === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <UserPlus className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
            <p className="text-sm text-slate-500 mt-2">No users found matching &quot;{searchQuery}&quot;</p>
          )}
        </div>
      )}

      <p className="text-sm text-slate-500">
        Assigned crew members will receive a notification and can view this job in their dashboard.
      </p>
    </div>
  );
}
