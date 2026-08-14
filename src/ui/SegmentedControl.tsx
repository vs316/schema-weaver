import React from "react";
import { cn } from "./cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  hint?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  fullWidth,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex rounded-md border border-border bg-muted p-0.5",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-[6px] px-3 py-1.5 text-xs font-medium transition-smooth",
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      {(label || description) && (
        <span className="space-y-0.5">
          {label && <span className="block text-sm font-medium text-foreground">{label}</span>}
          {description && <span className="block text-xs text-muted-foreground">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-smooth",
          checked ? "border-primary bg-primary" : "border-border bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-surface shadow-sm transition-smooth",
            checked ? "left-[18px]" : "left-[2px]",
          )}
        />
      </button>
    </label>
  );
}
