"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cable, MapPin, Wrench, TrendingUp } from "lucide-react";

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  color?: "orange" | "blue" | "emerald" | "purple" | "cyan";
  showValue?: boolean;
  unit?: string;
}

const barColors = {
  orange: "bg-orange-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  purple: "bg-purple-500",
  cyan: "bg-cyan-500",
};

export function ProgressBar({
  label,
  value,
  max = 100,
  color = "orange",
  showValue = true,
  unit = "",
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const formattedValue = new Intl.NumberFormat("en-US").format(value);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        {showValue && (
          <span className="text-slate-500 font-mono">
            {formattedValue}
            {unit && <span className="text-xs ml-0.5">{unit}</span>}
          </span>
        )}
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface MetricBreakdownProps {
  title: string;
  icon: React.ReactNode;
  metrics: Array<{ label: string; value: number; unit?: string }>;
  color?: "orange" | "blue" | "purple";
}

const sectionColors = {
  orange: {
    header: "text-orange-600",
    bg: "bg-orange-50",
    iconBg: "bg-orange-100",
  },
  blue: {
    header: "text-blue-600",
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
  },
  purple: {
    header: "text-purple-600",
    bg: "bg-purple-50",
    iconBg: "bg-purple-100",
  },
};

export function MetricBreakdown({ title, icon, metrics, color = "orange" }: MetricBreakdownProps) {
  const colors = sectionColors[color];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className={cn("text-base flex items-center gap-2", colors.header)}>
          <span className={cn("p-1.5 rounded-lg", colors.iconBg)}>{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric, i) => (
            <div key={i} className={cn("rounded-lg p-3 text-center", colors.bg)}>
              <p className="text-xl font-bold">
                {new Intl.NumberFormat("en-US").format(metric.value)}
                {metric.unit && <span className="text-sm font-normal ml-1">{metric.unit}</span>}
              </p>
              <p className="text-xs font-medium opacity-70">{metric.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Mini trend chart using simple bars
interface TrendChartProps {
  data: Array<{ month: string; value: number }>;
  label: string;
  color?: "orange" | "blue" | "emerald" | "purple" | "cyan" | "slate" | "rose";
}

const trendColors = {
  orange: "bg-orange-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  purple: "bg-purple-500",
  cyan: "bg-cyan-500",
  slate: "bg-slate-500",
  rose: "bg-rose-500",
};

export function MiniTrendChart({ data, label, color = "orange" }: TrendChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <div className="flex items-end gap-1.5 h-16">
        {data.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-slate-100 rounded-sm overflow-hidden h-full flex items-end">
              <div
                className={cn("w-full rounded-sm transition-all duration-500", trendColors[color])}
                style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: item.value > 0 ? 4 : 0 }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">{item.month.slice(0, 3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Aerial work section
export function AerialMetrics({
  strandHung,
  fiberLashed,
  fiberPulled,
  polesAttached,
}: {
  strandHung: number;
  fiberLashed: number;
  fiberPulled: number;
  polesAttached: number;
}) {
  return (
    <MetricBreakdown
      title="Aerial Work"
      icon={<Cable className="h-4 w-4" />}
      color="orange"
      metrics={[
        { label: "Strand Hung", value: strandHung, unit: "ft" },
        { label: "Fiber Lashed", value: fiberLashed, unit: "ft" },
        { label: "Fiber Pulled", value: fiberPulled, unit: "ft" },
        { label: "Poles Attached", value: polesAttached },
      ]}
    />
  );
}

// Underground work section
export function UndergroundMetrics({
  drilled,
  plowed,
}: {
  drilled: number;
  plowed: number;
}) {
  return (
    <MetricBreakdown
      title="Underground"
      icon={<MapPin className="h-4 w-4" />}
      color="blue"
      metrics={[
        { label: "Drilled", value: drilled, unit: "ft" },
        { label: "Plowed", value: plowed, unit: "ft" },
      ]}
    />
  );
}

// Infrastructure section
export function InfrastructureMetrics({
  msts,
  risers,
  spliceCases,
  handholes,
  vaults,
  guys,
  slackLoops,
}: {
  msts: number;
  risers: number;
  spliceCases: number;
  handholes: number;
  vaults: number;
  guys: number;
  slackLoops: number;
}) {
  return (
    <MetricBreakdown
      title="Infrastructure"
      icon={<Wrench className="h-4 w-4" />}
      color="purple"
      metrics={[
        { label: "MSTs", value: msts },
        { label: "Risers", value: risers },
        { label: "Splice Cases", value: spliceCases },
        { label: "Handholes", value: handholes },
        { label: "Vaults", value: vaults },
        { label: "Guys/Anchors", value: guys },
        { label: "Slack Loops", value: slackLoops },
      ]}
    />
  );
}

