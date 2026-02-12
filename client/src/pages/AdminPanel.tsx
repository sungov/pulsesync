import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Plus, UserCheck, Shield, Trash2, Users, Pencil, AlertTriangle, KeyRound, Copy, Check, Building2, FolderKanban } from "lucide-react";

type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  deptCode: string | null;
  projectCode: string | null;
  managerEmail: string | null;
  isApproved: boolean;
  isAdmin: boolean;
  createdAt: string | null;
};

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRole, setNewRole] = useState("EMPLOYEE");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newManagerEmail, setNewManagerEmail] = useState("");
  const [newProjectCode, setNewProjectCode] = useState("");

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("EMPLOYEE");
  const [editDeptCode, setEditDeptCode] = useState("");
  const [editProjectCode, setEditProjectCode] = useState("");
  const [editManagerEmail, setEditManagerEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const [copiedResetId, setCopiedResetId] = useState<string | null>(null);

  const { data: allUsers, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  type ResetRequest = {
    id: string;
    email: string;
    token: string;
    expiresAt: string;
    used: boolean;
    createdAt: string;
  };

  const { data: resetRequests } = useQuery<ResetRequest[]>({
    queryKey: ["/api/admin/password-resets"],
    queryFn: async () => {
      const res = await fetch("/api/admin/password-resets", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}/approve`, { method: "PATCH", credentials: "include" });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Approved", description: "User can now log in." });
    },
  });

  const adminToggleMutation = useMutation({
    mutationFn: async ({ id, isAdmin }: { id: string; isAdmin: boolean }) => {
      const res = await fetch(`/api/admin/users/${id}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle admin");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Admin Status Updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-items"] });
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      toast({ title: "User Deleted", description: "User and all associated data have been removed." });
    },
    onError: () => {
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    },
  });

  function confirmDelete(u: AdminUser) {
    setUserToDelete(u);
    setDeleteConfirmOpen(true);
  }

  const addUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setAddDialogOpen(false);
      resetAddForm();
      toast({ title: "User Created", description: "New user has been added and auto-approved." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditDialogOpen(false);
      setEditingUser(null);
      toast({ title: "User Updated", description: "User details have been saved." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function resetAddForm() {
    setNewEmail("");
    setNewPassword("");
    setNewFirstName("");
    setNewLastName("");
    setNewRole("EMPLOYEE");
    setNewDeptCode("");
    setNewProjectCode("");
    setNewManagerEmail("");
  }

  function openEditDialog(u: AdminUser) {
    setEditingUser(u);
    setEditFirstName(u.firstName || "");
    setEditLastName(u.lastName || "");
    setEditEmail(u.email || "");
    setEditRole(u.role);
    setEditDeptCode(u.deptCode || "");
    setEditProjectCode(u.projectCode || "");
    setEditManagerEmail(u.managerEmail || "");
    setEditPassword("");
    setEditDialogOpen(true);
  }

  function handleEditSave() {
    if (!editingUser) return;
    const data: any = {
      firstName: editFirstName,
      lastName: editLastName,
      email: editEmail,
      role: editRole,
      deptCode: editDeptCode,
      projectCode: editProjectCode,
      managerEmail: editManagerEmail,
    };
    if (editPassword.length > 0) {
      data.password = editPassword;
    }
    editUserMutation.mutate({ id: editingUser.id, data });
  }

  const pendingUsers = allUsers?.filter(u => !u.isApproved) || [];
  const approvedUsers = allUsers?.filter(u => u.isApproved) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-admin-title">User Management</h1>
          <p className="text-muted-foreground mt-2">Manage access, roles, and approvals</p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card data-testid="card-admin-total-users">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Total Users</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-admin-total-users">{allUsers?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-admin-employees">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Employees</span>
            </div>
            <div className="text-2xl font-bold">{allUsers?.filter(u => u.role === "EMPLOYEE").length ?? 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-admin-managers">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Managers</span>
            </div>
            <div className="text-2xl font-bold">{allUsers?.filter(u => u.role === "MANAGER").length ?? 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-admin-sr-mgmt">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Sr. Mgmt</span>
            </div>
            <div className="text-2xl font-bold">{allUsers?.filter(u => u.role === "SENIOR_MGMT").length ?? 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-admin-departments">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <FolderKanban className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Departments</span>
            </div>
            <div className="text-2xl font-bold">{new Set((allUsers ?? []).map(u => u.deptCode).filter(Boolean)).size}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-admin-pending-approval">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Pending Approval</span>
            </div>
            <div className={`text-2xl font-bold ${(allUsers?.filter(u => !u.isApproved).length ?? 0) > 0 ? "text-orange-500" : ""}`}>
              {allUsers?.filter(u => !u.isApproved).length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-end gap-4">
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user" className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>Create a new user account with role and department assignment.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input data-testid="input-admin-first-name" value={newFirstName} onChange={e => setNewFirstName(e.target.value)} placeholder="Jane" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input data-testid="input-admin-last-name" value={newLastName} onChange={e => setNewLastName(e.target.value)} placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input data-testid="input-admin-email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jane@company.com" required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input data-testid="input-admin-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger data-testid="select-admin-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="SENIOR_MGMT">Senior Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input data-testid="input-admin-dept" value={newDeptCode} onChange={e => setNewDeptCode(e.target.value)} placeholder="ENG, HR..." />
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Input data-testid="input-admin-project" value={newProjectCode} onChange={e => setNewProjectCode(e.target.value)} placeholder="Alpha, Beta..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Manager Email</Label>
                <Input data-testid="input-admin-manager-email" value={newManagerEmail} onChange={e => setNewManagerEmail(e.target.value)} placeholder="manager@company.com" />
              </div>
            </div>
            <DialogFooter>
              <Button
                data-testid="button-admin-create-user"
                onClick={() => addUserMutation.mutate({
                  email: newEmail,
                  password: newPassword,
                  firstName: newFirstName,
                  lastName: newLastName,
                  role: newRole,
                  deptCode: newDeptCode || null,
                  projectCode: newProjectCode || null,
                  managerEmail: newManagerEmail || null,
                })}
                disabled={addUserMutation.isPending || !newEmail || !newPassword}
              >
                {addUserMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details. Leave password blank to keep the current password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input data-testid="input-edit-first-name" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input data-testid="input-edit-last-name" value={editLastName} onChange={e => setEditLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input data-testid="input-edit-email" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input data-testid="input-edit-password" type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Leave blank to keep current" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger data-testid="select-edit-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="SENIOR_MGMT">Senior Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input data-testid="input-edit-dept" value={editDeptCode} onChange={e => setEditDeptCode(e.target.value)} placeholder="ENG, HR..." />
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Input data-testid="input-edit-project" value={editProjectCode} onChange={e => setEditProjectCode(e.target.value)} placeholder="Alpha, Beta..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Manager Email</Label>
              <Input data-testid="input-edit-manager-email" value={editManagerEmail} onChange={e => setEditManagerEmail(e.target.value)} placeholder="manager@company.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button
              data-testid="button-edit-save"
              onClick={handleEditSave}
              disabled={editUserMutation.isPending || !editEmail}
            >
              {editUserMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pendingUsers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-orange-500" />
            Pending Approvals ({pendingUsers.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingUsers.map(u => (
              <Card key={u.id} className="border-orange-200 dark:border-orange-800/50 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar>
                      <AvatarFallback className="bg-orange-100 text-orange-600">
                        {(u.firstName?.[0] || "?")}{(u.lastName?.[0] || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate" data-testid={`text-pending-name-${u.id}`}>
                        {u.firstName || ""} {u.lastName || ""}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" data-testid={`button-approve-${u.id}`} onClick={() => approveMutation.mutate(u.id)} disabled={approveMutation.isPending}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" data-testid={`button-reject-${u.id}`} onClick={() => confirmDelete(u)} className="text-destructive">
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {resetRequests && resetRequests.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-500" />
            Pending Password Resets ({resetRequests.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resetRequests.map(r => {
              const reqUser = allUsers?.find(u => u.email === r.email);
              const resetLink = `${window.location.origin}/reset-password?token=${r.token}`;
              const isCopied = copiedResetId === r.id;
              return (
                <Card key={r.id} className="border-amber-200 dark:border-amber-800/50 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar>
                        <AvatarFallback className="bg-amber-100 text-amber-600">
                          {(reqUser?.firstName?.[0] || "?")}{(reqUser?.lastName?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate" data-testid={`text-reset-name-${r.id}`}>
                          {reqUser ? `${reqUser.firstName || ""} ${reqUser.lastName || ""}` : "Unknown User"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{r.email}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Expires: {new Date(r.expiresAt).toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-copy-reset-${r.id}`}
                      className="w-full"
                      onClick={() => {
                        navigator.clipboard.writeText(resetLink);
                        setCopiedResetId(r.id);
                        toast({ title: "Link Copied", description: "Password reset link copied to clipboard." });
                        setTimeout(() => setCopiedResetId(null), 2000);
                      }}
                    >
                      {isCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      {isCopied ? "Copied" : "Copy Reset Link"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          All Users ({approvedUsers.length})
        </h2>
        <div className="bg-card border border-border rounded-md overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dept</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Project</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Manager</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Admin</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {approvedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-user-${u.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {(u.firstName?.[0] || "?")}{(u.lastName?.[0] || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate text-foreground">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.deptCode || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.projectCode || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[140px]">{u.managerEmail || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">{u.role === "SENIOR_MGMT" ? "Sr. Mgmt" : u.role === "MANAGER" ? "Manager" : "Employee"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={u.isAdmin ? "default" : "outline"}
                        className={`cursor-pointer ${u.id === user?.id ? "opacity-50 cursor-not-allowed" : ""}`}
                        data-testid={`badge-admin-${u.id}`}
                        onClick={() => {
                          if (u.id !== user?.id) {
                            adminToggleMutation.mutate({ id: u.id, isAdmin: !u.isAdmin });
                          }
                        }}
                      >
                        {u.isAdmin ? (<><Shield className="w-3 h-3 mr-1" /> Admin</>) : "User"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-edit-${u.id}`}
                          onClick={() => openEditDialog(u)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {u.id !== user?.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-delete-${u.id}`}
                            onClick={() => confirmDelete(u)}
                            className="text-muted-foreground"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete User Permanently
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                You are about to permanently delete <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong> ({userToDelete?.email}).
              </span>
              <span className="block font-medium text-destructive">
                This will also permanently delete all associated data including:
              </span>
              <span className="block text-sm">
                - All feedback submissions by this user<br />
                - All manager reviews on their feedback<br />
                - All action items assigned to or created by this user
              </span>
              <span className="block font-medium mt-2">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-delete-confirm"
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (userToDelete) {
                  deleteMutation.mutate(userToDelete.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete User & All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
