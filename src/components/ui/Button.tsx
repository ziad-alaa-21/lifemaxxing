import React, { forwardRef } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "cyan"
  | "amber"
  | "indigo"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-mono font-bold tracking-wider uppercase transition-all select-none cursor-pointer";

    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        "bg-primary-lime text-on-primary hover:bg-primary-lime-dim shadow-xs [&_svg]:stroke-current [&_svg]:text-on-primary disabled:bg-surface-container-high disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed",
      secondary:
        "bg-surface-container hover:bg-surface-container-high text-on-surface border border-border-subtle shadow-xs [&_svg]:stroke-current disabled:bg-surface-container-low disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed",
      cyan:
        "bg-secondary-cyan text-on-primary hover:brightness-110 shadow-xs [&_svg]:stroke-current [&_svg]:text-on-primary disabled:bg-surface-container-high disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed",
      amber:
        "bg-amber-400 text-on-primary hover:bg-amber-500 shadow-xs [&_svg]:stroke-current [&_svg]:text-on-primary disabled:bg-surface-container-high disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed",
      indigo:
        "bg-indigo-500 text-white hover:bg-indigo-400 shadow-xs [&_svg]:stroke-current [&_svg]:text-white disabled:bg-surface-container-high disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed",
      outline:
        "bg-transparent border border-border-subtle hover:border-border-medium hover:bg-surface-container text-on-surface [&_svg]:stroke-current disabled:opacity-50 disabled:cursor-not-allowed",
      ghost:
        "bg-transparent hover:bg-surface-container-high text-text-muted hover:text-on-surface [&_svg]:stroke-current disabled:opacity-50 disabled:cursor-not-allowed",
      danger:
        "bg-crimson-alert text-white hover:brightness-110 shadow-xs [&_svg]:stroke-current disabled:bg-surface-container-high disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed",
    };

    const sizeClasses: Record<ButtonSize, string> = {
      xs: "text-[10px] px-2.5 py-1 rounded-lg gap-1.5",
      sm: "text-xs px-3.5 py-1.5 rounded-xl gap-2",
      md: "text-xs px-4 py-2 rounded-xl gap-2",
      lg: "text-sm px-5 py-2.5 rounded-2xl gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
