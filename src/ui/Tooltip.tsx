import React, { useState } from "react";
import { cn } from "./cn";

export function Tooltip({
  label,
  side = "right",
  shortcut,
  children,
}: {
  label: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  shortcut?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const pos = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[side];

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-[120] whitespace-nowrap rounded-md border border-border",
            "bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-md animate-fade-in",
            pos,
          )}
        >
          {label}
          {shortcut && (
            <span className="ml-1.5 rounded border border-border bg-muted px-1 text-[10px] text-muted-foreground">
              {shortcut}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
