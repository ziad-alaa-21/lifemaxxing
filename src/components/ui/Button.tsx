import React, { forwardRef } from "react";
import { cn } from "@/lib/design/tokens";

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
      "inline-flex items-center justify-center font-sans font-medium tracking-normal rounded-[12px] transition-all select-none cursor-pointer active:scale-[0.99]";

    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        "bg-[#14161A] text-white hover:bg-[#2A313D] shadow-[0_4px_12px_rgba(20,22,26,0.12)] [&_svg]:stroke-current [&_svg]:text-white disabled:bg-[#E2E8F9] disabled:text-[#5B6270] disabled:shadow-none disabled:cursor-not-allowed",
      secondary:
        "bg-white hover:bg-[#F0F3FF] text-[#14161A] border border-[#E3E5F0] shadow-[0_2px_8px_rgba(40,50,120,0.04)] [&_svg]:stroke-current disabled:bg-[#F0F3FF] disabled:text-[#5B6270] disabled:shadow-none disabled:cursor-not-allowed",
      cyan:
        "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-[0_4px_12px_rgba(37,99,235,0.18)] [&_svg]:stroke-current [&_svg]:text-white disabled:bg-[#E2E8F9] disabled:text-[#5B6270] disabled:shadow-none disabled:cursor-not-allowed",
      amber:
        "bg-[#DB2777] text-white hover:bg-[#BE185D] shadow-[0_4px_12px_rgba(219,39,119,0.18)] [&_svg]:stroke-current [&_svg]:text-white disabled:bg-[#E2E8F9] disabled:text-[#5B6270] disabled:shadow-none disabled:cursor-not-allowed",
      indigo:
        "bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-[0_4px_12px_rgba(124,58,237,0.18)] [&_svg]:stroke-current [&_svg]:text-white disabled:bg-[#E2E8F9] disabled:text-[#5B6270] disabled:shadow-none disabled:cursor-not-allowed",
      outline:
        "bg-white border border-[#E3E5F0] hover:bg-[#F0F3FF] text-[#14161A] [&_svg]:stroke-current disabled:opacity-50 disabled:cursor-not-allowed",
      ghost:
        "bg-transparent hover:bg-[#F0F3FF] text-[#5B6270] hover:text-[#14161A] [&_svg]:stroke-current disabled:opacity-50 disabled:cursor-not-allowed",
      danger:
        "bg-[#BA1A1A] text-white hover:opacity-90 shadow-xs [&_svg]:stroke-current disabled:bg-[#E2E8F9] disabled:text-[#5B6270] disabled:shadow-none disabled:cursor-not-allowed",
    };

    const sizeClasses: Record<ButtonSize, string> = {
      xs: "text-[12px] leading-[16px] px-3 py-1.5 rounded-[12px] gap-1.5",
      sm: "text-[12px] leading-[16px] px-3.5 py-2 rounded-[12px] gap-2",
      md: "text-[14px] leading-[20px] px-[18px] py-[10px] rounded-[12px] gap-2",
      lg: "text-[16px] leading-[24px] px-5 py-3 rounded-[12px] gap-2.5",
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
