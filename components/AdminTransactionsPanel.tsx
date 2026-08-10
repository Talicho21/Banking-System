"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast, ToastContainer } from "@/components/Toast";
import { useSecurity } from "@/components/SecurityContext";
import { useTheme } from "next-themes";
import { GState, jsPDF } from "jspdf";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/Pagination";

type TransactionRow = {
  transactionId: number;
  transactionType: "Cash" | "Transfer";
  direction: "Credit" | "Debit";
  amount: string | number;
  reference: string | null;
  createdAt: string;
  accountId: number;
  accountNumber: string;
  clientId: number;
  productId: number;
  productName: string;
};

type CashApprovalRow = {
  approvalId: number;
  accountId: number;
  accountNumber: string;
  clientId: number;
  direction: "Credit" | "Debit";
  amount: string | number;
  reference: string | null;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  error?: string;
  data: T;
};

type ReceiptPayload =
  | {
      type: "Cash";
      direction: "Credit" | "Debit";
      amount: number;
      accountId: number;
      accountNumber: string;
      clientName: string;
      reference: string | null;
      transactionId: number;
      newBalance: number;
      createdAt: string;
    }
  | {
      type: "Transfer";
      amount: number;
      fromAccountId: number;
      fromAccountNumber: string;
      fromClientName: string;
      toAccountId: number;
      toAccountNumber: string;
      toClientName: string;
      reference: string | null;
      transferId: number;
      feeAmount: number;
      fromBalance: number;
      toBalance: number;
      createdAt: string;
    };

type AdminTransactionsPanelProps = {
  theme: "dark" | "light";
};

type CashFormState = {
  accountId: string;
  direction: "Credit" | "Debit";
  amount: string;
  reference: string;
};

type TransferFormState = {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  reference: string;
};

type TypeFilter = "All" | "Cash" | "Transfer";

const TYPE_FILTERS: TypeFilter[] = ["All", "Cash", "Transfer"];

export default function AdminTransactionsPanel({ theme }: AdminTransactionsPanelProps) {
  const { theme: nextTheme } = useTheme();
  const isDark = nextTheme !== "light";
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toasts, success: toastSuccess, error: toastError, dismiss } = useToast();
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);
  const [clearing, setClearing] = useState(false);
  const { roleName } = useSecurity();
  const isSuperAdmin = roleName === "Super Admin";
  const isManager = roleName === "Manager";
  const [approvals, setApprovals] = useState<CashApprovalRow[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [accountFilter, setAccountFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cashForm, setCashForm] = useState<CashFormState>({
    accountId: "",
    direction: "Credit",
    amount: "",
    reference: "",
  });
  const [transferForm, setTransferForm] = useState<TransferFormState>({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    reference: "",
  });

  const pagination = usePagination(transactions, 10, [typeFilter, accountFilter, startDate, endDate]);
  const approvalsPagination = usePagination(approvals, 10, []);

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

  const loadTransactions = async (overrideAccount?: string) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        type: typeFilter,
        limit: "250",
      });

      const accountIdValue = (overrideAccount ?? accountFilter).trim();
      if (accountIdValue) {
        params.set("accountId", accountIdValue);
      }

      if (startDate) {
        params.set("startDate", startDate);
      }

      if (endDate) {
        params.set("endDate", endDate);
      }

      const response = await fetch(`/api/admin/transactions?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const result: ApiResponse<TransactionRow[]> = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error ?? "Failed to load transactions.");
        return;
      }

      setTransactions(result.data);
    } catch {
      setError("Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  // Security context handles session load

  const loadApprovals = async () => {
    setApprovalsLoading(true);
    try {
      const response = await fetch("/api/admin/transactions/approvals", { method: "GET", cache: "no-store" });
      const result: ApiResponse<CashApprovalRow[]> = await response.json();
      if (response.ok && result.success) {
        setApprovals(result.data ?? []);
      }
    } catch {
      setApprovals([]);
    } finally {
      setApprovalsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    loadApprovals();
  }, [typeFilter]);

  const clearTransactions = async () => {
    setClearing(true);
    setError("");

    try {
      const response = await fetch("/api/admin/transactions/reset", { method: "POST" });
      const result: ApiResponse<{ resetAt: string }> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Failed to clear transactions.");
        return;
      }

      toastSuccess("✓ Transaction history cleared.");
      await loadTransactions();
    } catch {
      setError("Failed to clear transactions.");
    } finally {
      setClearing(false);
    }
  };

  const onFilterSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    loadTransactions(accountFilter);
  };

  const postCash = async (event: React.FormEvent) => {
    event.preventDefault();
    setReceipt(null);

    const accountId = Number(cashForm.accountId);
    const amount = Number(cashForm.amount);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      toastError("Account id must be a positive number.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toastError("Amount must be greater than zero.");
      return;
    }

    try {
      const response = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          direction: cashForm.direction,
          amount,
          reference: cashForm.reference.trim() || null,
        }),
      });

      const result: ApiResponse<{
        transactionId?: number;
        newBalance?: number;
        status?: "Pending";
        approvalId?: number;
      }> = await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Failed to post cash transaction.");
        return;
      }

      if (result.data?.status === "Pending") {
        toastSuccess("✓ Cash request submitted for manager approval.");
        setCashForm({ accountId: "", direction: "Credit", amount: "", reference: "" });
        await loadApprovals();
        return;
      }

  const updateApproval = async (approvalId: number, action: "approve" | "reject") => {
    try {
      const response = await fetch(`/api/admin/transactions/approvals/${approvalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result: ApiResponse<{
        transactionId?: number;
        accountId?: number;
        newBalance?: number;
      }> = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error ?? "Failed to update approval.");
        return;
      }

      if (action === "approve" && result.data?.transactionId && result.data?.accountId) {
        const summary = await fetchAccountSummary(result.data.accountId);
        setReceipt({
          type: "Cash",
          direction: "Credit",
          amount: 0,
          accountId: result.data.accountId,
          accountNumber: summary.accountNumber,
          clientName: summary.clientName,
          reference: "Approved cash posting",
          transactionId: result.data.transactionId,
          newBalance: Number(result.data.newBalance ?? 0),
          createdAt: new Date().toISOString(),
        });
        toastSuccess("✓ Cash approval posted successfully.");
      } else if (action === "reject") {
        toastSuccess("✓ Cash approval rejected.");
      }

      await loadApprovals();
      await loadTransactions();
    } catch {
      setError("Failed to update approval.");
    }
  };

      toastSuccess(`✓ Cash ${cashForm.direction.toLowerCase()} posted. New balance: ${(result.data.newBalance ?? 0).toFixed(2)}`);
      const summary = await fetchAccountSummary(accountId);
      setReceipt({
        type: "Cash",
        direction: cashForm.direction,
        amount,
        accountId,
        accountNumber: summary.accountNumber,
        clientName: summary.clientName,
        reference: cashForm.reference.trim() || null,
        transactionId: result.data.transactionId ?? 0,
        newBalance: result.data.newBalance ?? 0,
        createdAt: new Date().toISOString(),
      });
      setCashForm({ accountId: "", direction: "Credit", amount: "", reference: "" });
      await loadTransactions();
    } catch {
      toastError("Failed to post cash transaction.");
    }
  };

  const postTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    setReceipt(null);

    const fromAccountId = Number(transferForm.fromAccountId);
    const toAccountId = Number(transferForm.toAccountId);
    const amount = Number(transferForm.amount);

    if (!Number.isInteger(fromAccountId) || fromAccountId <= 0) {
      toastError("From account id must be a positive number.");
      return;
    }

    if (!Number.isInteger(toAccountId) || toAccountId <= 0) {
      toastError("To account id must be a positive number.");
      return;
    }

    if (fromAccountId === toAccountId) {
      toastError("From and to accounts must be different.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toastError("Amount must be greater than zero.");
      return;
    }

    try {
      const response = await fetch("/api/admin/transactions/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount,
          reference: transferForm.reference.trim() || null,
        }),
      });

      const result: ApiResponse<{ transferId: number; feeAmount: number; fromBalance: number; toBalance: number }> =
        await response.json();

      if (!response.ok || !result.success) {
        toastError(result.error ?? "Failed to post transfer transaction.");
        return;
      }

      toastSuccess("✓ Transfer posted successfully.");
      const [fromSummary, toSummary] = await Promise.all([
        fetchAccountSummary(fromAccountId),
        fetchAccountSummary(toAccountId),
      ]);
      setReceipt({
        type: "Transfer",
        amount,
        fromAccountId,
        fromAccountNumber: fromSummary.accountNumber,
        fromClientName: fromSummary.clientName,
        toAccountId,
        toAccountNumber: toSummary.accountNumber,
        toClientName: toSummary.clientName,
        reference: transferForm.reference.trim() || null,
        transferId: result.data.transferId,
        feeAmount: result.data.feeAmount,
        fromBalance: result.data.fromBalance,
        toBalance: result.data.toBalance,
        createdAt: new Date().toISOString(),
      });
      setTransferForm({ fromAccountId: "", toAccountId: "", amount: "", reference: "" });
      await loadTransactions();
    } catch {
      toastError("Failed to post transfer transaction.");
    }
  };

  const filteredLabel = useMemo(() => {
    return `${transactions.length} result${transactions.length === 1 ? "" : "s"}`;
  }, [transactions.length]);

  const loadImageDataUrl = async (src: string) => {
    const response = await fetch(src);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  };

  const downloadReceipt = async () => {
    if (!receipt) {
      return;
    }

    const doc = new jsPDF();
    const lines: string[] = [];

    const [logoDataUrl, backgroundDataUrl] = await Promise.all([
      loadImageDataUrl("/logo.png"),
      loadImageDataUrl("/bank.jpg"),
    ]);

    if (backgroundDataUrl) {
      doc.addImage(backgroundDataUrl, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      doc.setGState(new GState({ opacity: 0.3 }));
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 210, 297, "F");
      doc.setGState(new GState({ opacity: 1 }));
    }

    doc.setFillColor(6, 34, 41);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(240, 255, 253);
    doc.setFontSize(14);
    const headerTextX = logoDataUrl ? 34 : 14;
    doc.text("LITTLE Mini Banking System", headerTextX, 18);

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", 14, 7, 16, 16, undefined, "FAST");
    }

    doc.setFillColor(248, 255, 253);
    doc.roundedRect(12, 40, 186, 210, 6, 6, "F");
    doc.setDrawColor(209, 231, 227);
    doc.roundedRect(12, 40, 186, 210, 6, 6, "S");

    doc.setTextColor(20, 55, 59);
    doc.setFontSize(16);
    doc.text("Transaction Receipt", 18, 56);

    doc.setDrawColor(198, 222, 219);
    doc.line(18, 60, 190, 60);

    lines.push(`Type: ${receipt.type}`);
    lines.push(`Date: ${new Date(receipt.createdAt).toLocaleString()}`);

    if (receipt.type === "Cash") {
      lines.push(`Transaction ID: ${receipt.transactionId}`);
      lines.push(`Direction: ${receipt.direction}`);
      lines.push(`Account No: ${receipt.accountNumber}`);
      lines.push(`Client: ${receipt.clientName}`);
      lines.push(`Amount: ${receipt.amount.toFixed(2)}`);
      lines.push("Fee: 0.00");
      lines.push(`New Balance: ${receipt.newBalance.toFixed(2)}`);
      if (receipt.reference) {
        lines.push(`Reference: ${receipt.reference}`);
      }
    } else {
      lines.push(`Transfer ID: ${receipt.transferId}`);
      lines.push(`From Account No: ${receipt.fromAccountNumber}`);
      lines.push(`From Client: ${receipt.fromClientName}`);
      lines.push(`To Account No: ${receipt.toAccountNumber}`);
      lines.push(`To Client: ${receipt.toClientName}`);
      lines.push(`Amount: ${receipt.amount.toFixed(2)}`);
      lines.push(`Fee: ${receipt.feeAmount.toFixed(2)}`);
      lines.push(`From Balance: ${receipt.fromBalance.toFixed(2)}`);
      lines.push(`To Balance: ${receipt.toBalance.toFixed(2)}`);
      if (receipt.reference) {
        lines.push(`Reference: ${receipt.reference}`);
      }
    }

    const left = 18;
    let top = 72;
    doc.setFontSize(11.5);
    doc.setTextColor(26, 64, 68);
    lines.forEach((line) => {
      doc.text(line, left, top);
      top += 8;
    });

    doc.setTextColor(200, 40, 40);
    doc.setFontSize(26);
    doc.text("PAID", 150, 92, { angle: 20 });

    doc.setDrawColor(30, 108, 116);
    doc.setLineWidth(0.6);
    doc.circle(158, 210, 18, "S");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 108, 116);
    doc.text("LITTLE MINI", 150, 207, { angle: 0 });
    doc.text("BANKING SYSTEM", 147, 212, { angle: 0 });

    doc.setFontSize(10);
    doc.setTextColor(120, 142, 139);
    doc.text("Generated by LITTLE Mini Banking System", 14, 285);

    doc.save(`receipt-${receipt.type.toLowerCase()}-${Date.now()}.pdf`);
  };

  const fetchAccountSummary = async (accountId: number) => {
    const response = await fetch(`/api/admin/accounts/${accountId}`, { method: "GET", cache: "no-store" });
    const result: ApiResponse<{ accountNumber: string; clientName: string }> = await response.json();
    if (!response.ok || !result.success) {
      return { accountNumber: String(accountId), clientName: "Client" };
    }
    return {
      accountNumber: result.data.accountNumber ?? String(accountId),
      clientName: result.data.clientName ?? "Client",
    };
  };

  const updateApproval = async (approvalId: number, action: "approve" | "reject") => {
    try {
      const response = await fetch(`/api/admin/transactions/approvals/${approvalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result: ApiResponse<unknown> = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error ?? "Failed to update approval.");
        return;
      }

      await loadApprovals();
      await loadTransactions();
    } catch {
      setError("Failed to update approval.");
    }
  };

  return (
    <section className="mt-8 glass-panel rounded-2xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className={`text-lg font-semibold ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "text-[#0F172A]"}`}>Transactions</h2>
        <span className={`rounded-full border px-3 py-1 text-xs ${isDark ? "border-white/10 bg-[#0d232b] text-[#8ed7cf]" : "border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]"}`}>{filteredLabel}</span>
        {isSuperAdmin ? (
          <button
            type="button"
            onClick={clearTransactions}
            disabled={clearing}
            className={`rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-200 transition-colors hover:bg-red-500/20 ${clearing ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {clearing ? "Clearing..." : "Clear History"}
          </button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={postCash} className={`space-y-4 rounded-2xl border p-5 relative overflow-hidden group ${isDark ? "border-white/10 bg-white/5" : "border-[#E2E8F0] bg-[#FFFFFF] shadow-[0_4px_12px_rgba(0,0,0,0.02)]"}`}>
          <div className={`absolute top-0 left-0 w-1 h-full opacity-50 group-hover:opacity-100 transition-opacity ${isDark ? "bg-[#B6FF00]" : "bg-[#10B981]"}`}></div>
          <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${isDark ? "text-[#B6FF00]" : "text-[#10B981]"}`}>
            Cash Transaction
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="number"
              min="1"
              placeholder="Account ID or Number"
              value={cashForm.accountId}
              onChange={(event) => setCashForm((prev) => ({ ...prev, accountId: event.target.value }))}
              className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
            />
            <select
              value={cashForm.direction}
              onChange={(event) =>
                setCashForm((prev) => ({ ...prev, direction: event.target.value as "Credit" | "Debit" }))
              }
              className="glass-input rounded-xl p-3 text-sm"
            >
              <option value="Credit" className={isDark ? "bg-[#040b10]" : "bg-white"}>Credit (+)</option>
              <option value="Debit" className={isDark ? "bg-[#040b10]" : "bg-white"}>Debit (-)</option>
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Amount"
              value={cashForm.amount}
              onChange={(event) => setCashForm((prev) => ({ ...prev, amount: event.target.value }))}
              className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
            />
            <input
              type="text"
              placeholder="Reference (optional)"
              value={cashForm.reference}
              onChange={(event) => setCashForm((prev) => ({ ...prev, reference: event.target.value }))}
              className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
            />
          </div>
          <button
            type="submit"
            className="glass-button w-full rounded-xl px-4 py-3 text-sm font-semibold tracking-wide"
          >
            Post Cash
          </button>
        </form>

        <form onSubmit={postTransfer} className={`space-y-4 rounded-2xl border p-5 relative overflow-hidden group ${isDark ? "border-white/10 bg-white/5" : "border-[#E2E8F0] bg-[#FFFFFF] shadow-[0_4px_12px_rgba(0,0,0,0.02)]"}`}>
          <div className={`absolute top-0 left-0 w-1 h-full opacity-50 group-hover:opacity-100 transition-opacity ${isDark ? "bg-[#2dc7b8]" : "bg-[#0EA5E9]"}`}></div>
          <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${isDark ? "text-[#2dc7b8]" : "text-[#0EA5E9]"}`}>
            Transfer Transaction
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="number"
              min="1"
              placeholder="From Account ID/Number"
              value={transferForm.fromAccountId}
              onChange={(event) => setTransferForm((prev) => ({ ...prev, fromAccountId: event.target.value }))}
              className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
            />
            <input
              type="number"
              min="1"
              placeholder="To Account ID/Number"
              value={transferForm.toAccountId}
              onChange={(event) => setTransferForm((prev) => ({ ...prev, toAccountId: event.target.value }))}
              className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Amount"
              value={transferForm.amount}
              onChange={(event) => setTransferForm((prev) => ({ ...prev, amount: event.target.value }))}
              className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
            />
            <input
              type="text"
              placeholder="Reference (optional)"
              value={transferForm.reference}
              onChange={(event) => setTransferForm((prev) => ({ ...prev, reference: event.target.value }))}
              className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
            />
          </div>
          <button
            type="submit"
            className="glass-button w-full rounded-xl px-4 py-3 text-sm font-semibold tracking-wide border-[#2dc7b8]"
          >
            Post Transfer
          </button>
        </form>
      </div>

      {isManager || isSuperAdmin ? (
        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className={`text-lg font-semibold ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "text-[#0F172A]"}`}>Pending Cash Approvals</h2>
          </div>

          <div className={`overflow-x-auto rounded-xl border ${isDark ? "border-white/10 bg-white/5" : "border-[#E2E8F0] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.02)]"}`}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={`border-b ${isDark ? "border-white/10 text-[#8ed7cf]" : "border-[#E2E8F0] text-[#64748B]"}`}>
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold">Account</th>
                  <th className="p-3 font-semibold">Client</th>
                  <th className="p-3 font-semibold">Direction</th>
                  <th className="p-3 font-semibold">Amount</th>
                  <th className="p-3 font-semibold">Reference</th>
                  <th className="p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className={isDark ? "text-[#9eb4b0]" : "text-[#475569]"}>
                {approvalsLoading ? (
                  <tr>
                    <td className="py-6 text-center text-xs opacity-60" colSpan={7}>
                      Loading approvals...
                    </td>
                  </tr>
                ) : approvals.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-xs opacity-60" colSpan={7}>
                      No pending approvals.
                    </td>
                  </tr>
                ) : (
                  approvalsPagination.currentData.map((approval) => (
                    <tr key={approval.approvalId} className={`border-b last:border-0 transition-colors ${isDark ? "border-white/5 hover:bg-white/5" : "border-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
                      <td className="p-3">{new Date(approval.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className={`font-mono ${isDark ? "text-[#d9ece9]" : "text-[#0F172A]"}`}>{approval.accountNumber}</span> <span className="text-xs opacity-50">(#{approval.accountId})</span>
                      </td>
                      <td className="p-3">#{approval.clientId}</td>
                      <td className="p-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${approval.direction === "Credit" ? (isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-[#D1FAE5] text-[#059669]") : (isDark ? "bg-rose-500/20 text-rose-300" : "bg-[#FFE4E6] text-[#E11D48]")}`}>
                          {approval.direction}
                        </span>
                      </td>
                      <td className={`p-3 font-medium ${isDark ? "text-white" : "text-[#0F172A]"}`}>{Number(approval.amount).toFixed(2)}</td>
                      <td className="p-3">{approval.reference ?? "-"}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateApproval(approval.approvalId, "approve")}
                            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => updateApproval(approval.approvalId, "reject")}
                            className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination {...approvalsPagination} />
          </div>
        </div>
      ) : null}

      {receipt ? (
        <div className="mb-6 mt-6 rounded-xl border border-[#B6FF00]/30 bg-[#B6FF00]/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[#d0ff57]">✓ Transaction complete &mdash; receipt ready</span>
            <button
              type="button"
              onClick={downloadReceipt}
              className="glass-button rounded-xl px-4 py-2 text-xs font-bold tracking-wide"
            >
              Download PDF
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <form onSubmit={onFilterSubmit} className="mb-6 mt-8 grid gap-4 md:grid-cols-6">
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
          className="glass-input rounded-xl p-3 text-sm"
        >
          {TYPE_FILTERS.map((type) => (
            <option key={type} value={type} className="bg-[#040b10]">
              {type}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          placeholder="Account ID"
          value={accountFilter}
          onChange={(event) => setAccountFilter(event.target.value)}
          className={`glass-input rounded-xl p-3 text-sm ${isDark ? "placeholder-white/30" : "placeholder-[#94A3B8]"}`}
        />
        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          className="glass-input rounded-xl p-3 text-sm"
        />
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          className="glass-input rounded-xl p-3 text-sm"
        />
        <div className="md:col-span-2">
          <button
            type="submit"
            className="glass-button w-full rounded-xl px-4 py-3 text-sm font-semibold tracking-wide"
          >
            Apply Filters
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className={`border-b ${isDark ? "border-white/5 text-[#8ed7cf]" : "border-[#E2E8F0] text-[#64748B]"}`}>
              <th className="pb-3 pr-4 font-semibold">Date</th>
              <th className="pb-3 pr-4 font-semibold">Type</th>
              <th className="pb-3 pr-4 font-semibold">Direction</th>
              <th className="pb-3 pr-4 font-semibold">Amount</th>
              <th className="pb-3 pr-4 font-semibold">Account</th>
              <th className="pb-3 pr-4 font-semibold">Client</th>
              <th className="pb-3 pr-4 font-semibold">Product</th>
              <th className="pb-3 pr-4 font-semibold">Reference</th>
            </tr>
          </thead>
          <tbody className={isDark ? "text-[#9eb4b0]" : "text-[#475569]"}>
            {loading ? (
              <tr>
                <td className="py-6 text-center text-xs opacity-60" colSpan={8}>
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td className="py-6 text-center text-xs opacity-60" colSpan={8}>
                  No transactions yet.
                </td>
              </tr>
            ) : (
              pagination.currentData.map((transaction) => (
                <tr key={transaction.transactionId} className={`border-b last:border-0 transition-colors ${isDark ? "border-white/5 hover:bg-white/5" : "border-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
                  <td className="py-3 pr-4">{new Date(transaction.createdAt).toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-[#F1F5F9] border-[#E2E8F0] text-[#0F172A]"}`}>
                      {transaction.transactionType}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${transaction.direction === "Credit" ? (isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-[#D1FAE5] text-[#059669]") : (isDark ? "bg-rose-500/20 text-rose-300" : "bg-[#FFE4E6] text-[#E11D48]")}`}>
                      {transaction.direction}
                    </span>
                  </td>
                  <td className={`py-3 pr-4 font-medium ${isDark ? "text-white" : "text-[#0F172A]"}`}>{Number(transaction.amount).toFixed(2)}</td>
                  <td className="py-3 pr-4">
                    <span className={`font-mono ${isDark ? "text-[#d9ece9]" : "text-[#0F172A]"}`}>{transaction.accountNumber}</span> <span className="text-xs opacity-50">(#{transaction.accountId})</span>
                  </td>
                  <td className="py-3 pr-4">#{transaction.clientId}</td>
                  <td className="py-3 pr-4">{transaction.productName}</td>
                  <td className="py-3 pr-4">{transaction.reference ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination {...pagination} />
      </div>
    </section>
  );
}
