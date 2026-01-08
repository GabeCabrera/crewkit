"use client";

import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus, LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: number; // Percentage change
  icon?: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning" | "info" | "dark";
  size?: "default" | "large";
  className?: string;
}

const variants = {
  default: "bg-white border border-slate-100",
  primary: "bg-gradient-to-br from-orange-500 to-orange-600 text-white",
  success: "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white",
  warning: "bg-gradient-to-br from-orange-400 to-orange-500 text-white",
  info: "bg-gradient-to-br from-blue-500 to-blue-600 text-white",
  dark: "bg-gradient-to-br from-slate-900 to-slate-800 text-white",
};

const textColors = {
  default: { title: "text-slate-500", value: "text-slate-900", subtitle: "text-slate-500" },
  primary: { title: "text-orange-100", value: "text-white", subtitle: "text-orange-200" },
  success: { title: "text-emerald-100", value: "text-white", subtitle: "text-emerald-200" },
  warning: { title: "text-orange-100", value: "text-white", subtitle: "text-orange-200" },
  info: { title: "text-blue-100", value: "text-white", subtitle: "text-blue-200" },
  dark: { title: "text-slate-300", value: "text-white", subtitle: "text-slate-400" },
};

const iconColors = {
  default: "text-slate-400",
  primary: "text-orange-200",
  success: "text-emerald-300",
  warning: "text-orange-200",
  info: "text-blue-200",
  dark: "text-slate-500",
};

export function MetricCard({
  title,
  value,
  subtitle,
  delta,
  icon: Icon,
  variant = "default",
  size = "default",
  className,
}: MetricCardProps) {
  const colors = textColors[variant];
  
  const getDeltaColor = () => {
    if (variant !== "default") {
      return delta && delta > 0 ? "text-white/90" : delta && delta < 0 ? "text-white/70" : "text-white/60";
    }
    return delta && delta > 0 ? "text-emerald-600" : delta && delta < 0 ? "text-red-500" : "text-slate-400";
  };

  const getDeltaIcon = () => {
    if (!delta || delta === 0) return <Minus className="h-3 w-3" />;
    return delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />;
  };

  return (
    <div
      className={cn(
        "rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md",
        variants[variant],
        size === "large" && "p-6",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs sm:text-sm font-medium", colors.title)}>{title}</p>
          <p
            className={cn(
              "font-bold mt-1",
              colors.value,
              size === "large" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
            )}
          >
            {typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : value}
          </p>
          {(subtitle || delta !== undefined) && (
            <div className="flex items-center gap-2 mt-1.5">
              {delta !== undefined && (
                <span className={cn("flex items-center gap-0.5 text-xs font-medium", getDeltaColor())}>
                  {getDeltaIcon()}
                  {Math.abs(delta).toFixed(1)}%
                </span>
              )}
              {subtitle && (
                <span className={cn("text-xs truncate", colors.subtitle)}>
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("shrink-0 ml-3", iconColors[variant])}>
            <Icon className={cn(size === "large" ? "h-10 w-10" : "h-8 w-8")} />
          </div>
        )}
      </div>
    </div>
  );
}

// Compact metric for grids
interface CompactMetricProps {
  label: string;
  value: string | number;
  color?: "orange" | "blue" | "purple" | "emerald" | "cyan" | "amber" | "rose" | "slate";
}

const compactColors = {
  orange: "bg-orange-50 text-orange-700",
  blue: "bg-blue-50 text-blue-700",
  purple: "bg-purple-50 text-purple-700",
  emerald: "bg-emerald-50 text-emerald-700",
  cyan: "bg-cyan-50 text-cyan-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  slate: "bg-slate-50 text-slate-700",
};

export function CompactMetric({ label, value, color = "slate" }: CompactMetricProps) {
  return (
    <div className={cn("rounded-xl p-3 text-center", compactColors[color])}>
      <p className="text-lg font-bold">
        {typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : value}
      </p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}

