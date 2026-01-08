"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContent } from "@/components/layout/page-skeleton";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  Users2, 
  X, 
  Shield, 
  Briefcase, 
  HardHat,
  UserPlus,
  Check,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================
interface Team {
  id: string;
  name: string;
  createdAt: string;
  members: User[];
  creator: { id: string; name: string | null; email: string };
  _count: { members: number; reports: number };
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  teamId: string | null;
  team: { id: string; name: string } | null;
}

// ==================== MAIN COMPONENT ====================
export default function TeamManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "teams";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/admin/team-management?tab=${value}`, { scroll: false });
  };

  return (
    <PageContent>
      <div className="space-y-6">
        <PageHeader 
          title="Team Management" 
          description="Manage teams and user accounts"
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="teams" className="gap-2">
              <Users2 className="h-4 w-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="space-y-6">
            <TeamsTab />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageContent>
  );
}

// ==================== TEAMS TAB ====================
function TeamsTab() {
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

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreating(true);
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName }),
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

  const handleUpdateTeam = async () => {
    if (!editingTeam || !editTeamName.trim()) return;
    try {
      const response = await fetch(`/api/teams/${editingTeam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editTeamName }),
      });
      if (response.ok) {
        setEditDialogOpen(false);
        setEditingTeam(null);
        fetchTeams();
      }
    } catch (error) {
      console.error("Error updating team:", error);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return;
    try {
      const response = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
      if (response.ok) fetchTeams();
    } catch (error) {
      console.error("Error deleting team:", error);
    }
  };

  const openMembersDialog = (team: Team) => {
    setManagingTeam(team);
    setSelectedMembers(team.members.map(m => m.id));
    setMembersDialogOpen(true);
  };

  const handleUpdateMembers = async () => {
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

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const availableUsers = allUsers.filter(user =>
    user.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  if (loading) return <div className="animate-pulse h-64 bg-muted rounded-lg" />;

  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Users2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Teams</p>
                <p className="text-2xl font-bold">{teams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{teams.reduce((acc, t) => acc + t._count.members, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reports Filed</p>
                <p className="text-2xl font-bold">{teams.reduce((acc, t) => acc + t._count.reports, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Create */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search teams..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Team</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Team</DialogTitle>
              <DialogDescription>Add a new team to organize your workers.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input placeholder="e.g., West Mountain Crew" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTeam} disabled={creating || !newTeamName.trim()}>{creating ? "Creating..." : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Teams Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTeams.map((team) => (
          <Card key={team.id} className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <CardDescription>{team._count.members} members</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTeam(team); setEditTeamName(team.name); setEditDialogOpen(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTeam(team.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 mb-3">
                {team.members.slice(0, 4).map((member) => (
                  <Badge key={member.id} variant="secondary" className="text-xs">
                    {member.name || member.email.split("@")[0]}
                  </Badge>
                ))}
                {team.members.length > 4 && (
                  <Badge variant="outline" className="text-xs">+{team.members.length - 4} more</Badge>
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => openMembersDialog(team)}>
                <UserPlus className="mr-2 h-4 w-4" />Manage Members
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Team Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Team Name</Label>
              <Input value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTeam}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Members - {managingTeam?.name}</DialogTitle>
            <DialogDescription>Select users to add to this team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input placeholder="Search users..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {availableUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedMembers(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])}
                  className={cn("flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors", selectedMembers.includes(user.id) ? "bg-primary/10 border-2 border-primary" : "bg-muted/50 hover:bg-muted")}
                >
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", selectedMembers.includes(user.id) ? "bg-primary text-white" : "bg-muted-foreground/20")}>
                    {selectedMembers.includes(user.id) ? <Check className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{user.name || user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant={user.role === "ADMIN" ? "default" : user.role === "MANAGER" ? "secondary" : "outline"}>{user.role}</Badge>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateMembers}>Save Members ({selectedMembers.length})</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==================== USERS TAB ====================
function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ email: "", name: "", password: "", confirmPassword: "", role: "FIELD", teamId: "" });
  const [formError, setFormError] = useState("");
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({ email: "", name: "", password: "", role: "FIELD", teamId: "" });

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) setUsers(await response.json());
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams");
      if (response.ok) setTeams(await response.json());
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const handleCreateUser = async () => {
    setFormError("");
    if (!formData.email || !formData.password) { setFormError("Email and password are required"); return; }
    if (formData.password !== formData.confirmPassword) { setFormError("Passwords do not match"); return; }
    if (formData.password.length < 6) { setFormError("Password must be at least 6 characters"); return; }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, name: formData.name || null, password: formData.password, role: formData.role, teamId: formData.teamId || null }),
      });
      if (response.ok) {
        setDialogOpen(false);
        setFormData({ email: "", name: "", password: "", confirmPassword: "", role: "FIELD", teamId: "" });
        fetchUsers();
      } else {
        const data = await response.json();
        setFormError(data.error || "Failed to create user");
      }
    } catch { setFormError("Failed to create user"); }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const updateData: Record<string, string | null> = { email: editFormData.email, name: editFormData.name || null, role: editFormData.role, teamId: editFormData.teamId || null };
      if (editFormData.password) updateData.password = editFormData.password;

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
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
      if (response.ok) fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditFormData({ email: user.email, name: user.name || "", password: "", role: user.role, teamId: user.teamId || "" });
    setEditDialogOpen(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "SUPERUSER": return <Shield className="h-4 w-4" />;
      case "ADMIN": return <Shield className="h-4 w-4" />;
      case "MANAGER": return <Briefcase className="h-4 w-4" />;
      default: return <HardHat className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (role) {
      case "SUPERUSER": return "destructive";
      case "ADMIN": return "default";
      case "MANAGER": return "secondary";
      default: return "outline";
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchValue.toLowerCase()) || user.email.toLowerCase().includes(searchValue.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesTeam = teamFilter === "all" || (teamFilter === "none" ? !user.teamId : user.teamId === teamFilter);
    return matchesSearch && matchesRole && matchesTeam;
  });

  if (loading) return <div className="animate-pulse h-64 bg-muted rounded-lg" />;

  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center"><Users className="h-5 w-5 text-orange-600" /></div>
              <div><p className="text-sm text-muted-foreground">Total Users</p><p className="text-2xl font-bold">{users.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center"><Shield className="h-5 w-5 text-red-600" /></div>
              <div><p className="text-sm text-muted-foreground">Admins</p><p className="text-2xl font-bold">{users.filter(u => u.role === "ADMIN").length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"><Briefcase className="h-5 w-5 text-amber-600" /></div>
              <div><p className="text-sm text-muted-foreground">Managers</p><p className="text-2xl font-bold">{users.filter(u => u.role === "MANAGER").length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center"><HardHat className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-sm text-muted-foreground">Field Workers</p><p className="text-2xl font-bold">{users.filter(u => u.role === "FIELD").length}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="SUPERUSER">Superuser</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="FIELD">Field</SelectItem>
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Team" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            <SelectItem value="none">No Team</SelectItem>
            {teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add User</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>Add a new user to the system.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Name</Label><Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Password *</Label><Input type="password" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Confirm</Label><Input type="password" value={formData.confirmPassword} onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPERUSER">Superuser</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="FIELD">Field</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select value={formData.teamId || "__none__"} onValueChange={(v) => setFormData(prev => ({ ...prev, teamId: v === "__none__" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateUser}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Team</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-medium">
                          {(user.name || user.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user.name || "—"}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={getRoleBadgeVariant(user.role)} className="gap-1">
                        {getRoleIcon(user.role)}
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {user.team ? <Badge variant="outline">{user.team.name}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteUser(user.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={editFormData.email} onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Name</Label><Input value={editFormData.name} onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>New Password (leave blank to keep)</Label><Input type="password" value={editFormData.password} onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editFormData.role} onValueChange={(v) => setEditFormData(prev => ({ ...prev, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPERUSER">Superuser</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="FIELD">Field</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={editFormData.teamId || "__none__"} onValueChange={(v) => setEditFormData(prev => ({ ...prev, teamId: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

