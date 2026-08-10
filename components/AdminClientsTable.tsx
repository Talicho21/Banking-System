"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast, ToastContainer } from "@/components/Toast";
import { useTheme } from "next-themes";

type CategoryFilter = "All" | "Individual" | "Non-Individual";
type StatusFilter = "All" | "Active" | "Inactive" | "Suspended";
type ClientStatus = "Active" | "Inactive" | "Suspended";

type ClientRow = {
  clientId: number;
  clientCategory: "Individual" | "Non-Individual";
  registrationDate: string;
  status: ClientStatus;
  firstName: string | null;
  lastName: string | null;
  dob: string | null;
  gender: "Male" | "Female" | "Other" | null;
  individualSubType: string | null;
  organizationName: string | null;
  registrationNumber: string | null;
  incorporationDate: string | null;
  nonIndividualSubType: string | null;
};

type ApiResponse = {
  success: boolean;
  error?: string;
  data: ClientRow[];
  meta: {
    totalClients: number;
    totalIndividuals: number;
    totalNonIndividuals: number;
  };
};

type AdminClientsTableProps = {
  theme: "dark" | "light";
};

type EditFormState = {
  status: ClientStatus;
  firstName: string;
  lastName: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  individualSubType: string;
  organizationName: string;
  registrationNumber: string;
  incorporationDate: string;
  nonIndividualSubType: string;
};

const toDateInputValue = (value: string | null) => {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
};

export default function AdminClientsTable({ theme }: AdminClientsTableProps) {
  const { theme: nextTheme } = useTheme();
  const isDark = nextTheme !== "light";
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [meta, setMeta] = useState({ totalClients: 0, totalIndividuals: 0, totalNonIndividuals: 0 });
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<Record<number, ClientStatus>>({});
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const { toasts, success: toastSuccess, error: toastError, dismiss } = useToast();

  const fetchClients = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        category,
        status,
        search,
        limit: "250",
      });

      const response = await fetch(`/api/admin/clients?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error ?? "Failed to load clients.");
        return;
      }

      setClients(result.data);
      setMeta(result.meta);
      const nextPending: Record<number, ClientStatus> = {};
      result.data.forEach((client) => {
        nextPending[client.clientId] = client.status;
      });
      setPendingStatusUpdate(nextPending);
    } catch {
      setError("Failed to load clients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [category, status]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClients();
  };

  const deleteClient = async (clientId: number) => {
    const confirmDelete = window.confirm(`Delete client ${clientId}? This cannot be undone.`);
    if (!confirmDelete) {
      return;
    }

    const response = await fetch(`/api/admin/clients/${clientId}`, { method: "DELETE" });
    const result = await response.json();

    if (!response.ok || !result.success) {
      toastError(result.error ?? "Delete failed.");
      return;
    }

    toastSuccess("✓ Client deleted.");
    await fetchClients();
  };

  const updateStatus = async (clientId: number) => {
    const statusToSet = pendingStatusUpdate[clientId];
    const response = await fetch(`/api/admin/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusToSet }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      toastError(result.error ?? "Status update failed.");
      return;
    }

    toastSuccess("✓ Client status updated.");
    await fetchClients();
  };

  const openEditModal = (client: ClientRow) => {
    setEditingClient(client);
    setEditForm({
      status: client.status,
      firstName: client.firstName ?? "",
      lastName: client.lastName ?? "",
      dob: toDateInputValue(client.dob),
      gender: client.gender ?? "Male",
      individualSubType: client.individualSubType ?? "Individual",
      organizationName: client.organizationName ?? "",
      registrationNumber: client.registrationNumber ?? "",
      incorporationDate: toDateInputValue(client.incorporationDate),
      nonIndividualSubType: client.nonIndividualSubType ?? "Corporate",
    });
  };

  const closeEditModal = () => {
    setEditingClient(null);
    setEditForm(null);
    setSavingEdit(false);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingClient || !editForm) {
      return;
    }

    setSavingEdit(true);

    const payload =
      editingClient.clientCategory === "Individual"
        ? {
            status: editForm.status,
            firstName: editForm.firstName,
            lastName: editForm.lastName,
            dob: editForm.dob,
            gender: editForm.gender,
            individualSubType: editForm.individualSubType,
          }
        : {
            status: editForm.status,
            organizationName: editForm.organizationName,
            registrationNumber: editForm.registrationNumber,
            incorporationDate: editForm.incorporationDate,
            nonIndividualSubType: editForm.nonIndividualSubType,
          };

    try {
      const response = await fetch(`/api/admin/clients/${editingClient.clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Update failed.");
        return;
      }

      toastSuccess("✓ Client details updated.");
      closeEditModal();
      await fetchClients();
    } catch {
      toastError("Update failed.");
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredLabel = useMemo(() => {
    return `${clients.length} result${clients.length === 1 ? "" : "s"}`;
  }, [clients.length]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="glass-panel rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(182,255,0,0.1)]">
          <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Total Clients</p>
          <p className={`mt-3 text-4xl font-light tracking-tight ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]" : "text-[#0F172A]"}`}>{meta.totalClients}</p>
          <p className={`mt-2 text-xs ${isDark ? "text-[#527471]" : "text-[#94A3B8]"}`}>Across all categories</p>
        </article>

        <article className="glass-panel rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(182,255,0,0.1)]">
          <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Individual</p>
          <p className={`mt-3 text-4xl font-light tracking-tight ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]" : "text-[#0F172A]"}`}>{meta.totalIndividuals}</p>
          <p className={`mt-2 text-xs ${isDark ? "text-[#527471]" : "text-[#94A3B8]"}`}>Personal client records</p>
        </article>

        <article className="glass-panel rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(182,255,0,0.1)]">
          <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Non-Individual</p>
          <p className={`mt-3 text-4xl font-light tracking-tight ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]" : "text-[#0F172A]"}`}>{meta.totalNonIndividuals}</p>
          <p className={`mt-2 text-xs ${isDark ? "text-[#527471]" : "text-[#94A3B8]"}`}>Organizations and entities</p>
        </article>
      </div>

      <section className="mt-6 glass-panel rounded-2xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className={`text-lg font-semibold ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "text-[#0F172A]"}`}>Client Directory</h2>
          <span className={`rounded-full border px-3 py-1 text-xs ${isDark ? "border-white/10 bg-[#0d232b] text-[#8ed7cf]" : "border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]"}`}>{filteredLabel}</span>
        </div>

        <form onSubmit={onSearchSubmit} className="mb-6 grid gap-4 md:grid-cols-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryFilter)}
            className="glass-input rounded-xl p-3 text-sm"
          >
            <option value="All" className={isDark ? "bg-[#040b10]" : "bg-white"}>All Categories</option>
            <option value="Individual" className={isDark ? "bg-[#040b10]" : "bg-white"}>Individual</option>
            <option value="Non-Individual" className={isDark ? "bg-[#040b10]" : "bg-white"}>Non-Individual</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="glass-input rounded-xl p-3 text-sm"
          >
            <option value="All" className={isDark ? "bg-[#040b10]" : "bg-white"}>All Status</option>
            <option value="Active" className={isDark ? "bg-[#040b10]" : "bg-white"}>Active</option>
            <option value="Inactive" className={isDark ? "bg-[#040b10]" : "bg-white"}>Inactive</option>
            <option value="Suspended" className={isDark ? "bg-[#040b10]" : "bg-white"}>Suspended</option>
          </select>

          <input
            type="text"
            placeholder="Search ID, name, org..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
          />

          <button
            type="submit"
            className="glass-button rounded-xl px-4 py-3 text-sm font-semibold tracking-wide"
          >
            Apply Filters
          </button>
        </form>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>
        ) : null}

        <ToastContainer toasts={toasts} dismiss={dismiss} />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={`border-b ${isDark ? "border-white/5 text-[#8ed7cf]" : "border-[#E2E8F0] text-[#64748B]"}`}>
                <th className="pb-3 pr-4 font-semibold">Client ID</th>
                <th className="pb-3 pr-4 font-semibold">Category</th>
                <th className="pb-3 pr-4 font-semibold">Name / Organization</th>
                <th className="pb-3 pr-4 font-semibold">Subtype</th>
                <th className="pb-3 pr-4 font-semibold">Registered</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
                <th className="pb-3 pr-4 font-semibold">Operations</th>
              </tr>
            </thead>
            <tbody className={isDark ? "text-[#9eb4b0]" : "text-[#475569]"}>
              {loading ? (
                <tr>
                  <td className="py-6 text-center text-xs opacity-60" colSpan={7}>
                    Loading clients...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td className="py-6 text-center text-xs opacity-60" colSpan={7}>
                    No clients found for your selection.
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const displayName =
                    client.clientCategory === "Individual"
                      ? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()
                      : client.organizationName ?? "-";
                  const subtype =
                    client.clientCategory === "Individual"
                      ? client.individualSubType ?? "-"
                      : client.nonIndividualSubType ?? "-";

                  return (
                    <tr key={client.clientId} className={`border-b last:border-0 transition-colors ${isDark ? "border-white/5 hover:bg-white/5" : "border-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
                      <td className="py-3 pr-4">#{client.clientId}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] border ${isDark ? "bg-[#10252d] border-white/10 text-[#d9ece9]" : "bg-[#F1F5F9] border-[#E2E8F0] text-[#0F172A]"}`}>
                          {client.clientCategory}
                        </span>
                      </td>
                      <td className={`py-3 pr-4 font-medium ${isDark ? "text-white" : "text-[#0F172A]"}`}>{displayName || "-"}</td>
                      <td className="py-3 pr-4">{subtype}</td>
                      <td className="py-3 pr-4">{new Date(client.registrationDate).toLocaleDateString()}</td>
                      <td className="py-3 pr-4">
                        <select
                          value={pendingStatusUpdate[client.clientId] ?? client.status}
                          onChange={(e) =>
                            setPendingStatusUpdate((prev) => ({
                              ...prev,
                              [client.clientId]: e.target.value as ClientStatus,
                            }))
                          }
                          className="glass-input rounded-lg px-2 py-1.5 text-xs bg-transparent"
                        >
                          <option value="Active" className={isDark ? "bg-[#040b10]" : "bg-white"}>Active</option>
                          <option value="Inactive" className={isDark ? "bg-[#040b10]" : "bg-white"}>Inactive</option>
                          <option value="Suspended" className={isDark ? "bg-[#040b10]" : "bg-white"}>Suspended</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(client)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(client.clientId)}
                            className="glass-button rounded-full px-3 py-1 text-xs font-semibold"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteClient(client.clientId)}
                            className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editingClient && editForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? "bg-black/60" : "bg-[#0F172A]/20"}`} onClick={closeEditModal} />
          <section className={`glass-panel relative z-10 w-full max-w-xl rounded-2xl p-6 ${isDark ? "" : "shadow-xl border-[#E2E8F0] bg-[#FFFFFF]"}`}>
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${isDark ? "text-[#B6FF00]" : "text-[#10B981]"}`}>
                  Edit Client
                </p>
                <h3 className={`mt-1 text-xl font-bold ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "text-[#0F172A]"}`}>Client ID #{editingClient.clientId}</h3>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"}`}
              >
                Close
              </button>
            </div>

            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            status: e.target.value as ClientStatus,
                          }
                        : prev
                    )
                  }
                  className="glass-input w-full rounded-xl p-3 text-sm"
                >
                  <option value="Active" className={isDark ? "bg-[#040b10]" : "bg-white"}>Active</option>
                  <option value="Inactive" className={isDark ? "bg-[#040b10]" : "bg-white"}>Inactive</option>
                  <option value="Suspended" className={isDark ? "bg-[#040b10]" : "bg-white"}>Suspended</option>
                </select>
              </div>

              {editingClient.clientCategory === "Individual" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>First Name</label>
                      <input
                        type="text"
                        placeholder="First Name"
                        value={editForm.firstName}
                        onChange={(e) =>
                          setEditForm((prev) => (prev ? { ...prev, firstName: e.target.value } : prev))
                        }
                        className="glass-input w-full rounded-xl p-3 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Last Name</label>
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={editForm.lastName}
                        onChange={(e) =>
                          setEditForm((prev) => (prev ? { ...prev, lastName: e.target.value } : prev))
                        }
                        className="glass-input w-full rounded-xl p-3 text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Date of Birth</label>
                      <input
                        type="date"
                        value={editForm.dob}
                        onChange={(e) =>
                          setEditForm((prev) => (prev ? { ...prev, dob: e.target.value } : prev))
                        }
                        className="glass-input w-full rounded-xl p-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Gender</label>
                      <select
                        value={editForm.gender}
                        onChange={(e) =>
                          setEditForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  gender: e.target.value as "Male" | "Female" | "Other",
                                }
                              : prev
                          )
                        }
                        className="glass-input w-full rounded-xl p-3 text-sm"
                      >
                        <option value="Male" className={isDark ? "bg-[#040b10]" : "bg-white"}>Male</option>
                        <option value="Female" className={isDark ? "bg-[#040b10]" : "bg-white"}>Female</option>
                        <option value="Other" className={isDark ? "bg-[#040b10]" : "bg-white"}>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Sub-Type</label>
                      <select
                        value={editForm.individualSubType}
                        onChange={(e) =>
                          setEditForm((prev) => (prev ? { ...prev, individualSubType: e.target.value } : prev))
                        }
                        className="glass-input w-full rounded-xl p-3 text-sm"
                      >
                        <option value="Individual" className={isDark ? "bg-[#040b10]" : "bg-white"}>Individual Client</option>
                        <option value="Minor" className={isDark ? "bg-[#040b10]" : "bg-white"}>Minor</option>
                        <option value="Group" className={isDark ? "bg-[#040b10]" : "bg-white"}>Group</option>
                        <option value="Staff" className={isDark ? "bg-[#040b10]" : "bg-white"}>Staff</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Organization Name</label>
                    <input
                      type="text"
                      placeholder="Organization Name"
                      value={editForm.organizationName}
                      onChange={(e) =>
                        setEditForm((prev) => (prev ? { ...prev, organizationName: e.target.value } : prev))
                      }
                      className="glass-input w-full rounded-xl p-3 text-sm"
                      required
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Registration Number</label>
                      <input
                        type="text"
                        placeholder="Registration Number"
                        value={editForm.registrationNumber}
                        onChange={(e) =>
                          setEditForm((prev) => (prev ? { ...prev, registrationNumber: e.target.value } : prev))
                        }
                        className="glass-input w-full rounded-xl p-3 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Incorporation Date</label>
                      <input
                        type="date"
                        value={editForm.incorporationDate}
                        onChange={(e) =>
                          setEditForm((prev) => (prev ? { ...prev, incorporationDate: e.target.value } : prev))
                        }
                        className="glass-input w-full rounded-xl p-3 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Sub-Type</label>
                    <select
                      value={editForm.nonIndividualSubType}
                      onChange={(e) =>
                        setEditForm((prev) => (prev ? { ...prev, nonIndividualSubType: e.target.value } : prev))
                      }
                      className="glass-input w-full rounded-xl p-3 text-sm"
                    >
                      <option value="Corporate" className={isDark ? "bg-[#040b10]" : "bg-white"}>Corporate</option>
                      <option value="Association" className={isDark ? "bg-[#040b10]" : "bg-white"}>Association</option>
                      <option value="Bank" className={isDark ? "bg-[#040b10]" : "bg-white"}>Bank</option>
                      <option value="NGO" className={isDark ? "bg-[#040b10]" : "bg-white"}>NGO</option>
                    </select>
                  </div>
                </>
              )}

              <div className={`mt-8 flex justify-end gap-3 pt-4 border-t ${isDark ? "border-white/5" : "border-[#E2E8F0]"}`}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="glass-button rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
