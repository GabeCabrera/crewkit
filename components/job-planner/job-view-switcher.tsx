"use client";

import { Calendar, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "calendar";

interface JobViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

const views = [
  { id: "list" as const, label: "List", icon: List },
  { id: "calendar" as const, label: "Calendar", icon: Calendar },
];

export function JobViewSwitcher({ currentView, onViewChange }: JobViewSwitcherProps) {
  return (
    <div className="inline-flex items-center rounded-lg bg-slate-100 p-1 gap-0.5">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.id;
        
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
