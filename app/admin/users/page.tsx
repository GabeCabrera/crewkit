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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, Users, Users2, X, Shield, Briefcase, HardHat } from "lucide-react";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  teamId: string | null;
  team: Team | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
    role: "FIELD",
    teamId: "",
  });
  const [formError, setFormError] = useState("");
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: "FIELD",
    teamId: "",
  });

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams");
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (formData.password !== formData.confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          role: formData.role,
          teamId: formData.teamId || null,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setFormData({ email: "", name: "", password: "", confirmPassword: "", role: "FIELD", teamId: "" });
        fetchUsers();
      } else {
        const data = await response.json();
        setFormError(data.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      setFormError("An error occurred");
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email,
      name: user.name || "",
      password: "",
      role: user.role,
      teamId: user.teamId || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updateData: any = {
        email: editFormData.email,
        name: editFormData.name,
        role: editFormData.role,
        teamId: editFormData.teamId || null,
      };

      if (editFormData.password) {
        updateData.password = editFormData.password;
      }

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setEditingUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchValue === "" ||
      user.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
      user.email.toLowerCase().includes(searchValue.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesTeam =
      teamFilter === "all" ||
      (teamFilter === "none" && !user.teamId) ||
      user.teamId === teamFilter;
    return matchesSearch && matchesRole && matchesTeam;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN": return Shield;
      case "MANAGER": return Briefcase;
      case "FIELD": return HardHat;
      default: return Users;
    }
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-orange-50 text-orange-700 border-orange-200";
      case "MANAGER": return "bg-slate-50 text-slate-700 border-slate-200";
      case "FIELD": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Users</h1>
                <p className="text-slate-500 text-sm sm:text-base">Manage user accounts</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 rounded-xl h-11" onClick={() => {
                  setFormData({ email: "", name: "", password: "", confirmPassword: "", role: "FIELD", teamId: "" });
                  setFormError("");
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Add User</DialogTitle>
                    <DialogDescription>Create a new user account</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {formError && (
                      <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</div>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="h-11 rounded-xl" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-11 rounded-xl" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required className="h-11 rounded-xl" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required className="h-11 rounded-xl" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="FIELD">Field</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="team">Team</Label>
                      <Select value={formData.teamId} onValueChange={(value) => setFormData({ ...formData, teamId: value })}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="No team assigned" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No team</SelectItem>
                          {teams.map((team) => (<SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
                    <Button type="submit" className="bg-slate-900 hover:bg-slate-800 rounded-xl">Create User</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-6xl mx-auto space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search users..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="pl-10 h-12 bg-white border-slate-200 rounded-xl" />
            {searchValue && (
              <button onClick={() => setSearchValue("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px] h-12 rounded-xl"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="MANAGER">Manager</SelectItem>
              <SelectItem value="FIELD">Field</SelectItem>
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[160px] h-12 rounded-xl"><SelectValue placeholder="All Teams" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="none">No Team</SelectItem>
              {teams.map((team) => (<SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="h-4 w-4" />
          <span>{filteredUsers.length} of {users.length} users</span>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                    <div className="h-3 w-48 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No users found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const RoleIcon = getRoleIcon(user.role);
              return (
                <div key={user.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", getRoleStyle(user.role))}>
                      <RoleIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">{user.name || "—"}</h3>
                        <Badge variant="outline" className={cn("text-xs", getRoleStyle(user.role))}>{user.role}</Badge>
                      </div>
                      <p className="text-sm text-slate-500 truncate">{user.email}</p>
                      {user.team && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                          <Users2 className="h-3 w-3" />
                          {user.team.name}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditDialog(user)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <Edit className="h-4 w-4 text-slate-500" />
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="rounded-2xl">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>Update user information</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="editEmail">Email</Label>
                  <Input id="editEmail" type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} required className="h-11 rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editName">Name</Label>
                  <Input id="editName" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="h-11 rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editPassword">New Password (leave blank to keep current)</Label>
                  <Input id="editPassword" type="password" value={editFormData.password} onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })} placeholder="••••••••" className="h-11 rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editRole">Role</Label>
                  <Select value={editFormData.role} onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="FIELD">Field</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editTeam">Team</Label>
                  <Select value={editFormData.teamId} onValueChange={(value) => setEditFormData({ ...editFormData, teamId: value })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="No team assigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No team</SelectItem>
                      {teams.map((team) => (<SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 rounded-xl">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
