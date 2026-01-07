"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Users, 
  Edit, 
  Trash2, 
  UserPlus,
  Search,
  FileText,
  Check,
  Users2,
  X,
} from "lucide-react";
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

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [managingTeam, setManagingTeam] = useState<Team | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams");
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });

      if (response.ok) {
        setCreateDialogOpen(false);
        setNewTeamName("");
        fetchTeams();
      }
    } catch (error) {
      console.error("Error creating team:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !editTeamName.trim()) return;

    try {
      const response = await fetch(`/api/teams/${editingTeam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editTeamName.trim() }),
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setEditingTeam(null);
        setEditTeamName("");
        fetchTeams();
      }
    } catch (error) {
      console.error("Error updating team:", error);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team? Members will be unassigned.")) return;

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTeams();
        fetchUsers();
      }
    } catch (error) {
      console.error("Error deleting team:", error);
    }
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditDialogOpen(true);
  };

  const openMembersDialog = (team: Team) => {
    setManagingTeam(team);
    setSelectedMembers(team.members.map((m) => m.id));
    setMemberSearch("");
    setMembersDialogOpen(true);
  };

  const handleSaveMembers = async () => {
    if (!managingTeam) return;

    try {
      const response = await fetch(`/api/teams/${managingTeam.id}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: selectedMembers }),
      });

      if (response.ok) {
        setMembersDialogOpen(false);
        setManagingTeam(null);
        fetchTeams();
        fetchUsers();
      }
    } catch (error) {
      console.error("Error updating members:", error);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const availableUsers = allUsers
    .filter((user) => user.role !== "ADMIN")
    .filter((user) =>
      memberSearch === "" ||
      user.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(memberSearch.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Users2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Teams</h1>
                <p className="text-slate-500 text-sm sm:text-base">Manage teams and assignments</p>
              </div>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 rounded-xl h-11">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Team
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <form onSubmit={handleCreateTeam}>
                  <DialogHeader>
                    <DialogTitle>Create Team</DialogTitle>
                    <DialogDescription>
                      Create a new team to organize field workers and managers.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="teamName">Team Name</Label>
                    <Input
                      id="teamName"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="e.g., North District Crew"
                      className="mt-2 h-11 rounded-xl"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} className="rounded-xl">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                      {creating ? "Creating..." : "Create Team"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-6xl mx-auto space-y-6">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search teams..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10 h-12 bg-white border-slate-200 rounded-xl"
          />
          {searchValue && (
            <button
              onClick={() => setSearchValue("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="h-6 w-32 bg-slate-100 rounded" />
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-slate-100 rounded" />
                    <div className="h-8 w-8 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-4 w-24 bg-slate-100 rounded mb-4" />
                <div className="flex gap-2 mb-4">
                  <div className="h-6 w-16 bg-slate-100 rounded-full" />
                  <div className="h-6 w-20 bg-slate-100 rounded-full" />
                </div>
                <div className="h-10 w-full bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No teams yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Create your first team to start organizing field workers.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map((team) => (
              <div key={team.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{team.name}</h3>
                    <p className="text-sm text-slate-500">
                      Created by {team.creator.name || team.creator.email}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditDialog(team)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 text-sm text-slate-500 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{team._count.members} members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    <span>{team._count.reports} reports</span>
                  </div>
                </div>

                {team.members.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {team.members.slice(0, 4).map((member) => (
                      <Badge
                        key={member.id}
                        variant="secondary"
                        className={cn(
                          "text-xs bg-slate-100 text-slate-600",
                          member.role === "MANAGER" && "bg-blue-50 text-blue-700"
                        )}
                      >
                        {member.name || member.email.split("@")[0]}
                      </Badge>
                    ))}
                    {team.members.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{team.members.length - 4}
                      </Badge>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full rounded-xl h-10"
                  onClick={() => openMembersDialog(team)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Manage Members
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Edit Team Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="rounded-2xl">
            <form onSubmit={handleEditTeam}>
              <DialogHeader>
                <DialogTitle>Edit Team</DialogTitle>
                <DialogDescription>Update the team name.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="editTeamName">Team Name</Label>
                <Input
                  id="editTeamName"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="mt-2 h-11 rounded-xl"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 rounded-xl">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Manage Members Dialog */}
        <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle>Manage Team Members</DialogTitle>
              <DialogDescription>
                Select users to add to {managingTeam?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search users..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9 h-11 rounded-xl"
                />
              </div>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {availableUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No users found
                  </div>
                ) : (
                  availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors",
                        selectedMembers.includes(user.id) && "bg-blue-50"
                      )}
                      onClick={() => toggleMember(user.id)}
                    >
                      <div>
                        <p className="font-medium text-sm text-slate-900">
                          {user.name || user.email}
                        </p>
                        <p className="text-xs text-slate-500">
                          {user.email} • {user.role}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                          selectedMembers.includes(user.id)
                            ? "bg-slate-900 border-slate-900"
                            : "border-slate-300"
                        )}
                      >
                        {selectedMembers.includes(user.id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <p className="text-sm text-slate-500">
                {selectedMembers.length} user{selectedMembers.length !== 1 ? "s" : ""} selected
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMembersDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleSaveMembers} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                Save Members
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
