import React from "react";
import { cn, DESIGN_TOKENS, type DomainKey } from "@/lib/design/tokens";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hero" | "subtle";
  domain?: DomainKey;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  className,
  variant = "default",
  domain = "body",
  padding = "md",
  children,
  ...props
}: CardProps) {
  const paddingClasses = {
    none: "p-0",
    sm: "p-4",
    md: "p-5 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  const variantClasses =
    variant === "hero"
      ? cn(
          DESIGN_TOKENS.domains[domain].gradientClass,
          "rounded-[20px] shadow-[0_8px_24px_rgba(40,50,120,0.08)]"
        )
      : variant === "subtle"
      ? "bg-[#F0F3FF] border border-[#E3E5F0] rounded-[20px]"
      : "bg-white border border-[#E3E5F0] rounded-[20px] shadow-[0_8px_24px_rgba(40,50,120,0.08)]";

  return (
    <div
      className={cn(variantClasses, paddingClasses[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}
