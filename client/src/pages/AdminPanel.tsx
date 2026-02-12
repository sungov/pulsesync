import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, UserCheck, Shield, Trash2, Users } from "lucide-react";

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
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRole, setNewRole] = useState("EMPLOYEE");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newManagerEmail, setNewManagerEmail] = useState("");
  const [newProjectCode, setNewProjectCode] = useState("");

  const { data: allUsers, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}/approve`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Approved", description: "User can now log in." });
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role Updated" });
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
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Deleted" });
    },
  });

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
      setNewEmail("");
      setNewPassword("");
      setNewFirstName("");
      setNewLastName("");
      setNewRole("EMPLOYEE");
      setNewDeptCode("");
      setNewProjectCode("");
      setNewManagerEmail("");
      toast({ title: "User Created", description: "New user has been added and auto-approved." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user" className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
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
                  <SelectTrigger data-testid="select-admin-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="SENIOR_MGMT">Senior Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department Code</Label>
                <Input data-testid="input-admin-dept" value={newDeptCode} onChange={e => setNewDeptCode(e.target.value)} placeholder="ENG, HR, SALES..." />
              </div>
              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Input data-testid="input-admin-project" value={newProjectCode} onChange={e => setNewProjectCode(e.target.value)} placeholder="Project Alpha, Internal Tools..." />
              </div>
              <div className="space-y-2">
                <Label>Manager Email (optional)</Label>
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
      </header>

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
                    <Button
                      size="sm"
                      data-testid={`button-approve-${u.id}`}
                      onClick={() => approveMutation.mutate(u.id)}
                      disabled={approveMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-reject-${u.id}`}
                      onClick={() => deleteMutation.mutate(u.id)}
                      className="text-destructive"
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          All Users ({approvedUsers.length})
        </h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Department</th>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Project</th>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Admin</th>
                  <th className="px-6 py-4 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {approvedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-user-${u.id}`}>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4 text-muted-foreground">{u.deptCode || "-"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{u.projectCode || "-"}</td>
                    <td className="px-6 py-4">
                      <Select
                        value={u.role}
                        onValueChange={(role) => roleMutation.mutate({ id: u.id, role })}
                      >
                        <SelectTrigger className="w-[140px]" data-testid={`select-role-${u.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMPLOYEE">Employee</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="SENIOR_MGMT">Senior Mgmt</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4">
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
                        {u.isAdmin ? (
                          <><Shield className="w-3 h-3 mr-1" /> Admin</>
                        ) : (
                          "User"
                        )}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.id !== user?.id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-delete-${u.id}`}
                          onClick={() => deleteMutation.mutate(u.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
