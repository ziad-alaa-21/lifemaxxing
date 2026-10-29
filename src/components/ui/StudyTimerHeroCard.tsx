"use client";

import React, { useState, useEffect } from "react";
import { Clock, Play, RotateCcw } from "lucide-react";
import { SubjectItem, FocusSessionTelemetry } from "@/lib/school";

export interface StudyTimerHeroCardProps {
  activeSubjects: SubjectItem[];
  focusSessions: FocusSessionTelemetry[];
  locale?: string;
  onOpenStudyModal?: (subject: SubjectItem) => void;
}

export function StudyTimerHeroCard({
  activeSubjects,
  focusSessions,
  locale = "en",
}: StudyTimerHeroCardProps) {
  const [studyTimerSubjectId, setStudyTimerSubjectId] = useState<string>("");
  const [sessionGoal, setSessionGoal] = useState<string>("Finish problem set 4");
  const [isStudyTimerRunning, setIsStudyTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(100 * 60); // 1h 40m initial matching Stitch

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isStudyTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStudyTimerRunning]);

  const todayStartMs = new Date().setHours(0, 0, 0, 0);
  const todayLoggedMinutes =
    focusSessions
      .filter((s) => new Date(s.started_at).getTime() >= todayStartMs)
      .reduce((acc, s) => acc + (s.actual_minutes || 0), 0) +
    Math.floor(timerSeconds / 60);

  const todayHours = Math.floor(todayLoggedMinutes / 60);
  const todayMins = todayLoggedMinutes % 60;

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-white p-6 sm:p-7 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-[#e2e8f9]">
      <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-center justify-between relative z-10">
        {/* Left Column: Context & Session Inputs */}
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0051d5]" />
              <span className="text-lg font-bold text-[#151c28]">
                {locale === "ar" ? "مؤقت المذاكرة" : "Study timer"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f0f3ff] rounded-full text-[#0051d5] text-xs font-semibold border border-[#dce2f3]">
              <span
                className={`w-2 h-2 rounded-full bg-[#0051d5] ${
                  isStudyTimerRunning ? "animate-ping" : "animate-pulse"
                }`}
              />
              <span>
                {isStudyTimerRunning
                  ? locale === "ar"
                    ? "جلسة نشطة"
                    : "Active session"
                  : locale === "ar"
                  ? "جاهز للتسجيل"
                  : "Ready to record"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {/* Subject Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#45474b]">
                {locale === "ar" ? "المادة" : "Subject"}
              </label>
              <select
                value={studyTimerSubjectId || activeSubjects[0]?.id || ""}
                onChange={(e) => setStudyTimerSubjectId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#151c28] text-xs font-medium focus:bg-white focus:ring-1 focus:ring-[#0051d5] outline-none transition-all cursor-pointer border border-[#e2e8f9]"
              >
                {activeSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Session Goal Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#45474b]">
                {locale === "ar" ? "هدف هذه الجلسة" : "Goal for this session"}
              </label>
              <input
                type="text"
                value={sessionGoal}
                onChange={(e) => setSessionGoal(e.target.value)}
                placeholder={
                  locale === "ar"
                    ? "مركز على إيه في الجلسة دي؟"
                    : "What are you focusing on?"
                }
                className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#151c28] text-xs font-medium placeholder:text-[#717784] focus:bg-white focus:ring-1 focus:ring-[#0051d5] outline-none transition-all border border-[#e2e8f9]"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Timer Action & Cumulative Today Metric */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between lg:justify-center gap-3.5 pt-4 lg:pt-0 pl-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-[#e2e8f9]">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsStudyTimerRunning((prev) => !prev)}
              className={`w-full sm:w-auto h-11 px-6 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer ${
                isStudyTimerRunning
                  ? "bg-[#0051d5] text-white hover:bg-[#003ea8]"
                  : "bg-[#000000] text-white hover:bg-[#2a313d]"
              }`}
            >
              {isStudyTimerRunning ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>{locale === "ar" ? "إيقاف مؤقت" : "Pause"}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>{locale === "ar" ? "ابدأ" : "Start"}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsStudyTimerRunning(false);
                setTimerSeconds(0);
              }}
              title={locale === "ar" ? "إعادة ضبط" : "Reset timer"}
              className="h-11 w-11 rounded-xl bg-[#f0f3ff] text-[#45474b] hover:text-[#151c28] hover:bg-[#e7eeff] flex items-center justify-center transition-colors cursor-pointer border border-[#e2e8f9]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Cumulative Session Stat Line */}
          <div className="flex items-center gap-1.5 text-xs text-[#45474b]">
            <span>{locale === "ar" ? "اليوم:" : "Today:"}</span>
            <span className="font-bold text-[#151c28]">
              {todayHours} h {todayMins} m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
