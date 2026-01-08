import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function FieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout allowedRoles={["SUPERUSER", "ADMIN", "MANAGER", "FIELD"]}>{children}</DashboardLayout>;
}


