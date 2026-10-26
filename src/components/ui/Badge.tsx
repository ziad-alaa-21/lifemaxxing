import React from "react";
import { cn } from "@/lib/design/tokens";

export type BadgeVariant =
  | "body"
  | "mind"
  | "school"
  | "record"
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
  variant = "neutral",
  children,
  ...props
}: BadgeProps) {
  const base =
    "inline-flex items-center gap-1 font-sans text-[12px] leading-[16px] font-medium rounded-full px-3 py-1 select-none";
  const variants: Record<BadgeVariant, string> = {
    body: "bg-[#E6EEFF] text-[#1E3A9E]",
    mind: "bg-[#F1E8FF] text-[#5B21B6]",
    school: "bg-[#FDE7F1] text-[#9D174D]",
    record: "bg-[#F5B301] text-[#4A3400]",
    "lime-solid": "bg-[#14161A] text-white [&_svg]:stroke-current [&_svg]:text-white",
    "lime-tint": "bg-[#F1E8FF] text-[#5B21B6]",
    "cyan-solid": "bg-[#E6EEFF] text-[#1E3A9E] [&_svg]:stroke-current [&_svg]:text-[#1E3A9E]",
    "cyan-tint": "bg-[#E6EEFF] text-[#1E3A9E]",
    "amber-solid": "bg-[#FDE7F1] text-[#9D174D] [&_svg]:stroke-current [&_svg]:text-[#9D174D]",
    "amber-tint": "bg-[#FDE7F1] text-[#9D174D]",
    "gold-solid": "bg-[#F5B301] text-[#4A3400] [&_svg]:stroke-current [&_svg]:text-[#4A3400]",
    "gold-tint": "bg-[#F5B301] text-[#4A3400]",
    neutral: "bg-[#F0F3FF] text-[#5B6270] border border-[#E3E5F0]",
  };
  return (
    <span className={cn(base, variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
