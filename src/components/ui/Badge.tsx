import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type BadgeVariant =
  | "lime-solid"
  | "lime-tint"
  | "cyan-solid"
  | "cyan-tint"
  | "amber-solid"
  | "amber-tint"
  | "gold-solid"
  | "gold-tint"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "lime-solid",
  children,
  ...props
}: BadgeProps) {
  const base =
    "inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase rounded-md px-2 py-0.5 select-none";
  const variants: Record<BadgeVariant, string> = {
    "lime-solid":
      "bg-primary-lime text-on-primary [&_svg]:stroke-current [&_svg]:text-on-primary",
    "lime-tint": "bg-primary-lime/10 text-primary-lime border border-primary-lime/30",
    "cyan-solid":
      "bg-secondary-cyan text-on-primary [&_svg]:stroke-current [&_svg]:text-on-primary",
    "cyan-tint":
      "bg-secondary-cyan/15 text-secondary-cyan border border-secondary-cyan/30",
    "amber-solid":
      "bg-amber-400 text-on-primary [&_svg]:stroke-current [&_svg]:text-on-primary",
    "amber-tint": "bg-amber-400/15 text-amber-400 border border-amber-400/30",
    "gold-solid":
      "bg-rank-gold text-on-primary [&_svg]:stroke-current [&_svg]:text-on-primary",
    "gold-tint": "bg-rank-gold/10 text-rank-gold border border-rank-gold/30",
    neutral:
      "bg-surface-container-high text-text-muted border border-border-subtle",
  };
  return (
    <span className={cn(base, variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
