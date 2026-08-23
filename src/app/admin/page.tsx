import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Admin — NYC Street Report",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
