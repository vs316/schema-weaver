import React from "react";
import { cn } from "./cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: React.ReactNode;
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, iconLeft, invalid, ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      className={cn(
        "w-full bg-input text-foreground placeholder:text-muted-foreground",
        "rounded-md border border-border h-[var(--control-h)] px-[var(--space-3)] text-sm",
        "transition-smooth outline-none focus:border-primary focus:ring-2 focus:ring-primary/25",
        invalid && "border-destructive focus:border-destructive focus:ring-destructive/25",
        iconLeft && "pl-9",
        className,
      )}
      {...props}
    />
  );

  if (!iconLeft) return field;

  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {iconLeft}
      </span>
      {field}
    </div>
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full bg-input text-foreground placeholder:text-muted-foreground",
          "rounded-md border border-border px-[var(--space-3)] py-[var(--space-2)] text-sm",
          "transition-smooth outline-none focus:border-primary focus:ring-2 focus:ring-primary/25",
          className,
        )}
        {...props}
      />
    );
  },
);
