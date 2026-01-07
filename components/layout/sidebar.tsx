"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, createContext, useContext } from "react";
import { 
  Home, 
  Package, 
  Layers, 
  Users,
  Settings,
  FileText,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// Context to share collapsed state
const SidebarContext = createContext<{
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}>({
  isCollapsed: false,
  setIsCollapsed: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

function SidebarSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <aside className={cn(
      "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:border-r lg:bg-white skeleton-fade-in transition-all duration-300",
      isCollapsed ? "lg:w-16" : "lg:w-64"
    )}>
      <div className="flex flex-col h-full">
        {/* Logo/Brand */}
        <div className={cn(
          "flex h-16 items-center border-b",
          isCollapsed ? "justify-center px-2" : "px-6"
        )}>
          <Skeleton className={cn("h-7", isCollapsed ? "w-8" : "w-24")} />
        </div>

        {/* Navigation Skeleton */}
        <nav className={cn("flex-1 space-y-1 py-4", isCollapsed ? "px-2" : "px-3")}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={cn(
              "flex items-center py-2.5",
              isCollapsed ? "justify-center px-0" : "gap-3 px-3"
            )}>
              <Skeleton className="h-5 w-5 rounded shrink-0" />
              {!isCollapsed && <Skeleton className="h-4 w-24" />}
            </div>
          ))}
        </nav>

        {/* User Info Skeleton */}
        <div className={cn("border-t", isCollapsed ? "p-2" : "p-4")}>
          <div className={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "gap-3"
          )}>
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            {!isCollapsed && (
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);
  
  // Update CSS variable and localStorage when state changes
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      isCollapsed ? "4rem" : "16rem"
    );
    localStorage.setItem("sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed]);
  
  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const role = session?.user?.role || "ADMIN";

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case "ADMIN":
        return [
          { href: "/admin", icon: Home, label: "Dashboard" },
          { href: "/admin/inventory", icon: Package, label: "Inventory" },
          { href: "/admin/reports", icon: FileText, label: "Reports" },
          { href: "/admin/team-management", icon: Users2, label: "Team Management" },
          { href: "/admin/settings", icon: Settings, label: "Settings" },
        ];
      case "MANAGER":
        return [
          { href: "/manager", icon: Home, label: "Dashboard" },
          { href: "/manager/inventory", icon: Package, label: "Inventory" },
          { href: "/manager/assemblies", icon: Layers, label: "Assemblies" },
          { href: "/manager/reports", icon: FileText, label: "Reports" },
        ];
      case "FIELD":
        return [
          { href: "/field", icon: Home, label: "Home" },
          { href: "/field/assemblies", icon: Layers, label: "Assemblies" },
          { href: "/field/inventory", icon: Package, label: "Inventory" },
          { href: "/field/today", icon: FileText, label: "Today" },
        ];
      default:
        return [];
    }
  };

  // Show skeleton while loading
  if (status === "loading") {
    return <SidebarSkeleton isCollapsed={isCollapsed} />;
  }

  const navItems = getNavItems();

  return (
    <aside className={cn(
      "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:border-r lg:bg-white content-fade-in transition-all duration-300",
      isCollapsed ? "lg:w-16" : "lg:w-64"
    )}>
      <div className="flex flex-col h-full relative">
        {/* Collapse Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 z-50 h-6 w-6 rounded-full border bg-white shadow-md hover:bg-accent"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
        
        {/* Logo/Brand */}
        <div className={cn(
          "flex h-16 items-center border-b transition-all duration-300",
          isCollapsed ? "justify-center px-2" : "px-6"
        )}>
          {isCollapsed ? (
            <span className="text-xl font-bold">C</span>
          ) : (
            <h1 className="text-xl font-bold">CrewKit</h1>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 space-y-1 py-4 transition-all duration-300",
          isCollapsed ? "px-2" : "px-3"
        )}>
          {navItems.map((item) => {
            const Icon = item.icon;
            // Only mark as active if pathname exactly matches
            // For dashboard routes (like /admin, /manager, /field), only match exact path
            // For other routes, match exact path or direct child (one level deep)
            const isDashboardRoute = item.href === "/admin" || item.href === "/manager" || item.href === "/field";
            const isActive = isDashboardRoute
              ? pathname === item.href
              : pathname === item.href || 
                (pathname.startsWith(item.href + "/") && 
                 pathname.split("/").length === item.href.split("/").length + 1);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-300",
                  isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className={cn(
          "border-t transition-all duration-300",
          isCollapsed ? "p-2" : "p-4"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed ? "justify-center" : "gap-3"
          )}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <UserCircle className="h-5 w-5 text-primary" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session?.user?.name || session?.user?.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {session?.user?.role?.toLowerCase()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
