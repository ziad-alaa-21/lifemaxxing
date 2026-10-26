"use client";

import React from "react";
import { Clock, Sun, Sparkles, Dumbbell, Moon, CheckCircle2 } from "lucide-react";
import { CircadianPhase } from "@/lib/today";
import { useI18n } from "@/lib/i18n/I18nContext";
import { formatTimeRange12h, formatTimeTo12h } from "@/lib/time";

interface CircadianTimelineCardProps {
  phases: CircadianPhase[];
}

export function CircadianTimelineCard({ phases }: CircadianTimelineCardProps) {
  const { locale } = useI18n();

  const getPhaseIcon = (id: string) => {
    switch (id) {
      case "morning":
        return <Sun className="w-3.5 h-3.5 text-[#B45309]" />;
      case "deep_work":
        return <Sparkles className="w-3.5 h-3.5 text-[#5B21B6]" />;
      case "training":
        return <Dumbbell className="w-3.5 h-3.5 text-[#1E3A9E]" />;
      case "evening":
        return <Moon className="w-3.5 h-3.5 text-[#1E3A9E]" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-[#5B6270]" />;
    }
  };

  const getPhaseLabel = (id: string, fallback: string) => {
    if (locale !== "ar") return fallback;
    switch (id) {
      case "morning":
        return "روتين الصباح وبدء اليوم";
      case "deep_work":
        return "ساعات العمل العميق والتركيز";
      case "training":
        return "نافذة التمرين والنشاط";
      case "evening":
        return "الاسترخاء والاستعداد للنوم";
      default:
        return fallback;
    }
  };

  const formatEventTitle = (title: string) => {
    const formattedWith12h = title.replace(/\((\d{1,2}:\d{2})\)/, (_, time) => `(${formatTimeTo12h(time, { locale })})`);
    if (locale !== "ar") return formattedWith12h;
    if (title.toLowerCase().includes("wake") || title.toLowerCase().includes("sunlight")) return "الاستيقاظ والتعرض لنور الشمس";
    if (title.toLowerCase().includes("hydration") || title.toLowerCase().includes("water")) return "شرب الميه وترطيب الجسم";
    if (title.toLowerCase().includes("focus") || title.toLowerCase().includes("sprint")) return "جلسة تركيز ذهني عميق";
    if (title.toLowerCase().includes("workout") || title.toLowerCase().includes("session")) return "جلسة التمرين المقررة";
    if (title.toLowerCase().includes("screen") || title.toLowerCase().includes("off")) return "تقليل إضاءة الشاشات";
    if (title.toLowerCase().includes("bed") || title.toLowerCase().includes("sleep")) return "النوم للاستشفاء الكامل";
    return formattedWith12h;
  };

  return (
    <div className="p-6 rounded-[20px] bg-white border border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.08)] space-y-4">
      <div className="flex items-center justify-between pb-3.5 border-b border-[#ECEEFA]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#14161A]" />
          <h3 className="text-[15px] font-medium text-[#14161A]">
            {locale === "ar" ? "الجدول الحيوي (الساعة البيولوجية)" : "Circadian Timeline"}
          </h3>
        </div>
        <span className="text-xs text-[#5B6270]">
          {locale === "ar" ? "جدول يومك بناءً على مواعيدك الأساسية" : "Dynamic schedule from your anchors"}
        </span>
      </div>

      <div className="space-y-3">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className={`p-4 rounded-[14px] border transition-all ${
              phase.isActive
                ? "bg-[#F3F4FB] border-[#2563EB]/30 ring-1 ring-[#2563EB]/20"
                : "bg-[#F8F9FD] border-[#ECEEFA]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[8px] bg-white flex items-center justify-center border border-[#E3E5F0]">
                  {getPhaseIcon(phase.id)}
                </div>
                <span className="text-xs font-medium text-[#14161A]">
                  {getPhaseLabel(phase.id, phase.label)}
                </span>
                <span className="text-[11px] tabular-nums text-[#5B6270]">
                  ({formatTimeRange12h(phase.startTime, phase.endTime, { locale })})
                </span>
              </div>

              {phase.isActive && (
                <span className="text-[10px] uppercase font-medium tracking-wider px-2.5 py-0.5 rounded-full bg-[#E6EEFF] text-[#1E3A9E] border border-[#2563EB]/20">
                  {locale === "ar" ? "الفترة الحالية" : "Active Phase"}
                </span>
              )}
            </div>

            <div className="space-y-1.5 pl-9 rtl:pl-0 rtl:pr-9">
              {phase.events.map((ev, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-[#5B6270] font-normal text-start">
                    {formatEventTitle(ev.title)}
                  </span>
                  {ev.isCompleted && (
                    <span className="flex items-center gap-1 text-[11px] text-[#15803D] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{locale === "ar" ? "تمت" : "Done"}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
