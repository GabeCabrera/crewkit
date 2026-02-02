"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResizablePanelGroupProps {
  children: React.ReactNode;
  direction?: "horizontal" | "vertical";
  className?: string;
  onLayout?: (sizes: number[]) => void;
}

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  className?: string;
}

interface ResizableHandleProps {
  className?: string;
  withHandle?: boolean;
}

const ResizableContext = React.createContext<{
  direction: "horizontal" | "vertical";
  sizes: number[];
  setSizes: React.Dispatch<React.SetStateAction<number[]>>;
  registerPanel: (index: number, defaultSize: number, minSize: number, maxSize: number) => void;
  panelCount: number;
} | null>(null);

export function ResizablePanelGroup({
  children,
  direction = "horizontal",
  className,
  onLayout,
}: ResizablePanelGroupProps) {
  const [sizes, setSizes] = React.useState<number[]>([]);
  const [panelConfigs, setPanelConfigs] = React.useState<Array<{
    defaultSize: number;
    minSize: number;
    maxSize: number;
  }>>([]);
  const panelCount = React.useRef(0);

  const registerPanel = React.useCallback(
    (index: number, defaultSize: number, minSize: number, maxSize: number) => {
      setPanelConfigs((prev) => {
        const next = [...prev];
        next[index] = { defaultSize, minSize, maxSize };
        return next;
      });
    },
    []
  );

  // Initialize sizes when panels register
  React.useEffect(() => {
    if (panelConfigs.length > 0 && sizes.length === 0) {
      const initialSizes = panelConfigs.map((c) => c?.defaultSize || 50);
      setSizes(initialSizes);
    }
  }, [panelConfigs, sizes.length]);

  // Notify parent of layout changes
  React.useEffect(() => {
    if (sizes.length > 0 && onLayout) {
      onLayout(sizes);
    }
  }, [sizes, onLayout]);

  // Count children to determine panel count
  React.useEffect(() => {
    let count = 0;
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === ResizablePanel) {
        count++;
      }
    });
    panelCount.current = count;
  }, [children]);

  return (
    <ResizableContext.Provider
      value={{
        direction,
        sizes,
        setSizes,
        registerPanel,
        panelCount: panelCount.current,
      }}
    >
      <div
        className={cn(
          "flex h-full w-full",
          direction === "horizontal" ? "flex-row" : "flex-col",
          className
        )}
      >
        {children}
      </div>
    </ResizableContext.Provider>
  );
}

export function ResizablePanel({
  children,
  defaultSize = 50,
  minSize = 10,
  maxSize = 90,
  className,
}: ResizablePanelProps) {
  const context = React.useContext(ResizableContext);
  const indexRef = React.useRef(-1);

  // Register this panel
  React.useEffect(() => {
    if (context && indexRef.current === -1) {
      indexRef.current = context.sizes.length;
      context.registerPanel(indexRef.current, defaultSize, minSize, maxSize);
    }
  }, [context, defaultSize, minSize, maxSize]);

  const size = context?.sizes[indexRef.current] ?? defaultSize;
  const isHorizontal = context?.direction === "horizontal";

  return (
    <div
      className={cn("overflow-hidden", className)}
      style={{
        [isHorizontal ? "width" : "height"]: `${size}%`,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

export function ResizableHandle({
  className,
  withHandle = true,
}: ResizableHandleProps) {
  const context = React.useContext(ResizableContext);
  const handleRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);
  const startPos = React.useRef(0);
  const startSizes = React.useRef<number[]>([]);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (!context) return;
      e.preventDefault();
      isDragging.current = true;
      startPos.current = context.direction === "horizontal" ? e.clientX : e.clientY;
      startSizes.current = [...context.sizes];
      document.body.style.cursor = context.direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [context]
  );

  React.useEffect(() => {
    if (!context) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !handleRef.current) return;

      const container = handleRef.current.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerSize =
        context.direction === "horizontal" ? containerRect.width : containerRect.height;
      const currentPos = context.direction === "horizontal" ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      const deltaPercent = (delta / containerSize) * 100;

      // Calculate new sizes (only handling 2 panels for simplicity)
      const newSize0 = Math.max(10, Math.min(90, startSizes.current[0] + deltaPercent));
      const newSize1 = 100 - newSize0;

      if (newSize1 >= 10 && newSize1 <= 90) {
        context.setSizes([newSize0, newSize1]);
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [context]);

  const isHorizontal = context?.direction === "horizontal";

  return (
    <div
      ref={handleRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "relative flex items-center justify-center bg-border",
        isHorizontal
          ? "w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30"
          : "h-1 cursor-row-resize hover:bg-primary/20 active:bg-primary/30",
        "transition-colors",
        className
      )}
    >
      {withHandle && (
        <div
          className={cn(
            "z-10 flex items-center justify-center rounded-sm border bg-border",
            isHorizontal ? "h-6 w-3" : "h-3 w-6"
          )}
        >
          <GripVertical
            className={cn(
              "h-3 w-3 text-muted-foreground",
              !isHorizontal && "rotate-90"
            )}
          />
        </div>
      )}
    </div>
  );
}
