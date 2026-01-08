"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Layers, AlertTriangle, DollarSign, Clock, CheckCircle } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

interface StatsCardsProps {
  stats: {
    totalEquipment: number;
    totalAssemblies: number;
    approvedAssemblies: number;
    pendingAssemblies: number;
    lowStockItems: number;
    totalInventoryValue: number;
  };
  hideValue?: boolean; // Hide inventory value card (for field role)
}

function AnimatedNumber({ value, duration = 500 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(startValue + (endValue - startValue) * easeOutQuart);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <>{displayValue.toLocaleString()}</>;
}

function AnimatedCurrency({ value, duration = 500 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (endValue - startValue) * easeOutQuart;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <>{formatCurrency(displayValue)}</>;
}

export function StatsCards({ stats, hideValue = false }: StatsCardsProps) {
  const allCards = [
    {
      label: "Total Equipment",
      shortLabel: "Equipment",
      value: stats.totalEquipment,
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      priority: 1, // Always visible
    },
    {
      label: "Total Assemblies",
      shortLabel: "Assemblies",
      value: stats.totalAssemblies,
      icon: Layers,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      priority: 1,
    },
    {
      label: "Approved",
      shortLabel: "Approved",
      value: stats.approvedAssemblies,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      priority: 2, // Visible on tablet+
    },
    {
      label: "Pending Approval",
      shortLabel: "Pending",
      value: stats.pendingAssemblies,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      priority: 2,
    },
    {
      label: "Low Stock Items",
      shortLabel: "Low Stock",
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: stats.lowStockItems > 0 ? "text-red-600" : "text-gray-500",
      bgColor: stats.lowStockItems > 0 ? "bg-red-50" : "bg-gray-50",
      priority: 1,
    },
    {
      id: "inventoryValue",
      label: "Inventory Value",
      shortLabel: "Value",
      value: stats.totalInventoryValue,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      isCurrency: true,
      priority: 3, // Visible on desktop only by default
    },
  ];

  // Filter out inventory value card if hideValue is true
  const cards = hideValue 
    ? allCards.filter(card => card.id !== "inventoryValue")
    : allCards;

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card 
            key={card.label} 
            className={cn(
              "border-0 shadow-sm transition-shadow",
              // Hide lower priority cards on mobile
              card.priority === 3 && "hidden lg:block",
              // Hover effect only on pointer devices
              "hover:shadow-md"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                  card.bgColor
                )}>
                  <Icon className={cn("h-5 w-5", card.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Full label on larger screens, short on mobile */}
                  <p className="text-xs font-medium text-muted-foreground truncate">
                    <span className="sm:hidden">{card.shortLabel}</span>
                    <span className="hidden sm:inline">{card.label}</span>
                  </p>
                  <p className={cn(
                    "text-xl font-bold tabular-nums",
                    card.color
                  )}>
                    {card.isCurrency ? (
                      <AnimatedCurrency value={card.value} />
                    ) : (
                      <AnimatedNumber value={card.value} />
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
