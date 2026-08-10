"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast, ToastContainer } from "@/components/Toast";
import { useTheme } from "next-themes";

type Role = {
  roleId: number;
  roleName: string;
  description: string | null;
  permissionIds: number[];
};

type Permission = {
  permissionId: number;
  permissionName: string;
  moduleName: string;
  actionName: string;
  description: string | null;
};

type UserRow = {
  userId: number;
  username: string;
  email: string;
  status: "Active" | "Inactive";
  roleId: number;
  roleName: string;
  createdAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  error?: string;
  data: T;
};

type AdminSecurityPanelProps = {
  theme: "dark" | "light";
};

type RoleFormState = {
  roleName: string;
  description: string;
};

type UserFormState = {
  username: string;
  email: string;
  password: string;
  roleId: string;
};

export default function AdminSecurityPanel({ theme }: AdminSecurityPanelProps) {
  const { theme: nextTheme } = useTheme();
  const isDark = nextTheme !== "light";
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toasts, success: toastSuccess, error: toastError, dismiss } = useToast();
  const [roleForm, setRoleForm] = useState<RoleFormState>({ roleName: "", description: "" });
  const [userForm, setUserForm] = useState<UserFormState>({
    username: "",
    email: "",
    password: "",
    roleId: "",
  });
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [roleEditForm, setRoleEditForm] = useState<RoleFormState | null>(null);
  const [userEditForm, setUserEditForm] = useState<{ email: string; status: "Active" | "Inactive"; roleId: string; password: string } | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [savingRolePermissions, setSavingRolePermissions] = useState(false);


  const loadAll = async () => {
    setLoading(true);
    setError("");

    try {
      const [rolesRes, permissionsRes, usersRes] = await Promise.all([
        fetch("/api/admin/security/roles", { method: "GET", cache: "no-store" }),
        fetch("/api/admin/security/permissions", { method: "GET", cache: "no-store" }),
        fetch("/api/admin/security/users", { method: "GET", cache: "no-store" }),
      ]);

      const rolesData: ApiResponse<Role[]> = await rolesRes.json();
      const permissionsData: ApiResponse<Permission[]> = await permissionsRes.json();
      const usersData: ApiResponse<UserRow[]> = await usersRes.json();

      if (!rolesRes.ok || !rolesData.success) {
        setError(rolesData.error ?? "Failed to load roles.");
        return;
      }
      if (!permissionsRes.ok || !permissionsData.success) {
        setError(permissionsData.error ?? "Failed to load permissions.");
        return;
      }
      if (!usersRes.ok || !usersData.success) {
        setError(usersData.error ?? "Failed to load users.");
        return;
      }

      setRoles(rolesData.data);
      setPermissions(permissionsData.data);
      setUsers(usersData.data);
    } catch {
      setError("Failed to load security data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const createRole = async (event: React.FormEvent) => {
    event.preventDefault();

    const roleName = roleForm.roleName.trim();
    if (!roleName) {
      setError("Role name is required.");
      return;
    }

    try {
      const response = await fetch("/api/admin/security/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleName, description: roleForm.description.trim() || null }),
      });

      const result: ApiResponse<{ roleId: number }> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Failed to create role.");
        return;
      }

      toastSuccess(`✓ Role "${roleName}" created!`);
      setRoleForm({ roleName: "", description: "" });
      await loadAll();
    } catch {
      toastError("Failed to create role.");
    }
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();

    const username = userForm.username.trim();
    const email = userForm.email.trim();
    const password = userForm.password.trim();
    const roleId = Number(userForm.roleId);

    if (!username || !email || !password || !Number.isInteger(roleId) || roleId <= 0) {
      toastError("Username, email, password, and role are required.");
      return;
    }

    try {
      const response = await fetch("/api/admin/security/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, roleId }),
      });

      const result: ApiResponse<{ userId: number }> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Failed to create user.");
        return;
      }

      setUserForm({ username: "", email: "", password: "", roleId: "" });
      toastSuccess(`✓ User "${username}" created!`);
      await loadAll();
    } catch {
      toastError("Failed to create user.");
    }
  };

  const openRoleEdit = (role: Role) => {
    setEditingRole(role);
    setRoleEditForm({ roleName: role.roleName, description: role.description ?? "" });
    setSelectedPermissions(role.permissionIds);
  };

  const closeRoleEdit = () => {
    setEditingRole(null);
    setRoleEditForm(null);
    setSelectedPermissions([]);
    setSavingRolePermissions(false);
  };

  const saveRoleEdit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingRole || !roleEditForm) {
      return;
    }

    const roleName = roleEditForm.roleName.trim();
    if (!roleName) {
      toastError("Role name is required.");
      return;
    }

    try {
      const response = await fetch(`/api/admin/security/roles/${editingRole.roleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleName, description: roleEditForm.description.trim() || null }),
      });

      const result: ApiResponse<unknown> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Failed to update role.");
        return;
      }

      closeRoleEdit();
      toastSuccess("✓ Role updated successfully.");
      await loadAll();
    } catch {
      toastError("Failed to update role.");
    }
  };

  const saveRolePermissions = async () => {
    if (!editingRole) {
      return;
    }

    setSavingRolePermissions(true);

    try {
      const response = await fetch(`/api/admin/security/roles/${editingRole.roleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: selectedPermissions }),
      });

      const result: ApiResponse<unknown> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Failed to update permissions.");
        return;
      }

      toastSuccess("✓ Permissions updated successfully.");
      await loadAll();
    } catch {
      toastError("Failed to update permissions.");
    } finally {
      setSavingRolePermissions(false);
    }
  };

  const deleteRole = async (roleId: number, roleName: string) => {
    const confirmDelete = window.confirm(`Delete role ${roleName}? This cannot be undone.`);
    if (!confirmDelete) {
      return;
    }


    try {
      const response = await fetch(`/api/admin/security/roles/${roleId}`, { method: "DELETE" });
      const result: ApiResponse<unknown> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Delete failed.");
        return;
      }

      toastSuccess(`✓ Role "${roleName}" deleted.`);
      await loadAll();
    } catch {
      toastError("Delete failed.");
    }
  };

  const openUserEdit = (user: UserRow) => {
    setEditingUser(user);
    setUserEditForm({
      email: user.email,
      status: user.status,
      roleId: String(user.roleId),
      password: "",
    });
    setConfirmPassword("");
    setResetPasswordValue("");
  };

  const closeUserEdit = () => {
    setEditingUser(null);
    setUserEditForm(null);
    setConfirmPassword("");
    setResetPasswordValue("");
  };

  const saveUserEdit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingUser || !userEditForm) {
      return;
    }

    const email = userEditForm.email.trim();
    const roleId = Number(userEditForm.roleId);
    const password = userEditForm.password.trim();
    const confirm = confirmPassword.trim();

    if (!email || !Number.isInteger(roleId) || roleId <= 0) {
      toastError("Email and role are required.");
      return;
    }

    if (password && password !== confirm) {
      toastError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`/api/admin/security/users/${editingUser.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          status: userEditForm.status,
          roleId,
          password: password || null,
        }),
      });

      const result: ApiResponse<unknown> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Failed to update user.");
        return;
      }

      closeUserEdit();
      toastSuccess("✓ User updated successfully.");
      await loadAll();
    } catch {
      toastError("Failed to update user.");
    }
  };

  const resetUserPassword = async () => {
    if (!editingUser) {
      return;
    }

    setError("");
    setResetPasswordValue("");

    try {
      const response = await fetch(`/api/admin/security/users/${editingUser.userId}/reset-password`, {
        method: "POST",
      });
      const result: ApiResponse<{ temporaryPassword: string }> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Failed to reset password.");
        return;
      }

      setResetPasswordValue(result.data.temporaryPassword);
      toastSuccess("✓ Password reset successfully.");
    } catch {
      toastError("Failed to reset password.");
    }
  };

  const deleteUser = async (userId: number, username: string) => {
    const confirmDelete = window.confirm(`Delete user ${username}? This cannot be undone.`);
    if (!confirmDelete) {
      return;
    }
    // no-op: intentional  (kept for structural consistency)

    try {
      const response = await fetch(`/api/admin/security/users/${userId}`, { method: "DELETE" });
      const result: ApiResponse<unknown> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Delete failed.");
        return;
      }

      toastSuccess(`✓ User "${username}" deleted.`);
      await loadAll();
    } catch {
      toastError("Delete failed.");
    }
  };

  const permissionGroups = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      if (!grouped[perm.moduleName]) {
        grouped[perm.moduleName] = [];
      }
      grouped[perm.moduleName].push(perm);
    });
    return grouped;
  }, [permissions]);

  const roleCount = roles.length;
  const userCount = users.length;

  return (
    <section className="mt-8 glass-panel rounded-2xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className={`text-lg font-semibold ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "text-[#0F172A]"}`}>Security Management</h2>
        <span className={`rounded-full border px-3 py-1 text-xs ${isDark ? "border-white/10 bg-[#0d232b] text-[#8ed7cf]" : "border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]"}`}>
          {roleCount} roles, {userCount} users
        </span>
      </div>

      {error ? (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h3 className={`mb-4 text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#B6FF00]" : "text-[#10B981]"}`}>Roles</h3>
          <form onSubmit={createRole} className="mb-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <input
              type="text"
              placeholder="Role Name"
              value={roleForm.roleName}
              onChange={(event) => setRoleForm((prev) => ({ ...prev, roleName: event.target.value }))}
              className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
            />
            <input
              type="text"
              placeholder="Description"
              value={roleForm.description}
              onChange={(event) => setRoleForm((prev) => ({ ...prev, description: event.target.value }))}
              className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
            />
            <button
              type="submit"
              className="glass-button rounded-xl px-4 py-3 text-sm font-semibold tracking-wide"
            >
              Add Role
            </button>
          </form>

          <div className={`overflow-x-auto rounded-xl border ${isDark ? "border-white/10 bg-white/5" : "border-[#E2E8F0] bg-[#FFFFFF]"}`}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={`border-b ${isDark ? "border-white/10 text-[#8ed7cf]" : "border-[#E2E8F0] text-[#64748B]"}`}>
                  <th className="p-3 font-semibold">Role</th>
                  <th className="p-3 font-semibold">Description</th>
                  <th className="p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className={isDark ? "text-[#9eb4b0]" : "text-[#475569]"}>
                {loading ? (
                  <tr>
                    <td className="py-6 text-center text-xs opacity-60" colSpan={3}>
                      Loading roles...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-xs opacity-60" colSpan={3}>
                      No roles created yet.
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.roleId} className={`border-b last:border-0 transition-colors ${isDark ? "border-white/5 hover:bg-white/5" : "border-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
                      <td className={`p-3 font-medium ${isDark ? "text-white" : "text-[#0F172A]"}`}>{role.roleName}</td>
                      <td className="p-3">{role.description ?? "-"}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button type="button" className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"}`} onClick={() => openRoleEdit(role)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isDark ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20" : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"}`}
                            onClick={() => deleteRole(role.roleId, role.roleName)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className={`mb-4 text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#2dc7b8]" : "text-[#10B981]"}`}>Users</h3>
          <form onSubmit={createUser} className="mb-6 grid gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Username"
              value={userForm.username}
              onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))}
              className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
            />
            <input
              type="email"
              placeholder="Email"
              value={userForm.email}
              onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
              className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
            />
            <input
              type="password"
              placeholder="Password"
              value={userForm.password}
              onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
              className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
            />
            <select
              value={userForm.roleId}
              onChange={(event) => setUserForm((prev) => ({ ...prev, roleId: event.target.value }))}
              className={`glass-input rounded-xl p-3 text-sm ${isDark ? "text-white" : "text-[#0F172A]"}`}
            >
              <option value="" className={isDark ? "bg-[#040b10] text-[#9eb4b0]" : "bg-white text-[#64748B]"}>Select role</option>
              {roles.map((role) => (
                <option key={role.roleId} value={role.roleId} className={isDark ? "bg-[#040b10]" : "bg-white"}>
                  {role.roleName}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="glass-button rounded-xl px-4 py-3 text-sm font-semibold tracking-wide md:col-span-2 border-[#2dc7b8]"
            >
              Add User
            </button>
          </form>

          <div className={`overflow-x-auto rounded-xl border ${isDark ? "border-white/10 bg-white/5" : "border-[#E2E8F0] bg-[#FFFFFF]"}`}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={`border-b ${isDark ? "border-white/10 text-[#8ed7cf]" : "border-[#E2E8F0] text-[#64748B]"}`}>
                  <th className="p-3 font-semibold">User</th>
                  <th className="p-3 font-semibold">Role</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className={isDark ? "text-[#9eb4b0]" : "text-[#475569]"}>
                {loading ? (
                  <tr>
                    <td className="py-6 text-center text-xs opacity-60" colSpan={4}>
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-xs opacity-60" colSpan={4}>
                      No users created yet.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.userId} className={`border-b last:border-0 transition-colors ${isDark ? "border-white/5 hover:bg-white/5" : "border-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
                      <td className="p-3">
                        <span className={`font-medium ${isDark ? "text-white" : "text-[#0F172A]"}`}>{user.username}</span>
                        <div className={`text-[10px] ${isDark ? "text-white/50" : "text-[#64748B]"}`}>{user.email}</div>
                      </td>
                      <td className="p-3">{user.roleName}</td>
                      <td className="p-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${user.status === "Active" ? (isDark ? "bg-[#B6FF00]/20 text-[#B6FF00]" : "bg-[#10B981]/10 text-[#10B981]") : (isDark ? "bg-white/10 text-white/60" : "bg-[#F1F5F9] text-[#64748B]")}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button type="button" className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"}`} onClick={() => openUserEdit(user)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isDark ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20" : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"}`}
                            onClick={() => deleteUser(user.userId, user.username)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingRole && roleEditForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? "bg-black/60" : "bg-[#0F172A]/20"}`} onClick={closeRoleEdit} />
          <section className={`glass-panel relative z-10 w-full max-w-3xl rounded-2xl p-6 ${isDark ? "" : "shadow-xl border-[#E2E8F0] bg-[#FFFFFF]"}`}>
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${isDark ? "text-[#B6FF00]" : "text-[#10B981]"}`}>
                  Edit Role
                </p>
                <h3 className={`mt-1 text-xl font-bold ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "text-[#0F172A]"}`}>{editingRole.roleName}</h3>
              </div>
              <button
                type="button"
                onClick={closeRoleEdit}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"}`}
              >
                Close
              </button>
            </div>

            <form onSubmit={saveRoleEdit} className="mb-6 grid gap-4 md:grid-cols-2">
              <input
                type="text"
                value={roleEditForm.roleName}
                onChange={(event) => setRoleEditForm((prev) => (prev ? { ...prev, roleName: event.target.value } : prev))}
                className="glass-input rounded-xl p-3 text-sm"
              />
              <input
                type="text"
                value={roleEditForm.description}
                onChange={(event) => setRoleEditForm((prev) => (prev ? { ...prev, description: event.target.value } : prev))}
                className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
                placeholder="Description"
              />
              <button
                type="submit"
                className="glass-button rounded-xl px-4 py-3 text-sm font-semibold tracking-wide md:col-span-2"
              >
                Save Role
              </button>
            </form>

            <div className={`max-h-[300px] overflow-y-auto rounded-xl border p-5 scrollbar-thin ${isDark ? "border-white/10 bg-black/20 scrollbar-thumb-white/20" : "border-[#E2E8F0] bg-[#F8FAFC] scrollbar-thumb-[#CBD5E1]"}`}>
              {Object.entries(permissionGroups).map(([moduleName, perms]) => (
                <div key={moduleName} className="mb-6 last:mb-0">
                  <p className={`mb-3 text-[10px] font-bold uppercase tracking-[0.2em] border-b pb-2 ${isDark ? "text-[#8ed7cf] border-white/10" : "text-[#475569] border-[#E2E8F0]"}`}>{moduleName}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {perms.map((permission) => (
                      <label key={permission.permissionId} className="flex items-center gap-3 text-sm cursor-pointer group">
                        <div className={`relative flex items-center justify-center w-5 h-5 rounded border transition-colors ${isDark ? "border-white/20 bg-white/5 group-hover:border-[#B6FF00]/50" : "border-[#CBD5E1] bg-white group-hover:border-[#10B981]/50"}`}>
                          <input
                            type="checkbox"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            checked={selectedPermissions.includes(permission.permissionId)}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setSelectedPermissions((prev) =>
                                checked
                                  ? [...prev, permission.permissionId]
                                  : prev.filter((id) => id !== permission.permissionId)
                              );
                            }}
                          />
                          {selectedPermissions.includes(permission.permissionId) && (
                            <svg className={`w-3.5 h-3.5 ${isDark ? "text-[#B6FF00]" : "text-[#10B981]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`transition-colors ${isDark ? "text-[#d9ece9] group-hover:text-white" : "text-[#475569] group-hover:text-[#0F172A]"}`}>{permission.permissionName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={savingRolePermissions}
              onClick={saveRolePermissions}
              className="mt-6 w-full glass-button rounded-xl px-4 py-3 text-sm font-semibold tracking-wide border-[#2dc7b8] disabled:opacity-50"
            >
              {savingRolePermissions ? "Saving..." : "Save Permissions"}
            </button>
          </section>
        </div>
      ) : null}

      {editingUser && userEditForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? "bg-black/60" : "bg-[#0F172A]/20"}`} onClick={closeUserEdit} />
          <section className={`glass-panel relative z-10 w-full max-w-lg rounded-2xl p-6 ${isDark ? "" : "shadow-xl border-[#E2E8F0] bg-[#FFFFFF]"}`}>
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${isDark ? "text-[#2dc7b8]" : "text-[#10B981]"}`}>
                  Edit User
                </p>
                <h3 className={`mt-1 text-xl font-bold ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "text-[#0F172A]"}`}>{editingUser.username}</h3>
              </div>
              <button
                type="button"
                onClick={closeUserEdit}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"}`}
              >
                Close
              </button>
            </div>

            <form onSubmit={saveUserEdit} className="space-y-4">
              <div>
                <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Email</label>
                <input
                  type="email"
                  value={userEditForm.email}
                  onChange={(event) => setUserEditForm((prev) => (prev ? { ...prev, email: event.target.value } : prev))}
                  className="glass-input w-full rounded-xl p-3 text-sm"
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Role</label>
                  <select
                    value={userEditForm.roleId}
                    onChange={(event) => setUserEditForm((prev) => (prev ? { ...prev, roleId: event.target.value } : prev))}
                    className="glass-input w-full rounded-xl p-3 text-sm"
                  >
                    {roles.map((role) => (
                      <option key={role.roleId} value={role.roleId} className={isDark ? "bg-[#040b10]" : "bg-white"}>
                        {role.roleName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Status</label>
                  <select
                    value={userEditForm.status}
                    onChange={(event) => setUserEditForm((prev) => (prev ? { ...prev, status: event.target.value as "Active" | "Inactive" } : prev))}
                    className="glass-input w-full rounded-xl p-3 text-sm"
                  >
                    <option value="Active" className={isDark ? "bg-[#040b10]" : "bg-white"}>Active</option>
                    <option value="Inactive" className={isDark ? "bg-[#040b10]" : "bg-white"}>Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Change Password (Optional)</label>
                <input
                  type="password"
                  placeholder="New password"
                  value={userEditForm.password}
                  onChange={(event) => setUserEditForm((prev) => (prev ? { ...prev, password: event.target.value } : prev))}
                  className={`glass-input w-full rounded-xl p-3 text-sm mb-4 ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={`glass-input w-full rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
                />
              </div>

              {resetPasswordValue ? (
                <div className={`rounded-xl border p-4 text-sm ${isDark ? "border-[#B6FF00]/30 bg-[#B6FF00]/10 text-[#d0ff57]" : "border-[#10B981]/30 bg-[#10B981]/10 text-[#047857]"}`}>
                  Temporary password: <span className="font-mono font-bold tracking-wider">{resetPasswordValue}</span>
                </div>
              ) : null}
              
              <div className={`mt-8 flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t ${isDark ? "border-white/5" : "border-[#E2E8F0]"}`}>
                <button
                  type="button"
                  onClick={resetUserPassword}
                  className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"}`}
                >
                  Force Reset Password
                </button>
                <button
                  type="submit"
                  className="glass-button rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide"
                >
                  Save User
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
