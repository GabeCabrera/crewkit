"use client";

import { usePathname, useRouter } from "next/navigation";
import { X, Home, Package, Layers, Users, Settings, FileText, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

interface FloatingNavProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function FloatingNavSkeleton() {
  return (
    <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 lg:hidden skeleton-fade-in pointer-events-none">
      <Skeleton className="h-16 w-16 rounded-full pointer-events-auto" />
    </div>
  );
}

export function FloatingNav({ isOpen, onOpenChange }: FloatingNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user?.role || "ADMIN";

  const getNavItems = () => {
    let allItems: NavItem[] = [];
    
    switch (role) {
      case "SUPERUSER":
      case "ADMIN":
        allItems = [
          { href: "/admin", icon: Home, label: "Dashboard" },
          { href: "/admin/inventory", icon: Package, label: "Inventory" },
          { href: "/admin/reports", icon: FileText, label: "Reports" },
          { href: "/admin/team-management", icon: Users2, label: "Team Mgmt" },
          { href: "/admin/settings", icon: Settings, label: "Settings" },
        ];
        break;
      case "MANAGER":
        allItems = [
          { href: "/manager", icon: Home, label: "Dashboard" },
          { href: "/manager/inventory", icon: Package, label: "Inventory" },
          { href: "/manager/assemblies", icon: Layers, label: "Assemblies" },
          { href: "/manager/reports", icon: FileText, label: "Reports" },
        ];
        break;
      case "FIELD":
        allItems = [
          { href: "/field", icon: Home, label: "Home" },
          { href: "/field/assemblies", icon: Layers, label: "Assemblies" },
          { href: "/field/inventory", icon: Package, label: "Inventory" },
          { href: "/field/today", icon: FileText, label: "Today" },
        ];
        break;
      default:
        allItems = [];
    }

    // Split into primary (top 3) and secondary (remaining)
    const primaryItems = allItems.slice(0, 3);
    const secondaryItems = allItems.slice(3);
    
    return { primaryItems, secondaryItems };
  };

  const { primaryItems, secondaryItems } = getNavItems();
  const totalItems = primaryItems.length;
  
  const handleToggle = () => {
    onOpenChange(!isOpen);
  };

  const handleClose = () => {
    onOpenChange(false);
  };
  
  // Dynamic positioning that adapts to any number of items
  // Automatically adjusts arc spread, radius, and spacing based on item count
  const getItemPosition = (index: number) => {
    // Button size is 56px (h-14), need at least this much gap between centers
    const buttonSize = 56;
    const minGap = 12; // Minimum gap between buttons
    const minSpacing = buttonSize + minGap;
    
    // Calculate dynamic radius based on item count
    // More items = larger radius to maintain spacing
    // Base radius for 3 items is 110px, scale up for more
    const baseRadius = 110;
    const itemsForBaseRadius = 3;
    
    // For more items, we need a larger radius to fit them in the arc
    // Arc length = radius * angle_in_radians
    // We want: (totalItems - 1) * minSpacing <= arc_length
    // Calculate minimum radius needed for the arc spread
    const arcSpread = Math.min(Math.PI * (2/3) + (totalItems - 3) * 0.15, Math.PI); // Expand arc up to 180°
    const minRadiusForSpacing = totalItems > 1 
      ? ((totalItems - 1) * minSpacing) / arcSpread 
      : baseRadius;
    
    const radius = Math.max(baseRadius, minRadiusForSpacing);
    
    // Dynamic arc angles - expands as more items are added
    // 3 items: 120° arc (-150° to -30°)
    // More items: gradually expand up to 180° arc (-180° to 0°)
    const halfArc = arcSpread / 2;
    const centerAngle = -Math.PI / 2; // -90° (straight up)
    const startAngle = centerAngle - halfArc;
    const endAngle = centerAngle + halfArc;
    const angleRange = endAngle - startAngle;
    
    // Distribute items evenly across the arc
    const angle = totalItems === 1 
      ? centerAngle // Single item goes straight up
      : startAngle + (angleRange / Math.max(1, totalItems - 1)) * index;
    
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    return { x, y };
  };
  
  // Calculate dynamic animation delay based on item count
  // Linear stagger with consistent spacing for smooth sequential reveal
  const getAnimationDelay = (index: number, opening: boolean) => {
    const staggerPerItem = 60; // ms between each item
    
    if (opening) {
      return index * staggerPerItem;
    } else {
      return (totalItems - index - 1) * (staggerPerItem * 0.5);
    }
  };

  const handleItemClick = (href: string) => {
    router.push(href);
    handleClose();
  };

  // Show skeleton while loading
  if (status === "loading") {
    return <FloatingNavSkeleton />;
  }

  return (
    <>
      {/* Backdrop with smooth fade - Mobile only */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-all duration-300 ease-out lg:hidden",
          isOpen 
            ? "backdrop-blur-sm bg-black/5 pointer-events-auto" 
            : "backdrop-blur-none bg-transparent pointer-events-none"
        )}
        onClick={handleClose}
        style={{
          opacity: isOpen ? 1 : 0,
        }}
      />

      {/* Floating Navigation - Mobile only */}
      <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 lg:hidden content-fade-in pointer-events-none">
        <div className="relative pointer-events-auto">
          {/* Primary Navigation Items (Top 3) */}
          {primaryItems.map((item, index) => {
            const Icon = item.icon;
            const { x, y } = getItemPosition(index);
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
              <div
                key={item.href}
                className={cn(
                  "absolute left-1/2 top-1/2",
                  isOpen ? "" : "pointer-events-none"
                )}
                style={{
                  transform: isOpen
                    ? `translate(calc(${x}px - 50%), calc(${y}px - 50%))`
                    : "translate(-50%, -50%)",
                  opacity: isOpen ? 1 : 0,
                  scale: isOpen ? 1 : 0.6,
                  transitionProperty: "transform, opacity, scale",
                  transitionDuration: isOpen ? "450ms" : "200ms",
                  transitionTimingFunction: isOpen 
                    ? "cubic-bezier(0.22, 1, 0.36, 1)"  // Smooth ease-out-quint
                    : "cubic-bezier(0.4, 0, 0.6, 1)",
                  transitionDelay: `${getAnimationDelay(index, isOpen)}ms`,
                }}
              >
                <button
                  onClick={() => handleItemClick(item.href)}
                  className={cn(
                    "group relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all",
                    "bg-white border-2 hover:scale-110 active:scale-95",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-primary/20"
                      : "border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md"
                  )}
                  aria-label={item.label}
                  title={item.label}
                >
                  <Icon className="h-6 w-6" />
                </button>
              </div>
            );
          })}

          {/* Main FAB Button */}
          <button
            onClick={handleToggle}
            className={cn(
              "relative flex h-16 w-16 items-center justify-center rounded-full shadow-2xl",
              "bg-primary text-primary-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "hover:shadow-primary/30 active:scale-95"
            )}
            style={{
              transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
              transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms ease",
            }}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            <div className="relative h-7 w-7">
              <Home 
                className="absolute inset-0 h-7 w-7"
                style={{
                  opacity: isOpen ? 0 : 1,
                  scale: isOpen ? 0.7 : 1,
                  transition: "opacity 200ms ease, scale 200ms ease",
                }}
              />
              <X 
                className="absolute inset-0 h-7 w-7"
                style={{
                  opacity: isOpen ? 1 : 0,
                  scale: isOpen ? 1 : 0.7,
                  transition: "opacity 200ms ease, scale 200ms ease",
                }}
              />
            </div>
          </button>
        </div>
      </div>
    </>
  );
}

// Export types and secondary items getter for hamburger menu
export function getSecondaryNavItems(role: string): NavItem[] {
  let allItems: NavItem[] = [];
  
  switch (role) {
    case "SUPERUSER":
    case "ADMIN":
      allItems = [
        { href: "/admin", icon: Home, label: "Dashboard" },
        { href: "/admin/inventory", icon: Package, label: "Inventory" },
        { href: "/admin/reports", icon: FileText, label: "Reports" },
        { href: "/admin/team-management", icon: Users2, label: "Team Management" },
        { href: "/admin/settings", icon: Settings, label: "Settings" },
      ];
      break;
    case "MANAGER":
      allItems = [
        { href: "/manager", icon: Home, label: "Dashboard" },
        { href: "/manager/inventory", icon: Package, label: "Inventory" },
        { href: "/manager/assemblies", icon: Layers, label: "Assemblies" },
        { href: "/manager/reports", icon: FileText, label: "Reports" },
      ];
      break;
    case "FIELD":
      allItems = [
        { href: "/field", icon: Home, label: "Home" },
        { href: "/field/assemblies", icon: Layers, label: "Assemblies" },
        { href: "/field/inventory", icon: Package, label: "Inventory" },
        { href: "/field/today", icon: FileText, label: "Today" },
      ];
      break;
    default:
      allItems = [];
  }

  // Return only secondary items (items after the first 3)
  return allItems.slice(3);
}

export type { NavItem };

