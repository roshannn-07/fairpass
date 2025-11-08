// File: src/components/ui/scroll-area.tsx (TEMPORARY WORKAROUND)
"use client"

import * as React from "react";
import { cn } from "@/lib/utils";

// MOCK ScrollBar for temporary fix
const ScrollBar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("h-1 w-full bg-gray-700/50", className)} {...props} />
  )
)
ScrollBar.displayName = "ScrollBar";

// MOCK ScrollArea for temporary fix - renders as a simple div
const ScrollArea = React.forwardRef<
  HTMLDivElement, 
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("relative overflow-y-auto rounded-md border border-gray-700", className)} 
    style={{ maxHeight: '400px' }}
    {...props}
  >
    {children}
  </div>
));
ScrollArea.displayName = "ScrollArea";

// EXPORT
export { ScrollArea, ScrollBar }