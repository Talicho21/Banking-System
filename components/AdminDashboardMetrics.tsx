"use client";

import { useEffect, useMemo, useState } from "react";
import { useSecurity } from "@/components/SecurityContext";
import { useTheme } from "next-themes";

type MetricsResponse = {
  newClientsWeek: number;
  newClientsMonth: number;
  cashTransactionsWeek: number;
  transferTransactionsWeek: number;
  topTransactionsWeek: Array<{
    transactionId: number;
    transactionType: "Cash" | "Transfer";
    direction: "Credit" | "Debit";
    amount: string | number;
    createdAt: string;
    accountId: number;
  }>;
  topAccountsByBalance: Array<{
    accountId: number;
    accountNumber: string;
    clientId: number;
    balance: string | number;
  }>;
};

type ApiResponse<T> = {
  success: boolean;
  error?: string;
  data: T;
};

type AdminDashboardMetricsProps = {
  theme?: "dark" | "light"; // kept for backwards compatibility in usage, but ignored
};

export default function AdminDashboardMetrics({ theme: _propTheme }: AdminDashboardMetricsProps) {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const { roleName } = useSecurity();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const normalizedRole = (roleName || "").trim().toLowerCase();
  const isSuperAdmin = normalizedRole === "super admin";
  const canViewBalance = normalizedRole === "manager" || normalizedRole === "super admin";

  const loadMetrics = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/dashboard/metrics", {
        method: "GET",
        cache: "no-store",
      });
      const result: ApiResponse<MetricsResponse> = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error ?? "Failed to load dashboard metrics.");
        return;
      }

      setMetrics(result.data);
    } catch {
      setError("Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleReset = async () => {
    setResetting(true);
    setResetError("");
    setResetSuccess("");

    try {
      const response = await fetch("/api/admin/dashboard/reset", { method: "POST" });
      const result: ApiResponse<{ resetAt: string }> = await response.json();

      if (!response.ok || !result.success) {
        setResetError(result.error ?? "Failed to clear dashboard.");
        return;
      }

      setResetSuccess("Dashboard metrics cleared.");
      await loadMetrics();
    } catch {
      setResetError("Failed to clear dashboard.");
    } finally {
      setResetting(false);
    }
  };

  const summaryCards = useMemo(() => {
    return [
      {
        label: "New Clients (Week)",
        value: metrics?.newClientsWeek ?? 0,
        helper: "Registered since Monday",
      },
      {
        label: "New Clients (Month)",
        value: metrics?.newClientsMonth ?? 0,
        helper: "Registered since month start",
      },
      {
        label: "Cash Transactions (Week)",
        value: metrics?.cashTransactionsWeek ?? 0,
        helper: "Cash postings this week",
      },
      {
        label: "Transfer Transactions (Week)",
        value: metrics?.transferTransactionsWeek ?? 0,
        helper: "Transfers this week",
      },
    ];
  }, [metrics]);

  return (
    <section className="mb-8 space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 backdrop-blur-md">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article key={card.label} className={`glass-panel rounded-2xl p-6 transition-all hover:-translate-y-1 ${isDark ? "hover:shadow-[0_8px_32px_rgba(182,255,0,0.1)]" : "hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)]"}`}>
            <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${isDark ? "text-[#9eb4b0]" : "text-[#475569]"}`}>{card.label}</p>
            <p className={`mt-3 text-4xl font-light tracking-tight ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]" : "text-[#0F172A] font-semibold"}`}>
              {loading ? "-" : card.value}
            </p>
            <p className={`mt-2 text-xs ${isDark ? "text-[#527471]" : "text-[#64748B]"}`}>{card.helper}</p>
          </article>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between pb-4">
          <h2 className={`text-lg font-semibold ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "text-[#0F172A]"}`}>
            Top Transactions This Week
          </h2>
          {isSuperAdmin ? (
            <button
              onClick={handleReset}
              disabled={resetting}
              className="glass-button rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider"
            >
              {resetting ? "Clearing..." : "Clear Dashboard"}
            </button>
          ) : null}
        </div>

        {resetError ? (
          <p className="mb-4 text-sm text-red-400">{resetError}</p>
        ) : null}
        {resetSuccess ? (
          <p className={`mb-4 text-sm ${isDark ? "text-[#B6FF00]" : "text-[#10B981]"}`}>{resetSuccess}</p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={`border-b ${isDark ? "border-white/5 text-[#8ed7cf]" : "border-[#E2E8F0] text-[#64748B]"}`}>
                <th className="pb-3 pr-4 font-semibold">Date</th>
                <th className="pb-3 pr-4 font-semibold">Type</th>
                <th className="pb-3 pr-4 font-semibold">Direction</th>
                <th className="pb-3 pr-4 font-semibold">Amount</th>
                <th className="pb-3 pr-4 font-semibold">Account</th>
              </tr>
            </thead>
            <tbody className={isDark ? "text-[#9eb4b0]" : "text-[#475569]"}>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs opacity-60">
                    Loading transactions...
                  </td>
                </tr>
              ) : !metrics?.topTransactionsWeek?.length ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs opacity-60">
                    No transactions posted this week.
                  </td>
                </tr>
              ) : (
                metrics.topTransactionsWeek.map((tx) => (
                  <tr key={tx.transactionId} className={`border-b last:border-0 transition-colors ${isDark ? "border-white/5 hover:bg-white/5" : "border-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
                    <td className="py-3 pr-4">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs border ${isDark ? "bg-[#10252d] border-white/10 text-[#d9ece9]" : "bg-[#F1F5F9] border-[#E2E8F0] text-[#475569]"}`}>
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{tx.direction}</td>
                    <td className={`py-3 pr-4 font-medium ${isDark ? "text-white" : "text-[#0F172A]"}`}>{tx.amount}</td>
                    <td className="py-3 pr-4">#{tx.accountId}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canViewBalance ? (
        <div className="glass-panel rounded-2xl p-6">
          <h2 className={`mb-4 text-lg font-semibold ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "text-[#0F172A]"}`}>
            Top Accounts by Balance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={`border-b ${isDark ? "border-white/5 text-[#8ed7cf]" : "border-[#E2E8F0] text-[#64748B]"}`}>
                  <th className="pb-3 pr-4 font-semibold">Account</th>
                  <th className="pb-3 pr-4 font-semibold">Client</th>
                  <th className="pb-3 pr-4 font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className={isDark ? "text-[#9eb4b0]" : "text-[#475569]"}>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-xs opacity-60">
                      Loading accounts...
                    </td>
                  </tr>
                ) : !metrics?.topAccountsByBalance?.length ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-xs opacity-60">
                      No accounts available.
                    </td>
                  </tr>
                ) : (
                  metrics.topAccountsByBalance.map((acc) => (
                    <tr key={acc.accountId} className={`border-b last:border-0 transition-colors ${isDark ? "border-white/5 hover:bg-white/5" : "border-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
                      <td className={`py-3 pr-4 font-mono ${isDark ? "text-[#d9ece9]" : "text-[#0F172A]"}`}>{acc.accountNumber}</td>
                      <td className="py-3 pr-4">#{acc.clientId}</td>
                      <td className={`py-3 pr-4 font-medium ${isDark ? "text-white" : "text-[#0F172A]"}`}>{acc.balance}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
