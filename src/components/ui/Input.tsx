import React, { forwardRef } from "react";
import { cn } from "@/lib/design/tokens";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full h-11 px-4 rounded-[12px] bg-white border border-[#E3E5F0] text-[14px] leading-[20px] font-normal text-[#14161A] placeholder:text-[#5B6270] focus:border-[#14161A] focus:outline-none transition-colors disabled:bg-[#F0F3FF] disabled:text-[#5B6270]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
