import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SidebarProvider } from "@/components/layout/sidebar";

export default async function JobDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }
  
  if (!["SUPERUSER", "ADMIN"].includes(session.user.role)) {
    redirect("/");
  }

  // Fixed viewport - JobLifecycleView handles its own h-screen layout
  // No min-h-screen to avoid double scrollbar
  return (
    <SidebarProvider>
      {children}
    </SidebarProvider>
  );
}
