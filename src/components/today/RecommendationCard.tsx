"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { RecommendationOutput } from "@/lib/today";

interface RecommendationCardProps {
  recommendation?: RecommendationOutput;
  greeting?: string;
}

export function RecommendationCard({ greeting }: RecommendationCardProps) {
  const { locale } = useI18n();

  const formattedDate = React.useMemo(() => {
    if (greeting && greeting !== "Today" && greeting !== "النهاردة") {
      return greeting;
    }
    try {
      return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(new Date());
    } catch {
      return greeting || (locale === "ar" ? "النهاردة" : "Today");
    }
  }, [locale, greeting]);

  return (
    <div className="flex flex-col gap-1.5 max-w-3xl">
      <h1 className="text-[26px] sm:text-[32px] lg:text-[36px] font-semibold text-[#14161A] tracking-tight leading-snug">
        {formattedDate}
      </h1>
    </div>
  );
}
