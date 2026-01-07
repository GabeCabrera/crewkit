import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardLayoutClient } from "./dashboard-layout-client";

export async function DashboardLayout({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (!allowedRoles.includes(session.user.role)) {
    redirect("/");
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}

