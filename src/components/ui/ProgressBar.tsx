import React from "react";
import { cn, DESIGN_TOKENS, type DomainKey } from "@/lib/design/tokens";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  domain?: DomainKey;
  size?: "sm" | "md";
}

export function ProgressBar({
  value,
  max = 100,
  domain = "body",
  size = "sm",
  className,
  ...props
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div
      className={cn(
        "w-full bg-[#ECEEFA] rounded-full overflow-hidden",
        size === "sm" ? "h-2" : "h-3",
        className
      )}
      {...props}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-300", DESIGN_TOKENS.domains[domain].barGradientClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
