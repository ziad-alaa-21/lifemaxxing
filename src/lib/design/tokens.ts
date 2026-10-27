import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const REDUCE_BLUR_STORAGE_KEY = "life_reduce_blur";

export function applyReduceBlurPreference(reduceBlur: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (reduceBlur) {
    root.dataset.reduceBlur = "true";
    root.classList.add("no-blur");
  } else {
    delete root.dataset.reduceBlur;
    root.classList.remove("no-blur");
  }
}

export function getReduceBlurPreference(): boolean {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(REDUCE_BLUR_STORAGE_KEY) === "1";
  } catch {
    return document.documentElement.dataset.reduceBlur === "true";
  }
}

export function setReduceBlurPreference(reduceBlur: boolean): void {
  if (process.env.NODE_ENV === "production") return;
  if (typeof window !== "undefined") {
    try {
      if (reduceBlur) {
        window.localStorage.setItem(REDUCE_BLUR_STORAGE_KEY, "1");
      } else {
        window.localStorage.removeItem(REDUCE_BLUR_STORAGE_KEY);
      }
    } catch {
      // Ignore storage access errors in restricted webviews
    }
  }
  applyReduceBlurPreference(reduceBlur);
}

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  try {
    const params = new URLSearchParams(window.location.search);
    const param = params.get("noBlur");
    if (param === "1" || param === "true") {
      setReduceBlurPreference(true);
    } else if (param === "0" || param === "false") {
      setReduceBlurPreference(false);
    } else if (getReduceBlurPreference()) {
      applyReduceBlurPreference(true);
    }
    (window as Window & { __setReduceBlur?: (reduce: boolean) => void }).__setReduceBlur =
      setReduceBlurPreference;
  } catch {
    // No-op if URLSearchParams/localStorage unavailable
  }
}

export type DomainKey = "body" | "mind" | "school";

export const DESIGN_TOKENS = {
  colors: {
    canvasStart: "#F3F4FB",
    canvasEnd: "#ECEEFA",
    surface: "#F9F9FF",
    surfaceLowest: "#FFFFFF",
    surfaceLow: "#F0F3FF",
    surfaceContainer: "#E7EEFF",
    surfaceHigh: "#E2E8F9",
    surfaceHighest: "#DCE2F3",
    ink: "#14161A",
    slate: "#5B6270",
    border: "#E3E5F0",
    divider: "#ECEEFA",
    outline: "#76777B",
    outlineVariant: "#C6C6CB",
    onPrimary: "#FFFFFF",
    error: "#BA1A1A",
    errorContainer: "#FFDAD6",
    onErrorContainer: "#93000A",
    recordSurface: "#F5B301",
    recordText: "#4A3400",
  },
  domains: {
    body: {
      gradient: "linear-gradient(135deg, #2563EB 0%, #4338CA 100%)",
      gradientClass: "bg-gradient-to-br from-[#2563EB] to-[#4338CA] text-white",
      barGradientClass: "bg-gradient-to-r from-[#2563EB] to-[#4338CA]",
      chipSurface: "#E6EEFF",
      chipText: "#1E3A9E",
      chipClass: "bg-[#E6EEFF] text-[#1E3A9E]",
      accent: "#2563EB",
    },
    mind: {
      gradient: "linear-gradient(135deg, #7C3AED 0%, #A21CAF 100%)",
      gradientClass: "bg-gradient-to-br from-[#7C3AED] to-[#A21CAF] text-white",
      barGradientClass: "bg-gradient-to-r from-[#7C3AED] to-[#A21CAF]",
      chipSurface: "#F1E8FF",
      chipText: "#5B21B6",
      chipClass: "bg-[#F1E8FF] text-[#5B21B6]",
      accent: "#7C3AED",
    },
    school: {
      gradient: "linear-gradient(135deg, #DB2777 0%, #C2410C 100%)",
      gradientClass: "bg-gradient-to-br from-[#DB2777] to-[#C2410C] text-white",
      barGradientClass: "bg-gradient-to-r from-[#DB2777] to-[#C2410C]",
      chipSurface: "#FDE7F1",
      chipText: "#9D174D",
      chipClass: "bg-[#FDE7F1] text-[#9D174D]",
      accent: "#DB2777",
    },
  },
  radii: {
    card: "rounded-[20px]",
    control: "rounded-[12px]",
    pill: "rounded-full",
  },
  elevation: {
    level1: "bg-white border border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.08)]",
    level2: "bg-white border border-[#E3E5F0] shadow-[0_12px_32px_rgba(40,50,120,0.12)]",
  },
  plates: {
    plate25: "var(--color-plate-25, #dc2626)",
    plate20: "var(--color-plate-20, #2563eb)",
    plate15: "var(--color-plate-15, #eab308)",
    plate10: "var(--color-plate-10, #16a34a)",
    plate5: "var(--color-plate-5, #ffffff)",
    plate2_5: "var(--color-plate-2-5, #1e293b)",
    plate1_25: "var(--color-plate-1-25, #94a3b8)",
    collar: "var(--color-plate-collar, #475569)",
    sleeve: "var(--color-plate-sleeve, #cbd5e1)",
    shaft: "var(--color-plate-shaft, #64748b)",
  },
  typography: {
    headlineXl: "text-[28px] leading-[36px] sm:text-[40px] sm:leading-[48px] font-medium tracking-normal",
    headlineLg: "text-[28px] leading-[36px] font-medium tracking-normal",
    headlineMd: "text-[20px] leading-[28px] font-medium tracking-normal",
    headlineSm: "text-[16px] leading-[24px] font-medium tracking-normal",
    bodyLg: "text-[16px] leading-[24px] font-normal tracking-normal",
    bodyMd: "text-[14px] leading-[20px] font-normal tracking-normal",
    labelMd: "text-[14px] leading-[20px] font-medium tracking-normal",
    labelSm: "text-[12px] leading-[16px] font-medium tracking-normal",
    caption: "text-[12px] leading-[16px] font-normal tracking-normal",
  },
} as const;
