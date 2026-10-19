import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
    lime: "bg-primary-lime text-on-primary shadow-xs [&_svg]:stroke-current [&_svg]:text-on-primary",
    cyan: "bg-secondary-cyan text-on-primary shadow-xs [&_svg]:stroke-current [&_svg]:text-on-primary",
    gold: "bg-rank-gold text-on-primary shadow-xs [&_svg]:stroke-current [&_svg]:text-on-primary",
    sky: "bg-[#7DD3FC] text-on-primary shadow-xs [&_svg]:stroke-current [&_svg]:text-on-primary",
    amber: "bg-amber-400 text-on-primary shadow-xs [&_svg]:stroke-current [&_svg]:text-on-primary",
  };

  return (
    <button
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 select-none",
        active
          ? cn(activeStyles[color], "font-bold")
          : "text-text-muted hover:text-on-surface hover:bg-surface-container-high [&_svg]:stroke-current",
        className
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
