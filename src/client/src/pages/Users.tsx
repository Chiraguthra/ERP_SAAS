import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authFetch } from "@/lib/authFetch";
import { Loader2, UserCog, Plus, Edit, Trash2, KeyRound } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";

type User = { id: number; username: string; name: string; role: string };
type UserForm = { username: string; name: string; password: string; role: string };

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "logistics", label: "Logistics" },
  { value: "accountant", label: "Accountant" },
  { value: "sales", label: "Sales" },
];

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const form = useForm<UserForm>({
    defaultValues: { username: "", name: "", password: "", role: "staff" },
  });

  const query = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const r = await authFetch("/api/users");
      if (!r.ok) throw new Error("Failed to load users");
      const j = await r.json();
      return Array.isArray(j) ? (j as User[]) : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      const r = await authFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail ?? "Failed to create user");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "User created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserForm> }) => {
      const payload: Record<string, unknown> = {};
      if (data.name) payload.name = data.name;
      if (data.role) payload.role = data.role;
      if (data.password && data.password.trim()) payload.password = data.password;
      const r = await authFetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail ?? "Failed to update user");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
      toast({ title: "Success", description: "User updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await authFetch(`/api/users/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail ?? "Failed to delete user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Deleted", description: "User removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const r = await authFetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail ?? "Failed to update password");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsPasswordDialogOpen(false);
      setPasswordUser(null);
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Success", description: "Password updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    form.reset({ username: user.username, name: user.name, password: "", role: user.role });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this user?")) return;
    deleteMutation.mutate(id);
  };

  const handleOpenPasswordDialog = (user: User) => {
    setPasswordUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setIsPasswordDialogOpen(true);
  };

  const handleChangePassword = () => {
    if (!passwordUser) return;
    if (!newPassword.trim()) {
      toast({ title: "Error", description: "New password is required", variant: "destructive" });
      return;
    }
    if (newPassword.trim().length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ id: passwordUser.id, password: newPassword });
  };

  const onSubmit = (data: UserForm) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      if (!data.password || !data.password.trim()) {
        toast({ title: "Error", description: "Password is required for new user", variant: "destructive" });
        return;
      }
      createMutation.mutate(data);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold">User Management</h2>
            <p className="text-muted-foreground">Admin: list and manage users (RBAC)</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingId(null); form.reset(); } }}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit User" : "Add New User"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username *</label>
                  <Input {...form.register("username", { required: true })} placeholder="Username" disabled={!!editingId} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <Input {...form.register("name", { required: true })} placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{editingId ? "Password (leave blank to keep)" : "Password *"}</label>
                  <Input type="password" {...form.register("password")} placeholder="Password" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role *</label>
                  <Controller
                    name="role"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingId ? "Save Changes" : "Add User"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {query.isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!query.isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Username</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-right p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(query.data ?? []).map((u) => (
                      <tr key={u.id} className="border-b">
                        <td className="p-2">{u.id}</td>
                        <td className="p-2">{u.username}</td>
                        <td className="p-2">{u.name}</td>
                        <td className="p-2 capitalize">{u.role}</td>
                        <td className="p-2 text-right space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenPasswordDialog(u)} title="Change password">
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} disabled={deleteMutation.isPending}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
          setIsPasswordDialogOpen(open);
          if (!open) {
            setPasswordUser(null);
            setNewPassword("");
            setConfirmPassword("");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Change Password{passwordUser ? ` - ${passwordUser.username}` : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password *</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password *</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
