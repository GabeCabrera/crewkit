"use client";

import { useState } from "react";
import { Navbar } from "./navbar";
import { FloatingNav } from "./floating-nav";
import { HamburgerMenu } from "./hamburger-menu";
import { SidebarProvider } from "./sidebar";

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50/50">
        <Navbar />
        <main className="lg:ml-[var(--sidebar-width)] transition-all duration-300">
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
