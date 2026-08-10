import AdminAccountsPanel from "@/components/AdminAccountsPanel";
import AdminDashboardMetrics from "@/components/AdminDashboardMetrics";
import AdminProductsPanel from "@/components/AdminProductsPanel";

export default function DashboardPage() {
  // We can safely assume the layout handled the authentication
  return (
    <>
      <AdminDashboardMetrics theme="dark" />
      <AdminProductsPanel theme="dark" />
      <AdminAccountsPanel theme="dark" />
    </>
  );
}
