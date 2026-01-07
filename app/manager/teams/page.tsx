"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TablePageSkeleton, PageContent } from "@/components/layout/page-skeleton";
import { 
  Users, 
  UserCircle,
  Mail,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
  createdAt: string;
  members: User[];
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  _count: {
    members: number;
    reports: number;
  };
}

export default function ManagerTeamsPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const response = await fetch("/api/teams");
      if (response.ok) {
        const data = await response.json();
        // Manager's API returns only their team
        setTeam(data[0] || null);
      } else {
        const err = await response.json();
        setError(err.error || "Failed to load team");
      }
    } catch (err) {
      console.error("Error fetching team:", err);
      setError("Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <TablePageSkeleton />;
  }

  if (error || !team) {
    return (
      <PageContent>
        <div className="space-y-6">
          <PageHeader 
            title="My Team" 
            description="View your team members"
          />
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No Team Assigned</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {error || "You have not been assigned to a team yet. Please contact an administrator."}
              </p>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    );
  }

  const managers = team.members.filter((m) => m.role === "MANAGER");
  const fieldWorkers = team.members.filter((m) => m.role === "FIELD");

  return (
    <PageContent>
      <div className="space-y-6">
        <PageHeader 
          title="My Team" 
          description="View your team members and their roles"
        />

        {/* Team Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>
                  {team._count.members} member{team._count.members !== 1 ? "s" : ""} • {team._count.reports} reports
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Managers */}
        {managers.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Managers
              </CardTitle>
              <CardDescription>
                Team managers who can create reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {managers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50/50 border-blue-100"
                  >
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-700">
                        {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {member.name || "Unnamed"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      Manager
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Field Workers */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5" />
              Field Workers
            </CardTitle>
            <CardDescription>
              Team members who log daily equipment usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fieldWorkers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No field workers assigned to this team yet.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fieldWorkers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-green-700">
                        {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {member.name || "Unnamed"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}
