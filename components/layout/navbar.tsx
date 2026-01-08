"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sidebar } from "./sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

function NavbarSkeleton() {
  return (
    <nav className="sticky top-0 z-40 border-b bg-white lg:ml-[var(--sidebar-width)] transition-all duration-300">
      <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-12 hidden md:block" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    </nav>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [companyName, setCompanyName] = useState("CrewKit");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.companyName) {
          setCompanyName(data.companyName);
        }
      })
      .catch(console.error);
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  if (status === "loading") {
    return (
      <>
        <Sidebar />
        <NavbarSkeleton />
      </>
    );
  }

  // Get first name or username for compact display
  const displayName = session?.user?.name || session?.user?.email || "User";
  const shortName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Sidebar />
      <nav className="sticky top-0 z-40 border-b bg-white lg:ml-[var(--sidebar-width)] transition-all duration-300">
        <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
          {/* Left section */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-bold">{companyName}</h1>
            <span className="hidden md:inline-block text-sm text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded-md">
              {session?.user?.role?.toLowerCase()}
            </span>
          </div>
          
          {/* Right section */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 h-9 px-2 md:px-3"
                >
                  {/* Avatar circle for mobile */}
                  <div className="flex h-7 w-7 md:hidden items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {initials}
                  </div>
                  {/* Full name for desktop */}
                  <span className="hidden md:inline text-sm">
                    {displayName}
                  </span>
                  {/* Short name for tablet */}
                  <span className="hidden sm:inline md:hidden text-sm">
                    {shortName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {session?.user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize md:hidden">
                      Role: {session?.user?.role?.toLowerCase()}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    </>
  );
}
