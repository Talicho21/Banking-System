"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Edit } from "lucide-react";
import { useTheme } from "next-themes";
import { useToast, ToastContainer } from "@/components/Toast";

type Product = {
  productId: number;
  productName: string;
  interestRate: string | number | null;
  productType: "Savings" | "Loan";
  activeFrom: string;
  expiryDate: string | null;
  minimumBalance: string | number;
  createdAt?: string;
};

type EditFormState = {
  productName: string;
  interestRate: string;
  productType: "Savings" | "Loan";
  activeFrom: string;
  expiryDate: string;
  minimumBalance: string;
};

type ApiResponse<T> = {
  success: boolean;
  error?: string;
  data: T;
};

type AdminProductsPanelProps = {
  theme: "dark" | "light";
  onProductCreated?: () => void;
};

type CreateFormState = {
  productName: string;
  interestRate: string;
  productType: "Savings" | "Loan";
  activeFrom: string;
  expiryDate: string;
  minimumBalance: string;
};

export default function AdminProductsPanel({ theme, onProductCreated }: AdminProductsPanelProps) {
  const { theme: nextTheme } = useTheme();
  const isDark = nextTheme !== "light";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toasts, success: toastSuccess, error: toastError, dismiss } = useToast();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [form, setForm] = useState<CreateFormState>({
    productName: "",
    interestRate: "0",
    productType: "Savings",
    activeFrom: "",
    expiryDate: "",
    minimumBalance: "0",
  });


  const loadProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/products", { method: "GET", cache: "no-store" });
      const result: ApiResponse<Product[]> = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error ?? "Failed to load products.");
        return;
      }

      setProducts(result.data);
    } catch {
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    const productName = form.productName.trim();
    const interestRate = Number(form.interestRate);
    const minimumBalance = Number(form.minimumBalance);

    if (!productName) {
      toastError("Product name is required.");
      return;
    }

    if (!Number.isFinite(interestRate) || interestRate < 0) {
      toastError("Interest rate must be a valid number.");
      return;
    }

    if (!form.activeFrom) {
      toastError("Active from date is required.");
      return;
    }

    if (form.expiryDate && form.expiryDate < form.activeFrom) {
      toastError("Expiry date cannot be before active from date.");
      return;
    }

    if (!Number.isFinite(minimumBalance) || minimumBalance < 0) {
      toastError("Minimum balance must be a valid number.");
      return;
    }

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          interestRate,
          productType: form.productType,
          activeFrom: form.activeFrom,
          expiryDate: form.expiryDate || null,
          minimumBalance,
        }),
      });

      const result: ApiResponse<Product> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Failed to create product.");
        return;
      }

      toastSuccess(`✓ Product "${result.data.productName}" created!`);
      setForm({
        productName: "",
        interestRate: "0",
        productType: "Savings",
        activeFrom: "",
        expiryDate: "",
        minimumBalance: "0",
      });
      await loadProducts();
      onProductCreated?.();
    } catch {
      toastError("Failed to create product.");
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      productName: product.productName ?? "",
      interestRate: String(product.interestRate ?? 0),
      productType: product.productType ?? "Savings",
      activeFrom: product.activeFrom ? product.activeFrom.slice(0, 10) : "",
      expiryDate: product.expiryDate ? product.expiryDate.slice(0, 10) : "",
      minimumBalance: String(product.minimumBalance ?? 0),
    });
  };

  const closeEditModal = () => {
    setEditingProduct(null);
    setEditForm(null);
    setSavingEdit(false);
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingProduct || !editForm) {
      return;
    }

    setSavingEdit(true);

    const productName = editForm.productName.trim();
    const interestRate = Number(editForm.interestRate);
    const minimumBalance = Number(editForm.minimumBalance);

    if (!productName) {
      toastError("Product name is required.");
      setSavingEdit(false);
      return;
    }

    if (!Number.isFinite(interestRate) || interestRate < 0) {
      toastError("Interest rate must be a valid number.");
      setSavingEdit(false);
      return;
    }

    if (!editForm.activeFrom) {
      toastError("Active from date is required.");
      setSavingEdit(false);
      return;
    }

    if (editForm.expiryDate && editForm.expiryDate < editForm.activeFrom) {
      toastError("Expiry date cannot be before active from date.");
      setSavingEdit(false);
      return;
    }

    if (!Number.isFinite(minimumBalance) || minimumBalance < 0) {
      toastError("Minimum balance must be a valid number.");
      setSavingEdit(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${editingProduct.productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          interestRate,
          productType: editForm.productType,
          activeFrom: editForm.activeFrom,
          expiryDate: editForm.expiryDate || null,
          minimumBalance,
        }),
      });

      const result: ApiResponse<Product> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Failed to update product.");
        return;
      }

      toastSuccess("✓ Product updated successfully.");
      closeEditModal();
      await loadProducts();
      onProductCreated?.();
    } catch {
      toastError("Failed to update product.");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteProduct = async (productId: number, productName: string) => {
    const confirmDelete = window.confirm(`Delete product ${productName}? This cannot be undone.`);
    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
      const result: ApiResponse<unknown> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Delete failed.");
        return;
      }

      toastSuccess(`✓ Product "${productName}" deleted.`);
      await loadProducts();
      onProductCreated?.();
    } catch {
      toastError("Delete failed.");
    }
  };

  const filteredLabel = useMemo(() => {
    return `${products.length} product${products.length === 1 ? "" : "s"}`;
  }, [products.length]);

  return (
    <section className="mt-8 glass-panel rounded-2xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className={`text-lg font-semibold ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "text-[#0F172A]"}`}>Products</h2>
        <span className={`rounded-full border px-3 py-1 text-xs ${isDark ? "border-white/10 bg-[#0d232b] text-[#8ed7cf]" : "border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]"}`}>{filteredLabel}</span>
      </div>

      <form onSubmit={handleCreate} className="mb-6 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
        <input
          type="text"
          placeholder="Product Name"
          value={form.productName}
          onChange={(event) => setForm((prev) => ({ ...prev, productName: event.target.value }))}
          className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
        />
        <select
          value={form.productType}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, productType: event.target.value as "Savings" | "Loan" }))
          }
          className="glass-input rounded-xl p-3 text-sm"
        >
          <option value="Savings" className={isDark ? "bg-[#040b10]" : "bg-white"}>Savings</option>
          <option value="Loan" className={isDark ? "bg-[#040b10]" : "bg-white"}>Loan</option>
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Interest Rate (%)"
          value={form.interestRate}
          onChange={(event) => setForm((prev) => ({ ...prev, interestRate: event.target.value }))}
          className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
        />
        <input
          type="date"
          value={form.activeFrom}
          onChange={(event) => setForm((prev) => ({ ...prev, activeFrom: event.target.value }))}
          className="glass-input rounded-xl p-3 text-sm"
          title="Active From"
        />
        <input
          type="date"
          value={form.expiryDate}
          onChange={(event) => setForm((prev) => ({ ...prev, expiryDate: event.target.value }))}
          className="glass-input rounded-xl p-3 text-sm"
          title="Expiry Date"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Min Balance"
          value={form.minimumBalance}
          onChange={(event) => setForm((prev) => ({ ...prev, minimumBalance: event.target.value }))}
          className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
        />
        <button
          type="submit"
          className="glass-button rounded-xl px-4 py-3 text-sm font-semibold tracking-wide md:col-span-full lg:col-span-1"
        >
          Create Product
        </button>
      </form>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className={`border-b ${isDark ? "border-white/5 text-[#8ed7cf]" : "border-[#E2E8F0] text-[#64748B]"}`}>
              <th className="pb-3 pr-4 font-semibold">Product</th>
              <th className="pb-3 pr-4 font-semibold">Type</th>
              <th className="pb-3 pr-4 font-semibold">Interest</th>
              <th className="pb-3 pr-4 font-semibold">Min Balance</th>
              <th className="pb-3 pr-4 font-semibold">Active</th>
              <th className="pb-3 pr-4 font-semibold">Expiry</th>
              <th className="pb-3 pr-4 font-semibold">Created</th>
              <th className="pb-3 pr-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className={isDark ? "text-[#9eb4b0]" : "text-[#475569]"}>
            {loading ? (
              <tr>
                <td className="py-6 text-center text-xs opacity-60" colSpan={8}>
                  Loading products...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td className="py-6 text-center text-xs opacity-60" colSpan={8}>
                  No products yet.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.productId} className={`border-b last:border-0 transition-colors ${isDark ? "border-white/5 hover:bg-white/5" : "border-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
                  <td className={`py-3 pr-4 font-medium ${isDark ? "text-white" : "text-[#0F172A]"}`}>{product.productName}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-[#F1F5F9] border-[#E2E8F0] text-[#0F172A]"}`}>
                      {product.productType}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{Number(product.interestRate ?? 0).toFixed(2)}%</td>
                  <td className="py-3 pr-4">{Number(product.minimumBalance ?? 0).toFixed(2)}</td>
                  <td className="py-3 pr-4">{product.activeFrom ? product.activeFrom.slice(0, 10) : "-"}</td>
                  <td className="py-3 pr-4">{product.expiryDate ? product.expiryDate.slice(0, 10) : "-"}</td>
                  <td className="py-3 pr-4">
                    {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(product.productId, product.productName)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isDark ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20" : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"}`}
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

      {editingProduct && editForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? "bg-black/60" : "bg-[#0F172A]/20"}`} onClick={closeEditModal} />
          <section className={`glass-panel relative z-10 w-full max-w-lg rounded-2xl p-6 ${isDark ? "" : "shadow-xl border-[#E2E8F0] bg-[#FFFFFF]"}`}>
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${isDark ? "text-[#B6FF00]" : "text-[#10B981]"}`}>
                  Edit Product
                </p>
                <h3 className={`mt-1 text-xl font-bold ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "text-[#0F172A]"}`}>Product #{editingProduct.productId}</h3>
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
                <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Product Name</label>
                <input
                  type="text"
                  placeholder="Product Name"
                  value={editForm.productName}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, productName: event.target.value } : prev))
                  }
                  className="glass-input w-full rounded-xl p-3 text-sm"
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Type</label>
                  <select
                    value={editForm.productType}
                    onChange={(event) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, productType: event.target.value as "Savings" | "Loan" } : prev
                      )
                    }
                    className="glass-input w-full rounded-xl p-3 text-sm"
                  >
                    <option value="Savings" className={isDark ? "bg-[#040b10]" : "bg-white"}>Savings</option>
                    <option value="Loan" className={isDark ? "bg-[#040b10]" : "bg-white"}>Loan</option>
                  </select>
                </div>
                <div>
                  <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Interest Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Interest Rate"
                    value={editForm.interestRate}
                    onChange={(event) =>
                      setEditForm((prev) => (prev ? { ...prev, interestRate: event.target.value } : prev))
                    }
                    className="glass-input w-full rounded-xl p-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Active From</label>
                  <input
                    type="date"
                    value={editForm.activeFrom}
                    onChange={(event) =>
                      setEditForm((prev) => (prev ? { ...prev, activeFrom: event.target.value } : prev))
                    }
                    className="glass-input w-full rounded-xl p-3 text-sm"
                  />
                </div>
                <div>
                  <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Expiry Date</label>
                  <input
                    type="date"
                    value={editForm.expiryDate}
                    onChange={(event) =>
                      setEditForm((prev) => (prev ? { ...prev, expiryDate: event.target.value } : prev))
                    }
                    className="glass-input w-full rounded-xl p-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>Minimum Balance</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Minimum Balance"
                  value={editForm.minimumBalance}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, minimumBalance: event.target.value } : prev))
                  }
                  className="glass-input w-full rounded-xl p-3 text-sm"
                />
              </div>

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
    </section>
  );
}
