"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

interface RedLightToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function RedLightToggle({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  description,
  icon,
  className,
}: RedLightToggleProps) {
  const trackWidth = 80;
  const thumbSize = 32;
  const padding = 4;
  const maxX = trackWidth - thumbSize - padding * 2;

  const x = useMotionValue(checked ? maxX : 0);
  const background = useTransform(
    x,
    [0, maxX],
    ["rgb(239 68 68)", "rgb(34 197 94)"] // red-500 to green-500
  );

  // Update position when checked prop changes
  React.useEffect(() => {
    x.set(checked ? maxX : 0);
  }, [checked, maxX, x]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;
    
    const threshold = maxX / 2;
    const currentX = x.get();
    
    // Determine final state based on position and velocity
    if (info.velocity.x > 200) {
      // Fast swipe right = YES
      onCheckedChange(true);
    } else if (info.velocity.x < -200) {
      // Fast swipe left = NO
      onCheckedChange(false);
    } else if (currentX > threshold) {
      // Past halfway = YES
      onCheckedChange(true);
    } else {
      // Before halfway = NO
      onCheckedChange(false);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    onCheckedChange(!checked);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl transition-colors",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        checked ? "bg-green-50" : "bg-slate-50 hover:bg-slate-100",
        className
      )}
    >
      {/* Icon */}
      {icon && (
        <div
          className={cn(
            "shrink-0 h-10 w-10 rounded-lg flex items-center justify-center",
            checked ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-500"
          )}
        >
          {icon}
        </div>
      )}

      {/* Label & Description */}
      {(label || description) && (
        <div className="flex-1 min-w-0" onClick={handleClick}>
          {label && (
            <p
              className={cn(
                "font-medium",
                checked ? "text-green-900" : "text-slate-700"
              )}
            >
              {label}
            </p>
          )}
          {description && (
            <p className="text-sm text-slate-500 truncate">{description}</p>
          )}
        </div>
      )}

      {/* Toggle Track */}
      <motion.div
        className={cn(
          "relative shrink-0 rounded-full overflow-hidden",
          disabled && "pointer-events-none"
        )}
        style={{
          width: trackWidth,
          height: thumbSize + padding * 2,
          backgroundColor: background,
        }}
        onClick={handleClick}
      >
        {/* Labels inside track */}
        <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none">
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wide transition-opacity",
              checked ? "opacity-100 text-green-50" : "opacity-0"
            )}
          >
            YES
          </span>
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wide transition-opacity",
              !checked ? "opacity-100 text-red-50" : "opacity-0"
            )}
          >
            NO
          </span>
        </div>

        {/* Thumb */}
        <motion.div
          className={cn(
            "absolute top-1 rounded-full bg-white shadow-lg flex items-center justify-center",
            "touch-none select-none"
          )}
          style={{
            width: thumbSize,
            height: thumbSize,
            x,
            left: padding,
          }}
          drag="x"
          dragConstraints={{ left: 0, right: maxX }}
          dragElastic={0}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          whileTap={{ scale: 1.05 }}
        >
          {/* Checkmark or X inside thumb */}
          <motion.svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ color: checked ? "#22c55e" : "#ef4444" }}
          >
            {checked ? (
              <motion.path
                d="M5 12l5 5L20 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.2 }}
              />
            ) : (
              <>
                <motion.path
                  d="M18 6L6 18"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.15 }}
                />
                <motion.path
                  d="M6 6l12 12"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.15 }}
                />
              </>
            )}
          </motion.svg>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Compact version for inline use
export function RedLightToggleCompact({
  checked,
  onCheckedChange,
  disabled = false,
}: Omit<RedLightToggleProps, "label" | "description" | "icon" | "className">) {
  const trackWidth = 64;
  const thumbSize = 24;
  const padding = 3;
  const maxX = trackWidth - thumbSize - padding * 2;

  const x = useMotionValue(checked ? maxX : 0);
  const background = useTransform(
    x,
    [0, maxX],
    ["rgb(239 68 68)", "rgb(34 197 94)"]
  );

  React.useEffect(() => {
    x.set(checked ? maxX : 0);
  }, [checked, maxX, x]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;
    const threshold = maxX / 2;
    const currentX = x.get();
    
    if (info.velocity.x > 200) {
      onCheckedChange(true);
    } else if (info.velocity.x < -200) {
      onCheckedChange(false);
    } else if (currentX > threshold) {
      onCheckedChange(true);
    } else {
      onCheckedChange(false);
    }
  };

  return (
    <motion.div
      className={cn(
        "relative shrink-0 rounded-full overflow-hidden",
        disabled && "opacity-50 pointer-events-none"
      )}
      style={{
        width: trackWidth,
        height: thumbSize + padding * 2,
        backgroundColor: background,
      }}
      onClick={() => !disabled && onCheckedChange(!checked)}
    >
      <motion.div
        className="absolute top-[3px] rounded-full bg-white shadow-md touch-none select-none"
        style={{
          width: thumbSize,
          height: thumbSize,
          x,
          left: padding,
        }}
        drag="x"
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 1.05 }}
      />
    </motion.div>
  );
}
