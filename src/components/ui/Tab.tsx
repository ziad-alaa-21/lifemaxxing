import React from "react";
import { cn } from "@/lib/design/tokens";

export type TabColor = "lime" | "cyan" | "gold" | "sky" | "amber";

export interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  color?: TabColor;
  icon?: React.ReactNode;
}

export function Tab({
  className,
  active = false,
  color = "lime",
  icon,
  children,
  ...props
}: TabProps) {
  const activeStyles: Record<TabColor, string> = {
    lime: "bg-[#14161A] text-white shadow-[0_2px_8px_rgba(20,22,26,0.12)] [&_svg]:stroke-current [&_svg]:text-white",
    cyan: "bg-[#14161A] text-white shadow-[0_2px_8px_rgba(20,22,26,0.12)] [&_svg]:stroke-current [&_svg]:text-white",
    gold: "bg-[#14161A] text-white shadow-[0_2px_8px_rgba(20,22,26,0.12)] [&_svg]:stroke-current [&_svg]:text-white",
    sky: "bg-[#14161A] text-white shadow-[0_2px_8px_rgba(20,22,26,0.12)] [&_svg]:stroke-current [&_svg]:text-white",
    amber: "bg-[#14161A] text-white shadow-[0_2px_8px_rgba(20,22,26,0.12)] [&_svg]:stroke-current [&_svg]:text-white",
  };

  return (
    <button
      className={cn(
        "flex items-center gap-2 h-8 px-3.5 rounded-full font-sans text-[12px] leading-[16px] font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 select-none",
        active
          ? activeStyles[color]
          : "bg-white text-[#5B6270] border border-[#E3E5F0] hover:text-[#14161A] hover:bg-[#F0F3FF] [&_svg]:stroke-current",
        className
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
