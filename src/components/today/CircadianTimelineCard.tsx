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
        return <Sun className="w-3.5 h-3.5 text-amber-core" />;
      case "deep_work":
        return <Sparkles className="w-3.5 h-3.5 text-tertiary-purple" />;
      case "training":
        return <Dumbbell className="w-3.5 h-3.5 text-secondary-cyan" />;
      case "evening":
        return <Moon className="w-3.5 h-3.5 text-[#7DD3FC]" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-text-muted" />;
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
    <div className="p-5 rounded-2xl bg-surface-container border border-border-subtle space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-muted" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-on-surface font-semibold">
            {locale === "ar" ? "الجدول الحيوي (الساعة البيولوجية)" : "Circadian Timeline"}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-text-muted">
          {locale === "ar" ? "جدول يومك بناءً على مواعيدك الأساسية" : "Dynamic schedule from your anchors"}
        </span>
      </div>

      <div className="space-y-3">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className={`p-3.5 rounded-xl border transition-all ${
              phase.isActive
                ? "bg-surface-container-high/90 border-border-default ring-1 ring-border-default/50"
                : "bg-surface-container-low border-border-subtle opacity-80"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center border border-border-subtle">
                  {getPhaseIcon(phase.id)}
                </div>
                <span className="text-xs font-bold font-mono text-on-surface">
                  {getPhaseLabel(phase.id, phase.label)}
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  ({formatTimeRange12h(phase.startTime, phase.endTime, { locale })})
                </span>
              </div>

              {phase.isActive && (
                <span className="text-[9px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface border border-border-subtle">
                  {locale === "ar" ? "الفترة الحالية" : "Active Phase"}
                </span>
              )}
            </div>

            <div className="space-y-1.5 pl-8 rtl:pl-0 rtl:pr-8">
              {phase.events.map((ev, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant font-medium text-start">
                    {formatEventTitle(ev.title)}
                  </span>
                  {ev.isCompleted && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-status-success font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
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
