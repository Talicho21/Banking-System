"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast, ToastContainer } from "@/components/Toast";
import { useTheme } from "next-themes";
import { useSecurity } from "@/components/SecurityContext";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/Pagination";

type Product = {
  productId: number;
  productName: string;
  interestRate: string | number | null;
  productType?: "Savings" | "Loan";
};

type AccountStatus = "Active" | "Inactive" | "Frozen" | "Closed";

type AccountRow = {
  accountId: number;
  accountNumber: string;
  clientId: number;
  productId: number;
  productName: string;
  branchId: number;
  status: AccountStatus;
  balance: string | number;
  createdAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  error?: string;
  data: T;
};

type AdminAccountsPanelProps = {
  theme: "dark" | "light";
  refreshKey?: number;
};

type CreateFormState = {
  branchId: string;
  clientId: string;
  productId: string;
};

type StatusFilter = "All" | AccountStatus;

const STATUS_FILTERS: StatusFilter[] = ["All", "Active", "Inactive", "Frozen", "Closed"];

export default function AdminAccountsPanel({ theme, refreshKey }: AdminAccountsPanelProps) {
  const { theme: nextTheme } = useTheme();
  const isDark = nextTheme !== "light";
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState("");
  const { toasts, success: toastSuccess, error: toastError, dismiss } = useToast();
  
  const { permissions, roleName } = useSecurity();
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const canCreateAccount = permissionSet.has("create_account");
  const canEditAccount = permissionSet.has("edit_account");
  const canViewBalance = roleName === "Manager" || roleName === "Super Admin";

  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [editStatus, setEditStatus] = useState<AccountStatus>("Active");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [productFilter, setProductFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [createForm, setCreateForm] = useState<CreateFormState>({
    branchId: "",
    clientId: "",
    productId: "",
  });

  const panel = isDark ? "border-[#1f2d32] bg-[#08171d]/85" : "border-[#E2E8F0] bg-[#FFFFFF]";
  const heading = isDark ? "text-[#f2fffd]" : "text-[#0F172A]";
  const badge = isDark ? "border-[#27464e] bg-[#0d232b] text-[#8eb8b2]" : "border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]";
  const field = isDark
    ? "border-[#22414d] bg-[#0a2029] text-[#e6f4f2] focus:border-[#2dc7b8]"
    : "border-[#E2E8F0] bg-white text-[#0F172A] focus:border-[#10B981]";
  const tableHead = isDark ? "border-[#1d323a] text-[#8eb8b2]" : "border-[#E2E8F0] text-[#64748B]";
  const tableBody = isDark ? "text-[#d9efeb]" : "text-[#475569]";
  const tableRow = isDark ? "border-[#14262d]" : "border-[#E2E8F0] hover:bg-[#F8FAFC]";
  const emptyText = isDark ? "text-[#9db8b4]" : "text-[#64748B]";

  const pagination = usePagination(accounts, 10, [statusFilter, productFilter, search, refreshKey]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    setError("");

    try {
      const response = await fetch("/api/admin/products", { method: "GET", cache: "no-store" });
      const result: ApiResponse<Product[]> = await response.json();

      if (!response.ok || !result.success) {
        if (response.status !== 403 && result.error !== "Forbidden") {
          setError(result.error ?? "Failed to load products.");
        }
        return;
      }

      setProducts(result.data);
    } catch {
      setError("Failed to load products.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadAccounts = async (overrideSearch?: string) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        status: statusFilter,
        search: overrideSearch ?? search,
        limit: "250",
      });

      if (productFilter !== "All") {
        params.set("productId", productFilter);
      }

      const response = await fetch(`/api/admin/accounts?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const result: ApiResponse<AccountRow[]> = await response.json();

      if (!response.ok || !result.success) {
        if (response.status !== 403 && result.error !== "Forbidden") {
          setError(result.error ?? "Failed to load accounts.");
        }
        return;
      }

      setAccounts(result.data);
    } catch {
      setError("Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [refreshKey]);

  useEffect(() => {
    loadAccounts();
  }, [statusFilter, productFilter]);

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    loadAccounts(search.trim());
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    const branchId = Number(createForm.branchId);
    const clientId = Number(createForm.clientId);
    const productId = Number(createForm.productId);

    if (!Number.isInteger(branchId) || branchId <= 0) {
      toastError("Branch id must be a positive number.");
      return;
    }

    if (!Number.isInteger(clientId) || clientId <= 0) {
      toastError("Client id must be a positive number.");
      return;
    }

    if (!Number.isInteger(productId) || productId <= 0) {
      toastError("Product must be selected.");
      return;
    }

    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, clientId, productId }),
      });

      const result: ApiResponse<{ accountId: number; accountNumber: string }> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Failed to create account.");
        return;
      }

      toastSuccess(`✓ Account ${result.data.accountNumber} created!`);
      setCreateForm({ branchId: "", clientId: "", productId: "" });
      await loadAccounts();
    } catch {
      toastError("Failed to create account.");
    }
  };

  const filteredLabel = useMemo(() => {
    return `${accounts.length} result${accounts.length === 1 ? "" : "s"}`;
  }, [accounts.length]);

  const openEdit = (account: AccountRow) => {
    setEditingAccount(account);
    setEditStatus(account.status);
  };

  const closeEdit = () => {
    setEditingAccount(null);
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingAccount) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/admin/accounts/${editingAccount.accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus }),
      });
      const result: ApiResponse<unknown> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Failed to update account.");
        return;
      }

      toastSuccess("✓ Account status updated successfully.");
      closeEdit();
      await loadAccounts();
    } catch {
      toastError("Failed to update account.");
    }
  };

  return (
    <section className="mt-8 glass-panel rounded-2xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className={`text-lg font-semibold ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "text-[#0F172A]"}`}>Account Maintenance</h2>
        <span className={`rounded-full border px-3 py-1 text-xs ${isDark ? "border-white/10 bg-[#0d232b] text-[#8ed7cf]" : "border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]"}`}>{filteredLabel}</span>
      </div>

      {canCreateAccount ? (
        <form onSubmit={handleCreate} className="mb-6 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            type="number"
            min="1"
            placeholder="Branch ID"
            value={createForm.branchId}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, branchId: event.target.value }))}
            className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
          />
          <input
            type="number"
            min="1"
            placeholder="Client ID"
            value={createForm.clientId}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, clientId: event.target.value }))}
            className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
          />
          <select
            value={createForm.productId}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, productId: event.target.value }))}
            className="glass-input rounded-xl p-3 text-sm"
            disabled={loadingProducts}
          >
            <option value="" className={isDark ? "bg-[#040b10]" : "bg-white"}>Select product</option>
            {products.map((product) => (
              <option key={product.productId} value={product.productId} className={isDark ? "bg-[#040b10]" : "bg-white"}>
                {product.productName}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="glass-button rounded-xl px-4 py-3 text-sm font-semibold tracking-wide"
          >
            Create Account
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <form onSubmit={onSearchSubmit} className="mb-6 grid gap-4 md:grid-cols-4">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className="glass-input rounded-xl p-3 text-sm"
        >
          {STATUS_FILTERS.map((status) => (
            <option key={status} value={status} className={isDark ? "bg-[#040b10]" : "bg-white"}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={productFilter}
          onChange={(event) => setProductFilter(event.target.value)}
          className="glass-input rounded-xl p-3 text-sm"
        >
          <option value="All" className={isDark ? "bg-[#040b10]" : "bg-white"}>All Products</option>
          {products.map((product) => (
            <option key={product.productId} value={product.productId} className={isDark ? "bg-[#040b10]" : "bg-white"}>
              {product.productName}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search account no or client id"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
        />

        <button
          type="submit"
          className="glass-button rounded-xl px-4 py-3 text-sm font-semibold tracking-wide"
        >
          Apply Filters
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className={`border-b ${isDark ? "border-white/5 text-[#8ed7cf]" : "border-[#E2E8F0] text-[#64748B]"}`}>
              <th className="pb-3 pr-4 font-semibold">Account No</th>
              <th className="pb-3 pr-4 font-semibold">Client ID</th>
              <th className="pb-3 pr-4 font-semibold">Product</th>
              <th className="pb-3 pr-4 font-semibold">Branch</th>
                {canViewBalance ? <th className="pb-3 pr-4 font-semibold">Balance</th> : null}
              <th className="pb-3 pr-4 font-semibold">Status</th>
              <th className="pb-3 pr-4 font-semibold">Created</th>
              {canEditAccount ? <th className="pb-3 pr-4 font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody className={isDark ? "text-[#9eb4b0]" : "text-[#475569]"}>
            {loading ? (
              <tr>
                <td className="py-6 text-center text-xs opacity-60" colSpan={canEditAccount ? 8 : 7}>
                  Loading accounts...
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td className="py-6 text-center text-xs opacity-60" colSpan={canEditAccount ? 8 : 7}>
                  No accounts found for your selection.
                </td>
              </tr>
            ) : (
              pagination.currentData.map((account) => (
                <tr key={account.accountId} className={`border-b last:border-0 transition-colors ${isDark ? "border-white/5 hover:bg-white/5" : "border-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
                  <td className={`py-3 pr-4 font-mono ${isDark ? "text-[#d9ece9]" : "text-[#0F172A]"}`}>{account.accountNumber}</td>
                  <td className="py-3 pr-4">#{account.clientId}</td>
                  <td className="py-3 pr-4">{account.productName}</td>
                  <td className="py-3 pr-4">{account.branchId}</td>
                  {canViewBalance ? (
                    <td className={`py-3 pr-4 font-medium ${isDark ? "text-white" : "text-[#0F172A]"}`}>{account.balance}</td>
                  ) : null}
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] border ${isDark ? "bg-[#10252d] border-white/10 text-[#d9ece9]" : "bg-[#F1F5F9] border-[#E2E8F0] text-[#0F172A]"}`}>
                      {account.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{new Date(account.createdAt).toLocaleDateString()}</td>
                  {canEditAccount ? (
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => openEdit(account)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"}`}
                      >
                        Edit
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination {...pagination} />
      </div>

      {editingAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? "bg-black/60" : "bg-[#0F172A]/20"}`} onClick={closeEdit} />
          <section className={`glass-panel relative z-10 w-full max-w-md rounded-2xl p-6 ${isDark ? "" : "shadow-xl border-[#E2E8F0] bg-[#FFFFFF]"}`}>
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${isDark ? "text-[#B6FF00]" : "text-[#10B981]"}`}>
                  Edit Account Status
                </p>
                <h3 className={`mt-1 text-xl font-bold font-mono ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "text-[#0F172A]"}`}>{editingAccount.accountNumber}</h3>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"}`}
              >
                Close
              </button>
            </div>

            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Status</label>
                <select
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value as AccountStatus)}
                  className="glass-input w-full rounded-xl p-3 text-sm"
                >
                  {STATUS_FILTERS.filter((status) => status !== "All").map((status) => (
                    <option key={status} value={status} className={isDark ? "bg-[#040b10]" : "bg-white"}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Branch ID</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Branch ID"
                  value={editingAccount.branchId}
                  onChange={(event) =>
                    setEditingAccount((prev) =>
                      prev ? { ...prev, branchId: Number(event.target.value) } : prev
                    )
                  }
                  className="glass-input w-full rounded-xl p-3 text-sm"
                />
              </div>

              <div className={`mt-8 flex justify-end gap-3 pt-4 border-t ${isDark ? "border-white/5" : "border-[#E2E8F0]"}`}>
                <button
                  type="button"
                  onClick={closeEdit}
                  className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide"
                >
                  Save Status
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
