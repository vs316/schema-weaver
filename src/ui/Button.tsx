import React from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "subtle";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:brightness-110 active:brightness-95 shadow-sm",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-accent border border-border",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-accent hover:border-border-strong",
  ghost: "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
  subtle: "bg-muted text-foreground hover:bg-accent",
  danger: "bg-destructive text-destructive-foreground hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-[var(--control-h-sm)] px-[var(--space-2)] text-xs gap-1.5",
  md: "h-[var(--control-h)] px-[var(--space-3)] text-sm gap-2",
  lg: "h-[calc(var(--control-h)*1.2)] px-[var(--space-4)] text-sm gap-2",
  icon: "h-[var(--control-h)] w-[var(--control-h)] justify-center",
  "icon-sm": "h-[var(--control-h-sm)] w-[var(--control-h-sm)] justify-center",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", loading, iconLeft, iconRight, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center rounded-md font-medium select-none transition-smooth",
        "disabled:opacity-50 disabled:pointer-events-none",
        "active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        iconLeft
      )}
      {children}
      {iconRight}
    </button>
  );
});
