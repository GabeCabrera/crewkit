"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { FloatingNav } from "./floating-nav";
import { HamburgerMenu } from "./hamburger-menu";
import { SidebarProvider } from "./sidebar";

// Routes that need full-bleed rendering (no navbar, no sidebar, no max-width wrapper)
// These pages have their own complete layout
const FULL_BLEED_ROUTES = [
  /^\/admin\/jobs\/[^/]+$/, // /admin/jobs/[id]
  /^\/manager\/jobs\/[^/]+$/, // /manager/jobs/[id]
  /^\/field\/[^/]+$/, // /field/[jobId]
];

function isFullBleedRoute(pathname: string): boolean {
  return FULL_BLEED_ROUTES.some((pattern) => pattern.test(pathname));
}

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Full-bleed routes render children directly - they have their own layout
  if (isFullBleedRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      {/* Fixed viewport layout - no window scrollbar */}
      <div className="h-screen overflow-hidden flex flex-col bg-gray-50/50">
        <Navbar />
        <main className="flex-1 min-h-0 overflow-auto lg:ml-[var(--sidebar-width)] transition-all duration-300">
          <div className="mx-auto max-w-7xl page-container">
            {children}
          </div>
        </main>
        <FloatingNav isOpen={isNavOpen} onOpenChange={setIsNavOpen} />
        <HamburgerMenu isVisible={isNavOpen} onClose={() => setIsNavOpen(false)} />
      </div>
    </SidebarProvider>
  );
}
