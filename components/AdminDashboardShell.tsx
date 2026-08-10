"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import LogoutButton from "@/components/LogoutButton";
import { SecurityProvider, useSecurity } from "@/components/SecurityContext";
import { LayoutDashboard, Users, ArrowRightLeft, Wallet, Shield } from "lucide-react";


type AdminDashboardShellProps = {
  adminName: string;
  children: React.ReactNode;
};

export default function AdminDashboardShell(props: AdminDashboardShellProps) {
  return (
    <SecurityProvider>
      <AdminDashboardShellInner {...props} />
    </SecurityProvider>
  );
}

function AdminDashboardShellInner({
  adminName,
  children,
}: AdminDashboardShellProps) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { permissions, roleName } = useSecurity();
  const { theme } = useTheme();
  const isDark = theme !== "light";

  useEffect(() => {
    setMounted(true);
  }, []);

  const permissionSet = useMemo(() => new Set(permissions ?? []), [permissions]);
  const normalizedRoleName = (roleName || "").trim().toLowerCase();
  
  const canViewDashboard = permissionSet.has("view_dashboard") && normalizedRoleName !== "officer";
  const canViewClients = permissionSet.has("view_clients");
  const canViewTransactions = permissionSet.has("view_transactions");
  const canViewSecurity =
    permissionSet.has("view_users") || permissionSet.has("view_roles") || permissionSet.has("edit_roles");
  const canViewBalances = normalizedRoleName === "manager" || normalizedRoleName === "super admin";

  const navLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 w-full rounded-r-xl px-4 py-3 text-sm font-semibold transition-all duration-300 border-l-2 ${
      isActive
        ? (isDark ? "bg-white/5 text-[#B6FF00] border-[#B6FF00] shadow-[inset_8px_0_16px_rgba(182,255,0,0.08)]" : "bg-[#ECFDF5] text-[#10B981] border-[#10B981] shadow-[inset_4px_0_12px_rgba(16,185,129,0.05)]")
        : (isDark ? "border-transparent text-[#9eb4b0] hover:bg-white/5 hover:text-[#d9ece9]" : "border-transparent text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]")
    }`;

  if (!mounted) {
    return null; // Return null on server-side and before hydration
  }

  return (
    <main className={`relative flex min-h-screen overflow-hidden transition-colors duration-300 ${isDark ? "bg-[#040b10]" : "bg-gradient-to-br from-[#FCFCFD] to-[#F1F5F9]"}`}>
      <div className={`pointer-events-none absolute inset-0 ${isDark ? "bg-[radial-gradient(circle_at_10%_10%,rgba(45,199,184,0.15),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(182,255,0,0.05),transparent_40%),linear-gradient(to_bottom,#061018,#03070a)]" : "hidden"}`} />
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/bank.jpg"
          alt="Money background"
          fill
          priority
          className={`bank-bg-drift object-cover object-center transition-all duration-700 ${isDark ? "opacity-10 mix-blend-screen" : "opacity-15 mix-blend-multiply"}`}
        />
      </div>
      <div className={`pointer-events-none absolute inset-0 ${isDark ? "bg-[radial-gradient(circle_at_50%_35%,transparent_20%,rgba(2,8,12,0.7)_80%)]" : "hidden"}`} />
      <div className={`pointer-events-none absolute inset-0 opacity-20 ${isDark ? "bg-[linear-gradient(rgba(109,168,176,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(109,168,176,0.1)_1px,transparent_1px)]" : "bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)]"} bank-grid-shift bg-size-[60px_60px]`} />

      <aside className={`relative z-20 flex w-72 flex-col border-r backdrop-blur-xl p-6 transition-all ${isDark ? "border-[#1f2d32] bg-[#040b10]/60" : "border-[#E2E8F0] bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)]"}`}>
        <div className="mb-10">
          <p className={`text-[10px] font-bold uppercase tracking-[0.24em] ${isDark ? "text-[#B6FF00]" : "text-[#10B981]"}`}>
            Mini Core Banking
          </p>
          <h1 className={`mt-2 text-2xl font-bold leading-tight ${isDark ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]" : "text-[#0F172A]"}`}>
            Admin Dashboard
          </h1>
          <p className={`mt-1.5 text-xs ${isDark ? "text-[#9eb4b0]" : "text-[#475569]"}`}>
            Welcome back, {adminName}
          </p>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          {canViewDashboard ? (
            <Link href="/dashboard" className={navLinkClass(pathname === "/dashboard")}>
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
          ) : null}
          {canViewClients ? (
            <Link href="/dashboard/clients" className={navLinkClass(pathname === "/dashboard/clients")}>
              <Users size={18} />
              Clients
            </Link>
          ) : null}
          {canViewTransactions ? (
            <Link href="/dashboard/transactions" className={navLinkClass(pathname === "/dashboard/transactions")}>
              <ArrowRightLeft size={18} />
              Transactions
            </Link>
          ) : null}
          {canViewBalances ? (
            <Link href="/dashboard/balance" className={navLinkClass(pathname === "/dashboard/balance")}>
              <Wallet size={18} />
              Balances
            </Link>
          ) : null}
          {canViewSecurity ? (
            <Link href="/dashboard/security" className={navLinkClass(pathname === "/dashboard/security")}>
              <Shield size={18} />
              Security
            </Link>
          ) : null}
        </nav>

        <div className={`mt-6 flex items-center justify-between border-t pt-6 ${isDark ? "border-[#1f2d32]" : "border-[#E2E8F0]"}`}>
          <LogoutButton />
        </div>
      </aside>

      <section className="relative z-10 flex-1 h-screen overflow-y-auto p-6 md:p-10 custom-scrollbar">
        <div className="mx-auto w-full max-w-7xl relative">

          {children}
        </div>
      </section>
    </main>
  );
}
