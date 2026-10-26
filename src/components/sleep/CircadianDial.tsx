"use client";

import React from "react";
import { Sun, Moon, Coffee, ShieldAlert, Sparkles, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { formatTimeTo12h } from "@/lib/time";

interface CircadianDialProps {
  targetBedtime?: string; // e.g. "23:00"
  targetWakeTime?: string; // e.g. "07:00"
  caffeineCutoffHours?: number; // e.g. 10
  screenCutoffMinutes?: number; // e.g. 60
}

export function CircadianDial({
  targetBedtime = "23:00",
  targetWakeTime = "07:00",
  caffeineCutoffHours = 10,
  screenCutoffMinutes = 60,
}: CircadianDialProps) {
  const { locale } = useI18n();
  // Current local time
  const [nowHour, setNowHour] = React.useState<number>(12);
  const [nowMinute, setNowMinute] = React.useState<number>(0);

  React.useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setNowHour(d.getHours());
      setNowMinute(d.getMinutes());
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentPercent = ((nowHour * 60 + nowMinute) / (24 * 60)) * 100;

  // Calculate dynamic landmark times based on bedtime & wake
  const [bedH, bedM] = targetBedtime.split(":").map(Number);
  const [wakeH, wakeM] = targetWakeTime.split(":").map(Number);

  // Caffeine cutoff: bed - caffeineCutoffHours
  const bedTotalMins = bedH * 60 + (bedM || 0);
  let caffeineTotalMins = bedTotalMins - caffeineCutoffHours * 60;
  if (caffeineTotalMins < 0) caffeineTotalMins += 1440;
  const caffH = Math.floor(caffeineTotalMins / 60);
  const caffM = caffeineTotalMins % 60;
  const caffeineTimeFormatted = `${caffH.toString().padStart(2, "0")}:${caffM.toString().padStart(2, "0")}`;

  // Screen cutoff: bed - screenCutoffMinutes
  let screenTotalMins = bedTotalMins - screenCutoffMinutes;
  if (screenTotalMins < 0) screenTotalMins += 1440;
  const screenH = Math.floor(screenTotalMins / 60);
  const screenM = screenTotalMins % 60;
  const screenTimeFormatted = `${screenH.toString().padStart(2, "0")}:${screenM.toString().padStart(2, "0")}`;

  const landmarks = [
    {
      time: formatTimeTo12h(targetWakeTime, { locale }),
      title: locale === "ar" ? "شمس الصباح والصحيان" : "Morning Light & Wake",
      desc: locale === "ar" ? "تحفيز الكورتيزول وتثبيت الساعة البيولوجية (خلال ٦٠ دقيقة)" : "Cortisol spike & phase anchor (within 60m of waking)",
      icon: Sun,
      color: "text-[#7DD3FC] border-[#7DD3FC]/30 bg-[#7DD3FC]/10",
      dotColor: "bg-[#7DD3FC]",
    },
    {
      time: formatTimeTo12h(`${((wakeH + 4) % 24).toString().padStart(2, "0")}:00`, { locale }),
      title: locale === "ar" ? "ذروة النشاط الذهني والبدني" : "Peak Physical / Cognitive",
      desc: locale === "ar" ? "أعلى درجات التركيز وقمة حرارة الجسم" : "Optimal alertness & body temperature peak",
      icon: Sparkles,
      color: "text-primary-lime border-primary-lime/30 bg-primary-lime/10",
      dotColor: "bg-primary-lime",
    },
    {
      time: formatTimeTo12h(caffeineTimeFormatted, { locale }),
      title: locale === "ar" ? "وقف الكافيين" : "Caffeine Cutoff",
      desc: locale === "ar" ? `تنظيف مستقبلات الأدينوزين (${caffeineCutoffHours} ساعات قبل النوم)` : `Adenosine receptor clearance (${caffeineCutoffHours}h before bedtime)`,
      icon: Coffee,
      color: "text-rank-bronze border-rank-bronze/30 bg-rank-bronze/10",
      dotColor: "bg-rank-bronze",
    },
    {
      time: formatTimeTo12h(screenTimeFormatted, { locale }),
      title: locale === "ar" ? "وقف الشاشات والضوء الخافت" : "Screen & Dim Light",
      desc: locale === "ar" ? `بدء إفراز الميلاتونين (${screenCutoffMinutes} دقيقة استرخاء)` : `Melatonin secretion onset (${screenCutoffMinutes}m wind-down)`,
      icon: ShieldAlert,
      color: "text-rank-platinum border-rank-platinum/30 bg-rank-platinum/10",
      dotColor: "bg-rank-platinum",
    },
    {
      time: formatTimeTo12h(targetBedtime, { locale }),
      title: locale === "ar" ? "وقت النوم المستهدف" : "Target Bedtime",
      desc: locale === "ar" ? "إصلاح الخلايا، هرمون النمو، وتثبيت الذاكرة" : "Cellular repair, growth hormone & memory consolidation",
      icon: Moon,
      color: "text-[#7DD3FC] border-[#7DD3FC]/30 bg-[#7DD3FC]/10",
      dotColor: "bg-[#7DD3FC]",
    },
  ];

  return (
    <div className="stitch-card p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary-cyan/10 border border-secondary-cyan/20 flex items-center justify-center text-secondary-cyan">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-mono text-on-surface">
                {locale === "ar" ? "مسار اليوم والنوافذ الشمسية" : "Circadian Dial & Solar Windows"}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-[10px] font-mono text-text-muted border border-border-subtle">
                <Info className="w-2.5 h-2.5" />
                {locale === "ar" ? "إرشادات عامة" : "General guidance"}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant font-mono">
              {locale === "ar"
                ? `إيقاع بيولوجي مرتبط بوقت النوم المستهدف ${formatTimeTo12h(targetBedtime, { locale })}`
                : `Circadian biological rhythm anchored to target bedtime ${formatTimeTo12h(targetBedtime, { locale })}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high border border-border-subtle text-[11px] font-mono text-text-muted self-start sm:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-lime animate-pulse" />
          <span>
            {formatTimeTo12h(`${nowHour}:${nowMinute}`, { locale })} {locale === "ar" ? "الوقت الحالي" : "Current"}
          </span>
        </div>
      </div>

      {/* 24-Hour Timeline Bar */}
      <div className="relative pt-6 pb-2">
        {/* Track */}
        <div className="h-3 w-full rounded-full bg-surface-container-highest relative overflow-hidden border border-border-subtle">
          {/* Target sleep zone */}
          <div
            className="absolute top-0 bottom-0 bg-secondary-cyan/20"
            style={{ left: "0%", width: "29.1%" }}
            title="Rest Window"
          />
          <div
            className="absolute top-0 bottom-0 bg-secondary-cyan/20"
            style={{ left: "95.8%", width: "4.2%" }}
            title="Rest Window"
          />
          {/* Morning Sunlight window */}
          <div
            className="absolute top-0 bottom-0 bg-primary-lime/20"
            style={{ left: "29.1%", width: "8.3%" }}
            title="Morning Sunlight"
          />
        </div>

        {/* Current Time Needle */}
        <div
          className="absolute top-3 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-500 z-10"
          style={{ left: `${currentPercent}%` }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-primary-lime shadow-xs" />
          <div className="w-0.5 h-4 bg-primary-lime" />
        </div>

        {/* Milestone Marks */}
        <div className="flex justify-between text-[10px] font-mono text-text-muted pt-2">
          <span>{formatTimeTo12h("00:00", { locale })}</span>
          <span>{formatTimeTo12h("06:00", { locale })}</span>
          <span>{formatTimeTo12h("12:00", { locale })}</span>
          <span>{formatTimeTo12h("18:00", { locale })}</span>
          <span>{formatTimeTo12h("24:00", { locale })}</span>
        </div>
      </div>

      {/* Protocol Windows Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        {landmarks.map((lm, idx) => {
          const Icon = lm.icon;
          return (
            <div
              key={idx}
              className="p-3 rounded-xl bg-surface-container-high/60 border border-border-subtle flex items-start gap-2.5 transition-all hover:bg-surface-container-high"
            >
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${lm.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-on-surface truncate">
                    {lm.title}
                  </span>
                  <span className="text-[10px] font-mono text-secondary-cyan ml-1 shrink-0">
                    {lm.time}
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant line-clamp-1 mt-0.5">
                  {lm.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
