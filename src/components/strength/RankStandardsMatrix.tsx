"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Award,
  TrendingUp,
  Target,
  ShieldCheck,
  Weight,
  Loader2,
  AlertCircle,
  BarChart2,
  Info,
  HelpCircle,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { supabase } from "@/lib/supabase/client";
import {
  CANONICAL_EXERCISES,
  TIER_NAMES,
  determineTier,
  getTierColor,
  getStandardsForGender,
  calculateOverallRank,
  TierName,
} from "@/lib/strength";
import { BarbellSvg } from "@/components/illustrations/BarbellSvg";

import { useI18n } from "@/lib/i18n/I18nContext";

interface UserPR {
  exercise_id: string;
  e1rm_kg: number;
  bodyweight_kg: number;
  ratio: number;
  tier: TierName;
  achieved_at: string;
}

interface CanonicalLiftSummary {
  id: string;
  name: string;
  key: string;
  muscle: string;
  currentPR: UserPR | null;
  standards: { tier: string; multiplier: number }[];
  currentTier: TierName;
  ratio: number;
  nextTier?: string;
  nextTargetKg?: number;
  kgToGo?: number;
  progressPercent: number;
  isUnranked: boolean;
  unrankedReason?: string;
}

export function RankStandardsMatrix() {
  const { locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [bodyweightKg, setBodyweightKg] = useState<number | null>(null);
  const [liftSummaries, setLiftSummaries] = useState<CanonicalLiftSummary[]>([]);
  const [selectedLift, setSelectedLift] = useState<string>(
    CANONICAL_EXERCISES[0].id
  );
  const [overallRank, setOverallRank] = useState<{
    overallTier: TierName;
    averageRatio: number;
    liftsCount: number;
    maxLifts: number;
  } | null>(null);

  const getExerciseName = (key: string, defaultName: string) => {
    if (locale !== "ar") return defaultName;
    const names: Record<string, string> = {
      bench_press: "بنش برس بالبار",
      squat: "سكوات باربل",
      deadlift: "ديدليفت بالبار",
      overhead_press: "ضغط كتف بالبار",
      pull_up: "عقلة بأوزان",
      barbell_row: "سحب باربل",
    };
    return names[key] || defaultName;
  };

  const getTierTranslation = (tier: string) => {
    if (locale !== "ar") return tier;
    const tiers: Record<string, string> = {
      Bronze: "برونزي",
      Silver: "فضي",
      Gold: "ذهبي",
      Platinum: "بلاتيني",
      Diamond: "ماسي",
      Master: "ماستر",
      Grandmaster: "جراند ماستر",
      Unranked: "غير مصنف",
    };
    return tiers[tier] || tier;
  };

  const getMuscleTranslation = (muscle: string) => {
    if (locale !== "ar") return muscle;
    const muscles: Record<string, string> = {
      chest: "الصدر",
      legs: "الرجلين",
      back: "الضهر",
      shoulders: "الأكتاف",
      lats: "المجنص والظهر",
    };
    return muscles[muscle.toLowerCase()] || muscle;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setUserId(user.id);

      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("gender, current_weight_kg, target_weight_kg")
        .eq("id", user.id)
        .single();

      const gender = profile?.gender || null;
      setUserGender(gender);

      let currentWeight: number | null = null;
      if (profile?.current_weight_kg) {
        currentWeight = Number(profile.current_weight_kg);
      } else if (profile?.target_weight_kg) {
        currentWeight = Number(profile.target_weight_kg);
      }

      // 2. Fetch authenticated user's rank history
      const { data: rankData } = await supabase
        .from("user_rank_history")
        .select("exercise_id, e1rm_kg, bodyweight_kg, ratio, tier, achieved_at")
        .eq("user_id", user.id)
        .order("achieved_at", { ascending: false });

      const prMap: Record<string, UserPR> = {};
      if (rankData) {
        if (!currentWeight && rankData.length > 0 && rankData[0].bodyweight_kg) {
          currentWeight = Number(rankData[0].bodyweight_kg);
        }

        for (const r of rankData) {
          const exId = r.exercise_id;
          if (!prMap[exId] || Number(r.ratio) > Number(prMap[exId].ratio)) {
            prMap[exId] = {
              exercise_id: exId,
              e1rm_kg: Number(r.e1rm_kg),
              bodyweight_kg: Number(r.bodyweight_kg),
              ratio: Number(r.ratio),
              tier: r.tier as TierName,
              achieved_at: r.achieved_at,
            };
          }
        }
      }

      setBodyweightKg(currentWeight);

      const effectiveBw = currentWeight || 75;
      const { standards: activeStandards } = getStandardsForGender(gender);

      // 3. Assemble summaries for the 6 canonical lifts
      const summaries: CanonicalLiftSummary[] = CANONICAL_EXERCISES.map((canonical) => {
        const multipliers = activeStandards[canonical.key] || [];
        const exStandards = multipliers.map((mult, idx) => ({
          tier: TIER_NAMES[idx],
          multiplier: mult,
        }));

        const pr = prMap[canonical.id] || null;
        const currentE1rm = pr ? pr.e1rm_kg : 0;
        const userBw = pr ? pr.bodyweight_kg : effectiveBw;

        const calculated = determineTier(canonical.id, currentE1rm, userBw, gender);

        return {
          id: canonical.id,
          name: canonical.name,
          key: canonical.key,
          muscle: canonical.muscle,
          currentPR: pr,
          standards: exStandards,
          currentTier: calculated.tier,
          ratio: calculated.ratio,
          nextTier: calculated.nextTier,
          nextTargetKg: calculated.nextTargetKg,
          kgToGo: calculated.kgToGo,
          progressPercent: calculated.progressPercent,
          isUnranked: calculated.isUnranked,
          unrankedReason: calculated.unrankedReason,
        };
      });

      setLiftSummaries(summaries);

      // 4. Calculate overall rank
      const loggedLifts = summaries
        .filter((s) => s.currentPR !== null)
        .map((s) => ({ key: s.key, ratio: s.ratio }));

      const overall = calculateOverallRank(loggedLifts, gender);
      setOverallRank(overall);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading standards";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick set gender if unset
  const handleSetGender = async (selectedGender: "male" | "female") => {
    if (!userId) return;
    try {
      await supabase.from("profiles").update({ gender: selectedGender }).eq("id", userId);
      setUserGender(selectedGender);
      loadData();
    } catch (err) {
      console.error("Error setting gender:", err);
    }
  };

  // Prepare radar chart data
  const radarData = liftSummaries.map((item) => {
    const shortNamesEn: Record<string, string> = {
      bench_press: "Bench",
      squat: "Squat",
      deadlift: "Deadlift",
      overhead_press: "OHP",
      pull_up: "Pull-up",
      barbell_row: "Row",
    };
    const shortNamesAr: Record<string, string> = {
      bench_press: "بنش",
      squat: "سكوات",
      deadlift: "ديدليفت",
      overhead_press: "كتف",
      pull_up: "عقلة",
      barbell_row: "سحب بار",
    };

    const shortNames = locale === "ar" ? shortNamesAr : shortNamesEn;
    const silverStd = item.standards.find((s) => s.tier === "Silver")?.multiplier || 1.0;
    const goldStd = item.standards.find((s) => s.tier === "Gold")?.multiplier || 1.3;

    return {
      lift: shortNames[item.key] || item.name,
      userRatio: item.ratio,
      silver: silverStd,
      gold: goldStd,
    };
  });

  const activeLift = liftSummaries.find((l) => l.id === selectedLift) || liftSummaries[0];
  const effectiveBw = bodyweightKg || 75;

  return (
    <div className="space-y-6">
      {/* Gender Unset Warning Banner */}
      {userGender === null && (
        <div className="bg-amber-core/10 border border-amber-core/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-amber-core">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>{locale === "ar" ? "النوع غير محدد:" : "Gender Unset:"}</strong>{" "}
              {locale === "ar"
                ? "معايير القوة بتستخدم المتوسط العام. حدد نوعك عشان نحسب أرقامك بدقة:"
                : "Rank standards are currently using neutral averages. Set your gender for calibrated thresholds:"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSetGender("male")}
              className="px-3 py-1 rounded-lg bg-surface-container-high border border-border-subtle hover:border-amber-core text-on-surface hover:text-amber-core transition-colors cursor-pointer"
            >
              {locale === "ar" ? "ذكر" : "Male"}
            </button>
            <button
              onClick={() => handleSetGender("female")}
              className="px-3 py-1 rounded-lg bg-surface-container-high border border-border-subtle hover:border-amber-core text-on-surface hover:text-amber-core transition-colors cursor-pointer"
            >
              {locale === "ar" ? "أنثى" : "Female"}
            </button>
          </div>
        </div>
      )}

      {/* Bodyweight Missing Notice linking to Body Weight tab */}
      {!bodyweightKg && (
        <div className="bg-surface-container border border-border-subtle rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-text-muted">
            <Weight className="w-4 h-4 text-secondary-cyan shrink-0" />
            <span>
              {locale === "ar"
                ? "وزن الجسم غير مسجل. هنستخدم 75 كجم كافتراضي لحد ما تسجل وزنك."
                : "Bodyweight unset. Target thresholds will use 75kg default until logged."}
            </span>
          </div>
          <Link
            href="/body?tab=weight"
            className="text-xs font-mono text-secondary-cyan hover:underline flex items-center gap-1 font-bold"
          >
            <span>{locale === "ar" ? "سجل في ميزان الجسم" : "Log in Weight Engine"}</span>
            <span>&rarr;</span>
          </Link>
        </div>
      )}

      {/* Header Banner with Overall Strength Rank */}
      <div className="stitch-card p-6 relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rank-gold/15 border border-rank-gold/30 flex items-center justify-center text-rank-gold shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono text-on-surface">
                {locale === "ar" ? "معايير القوة ومصفوفة المستويات" : "Strength Standards & Tier Matrix"}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {locale === "ar"
                  ? `مضاعفات أوزان الجسم العلمية لـ 7 مستويات (${userGender ? (userGender === "male" ? "معايير الرجال" : "معايير السيدات") : "المتوسط العام"})`
                  : `Official 7-tier scientific bodyweight multipliers (${userGender ? (userGender === "male" ? "Men's Standards" : "Women's Standards") : "Neutral Averages"})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-surface-container-high px-3 py-2 rounded-xl border border-border-subtle text-xs font-mono">
            <Weight className="w-4 h-4 text-secondary-cyan" />
            <span className="text-text-muted">{locale === "ar" ? "الوزن الحالي:" : "Current BW:"}</span>
            <span className="font-bold text-on-surface">
              {bodyweightKg ? `${bodyweightKg} ${locale === "ar" ? "كجم" : "kg"}` : locale === "ar" ? "75 كجم (افتراضي)" : "75 kg (default)"}
            </span>
          </div>
        </div>

        {/* Overall Rank Summary */}
        {overallRank && (
          <div className="pt-3 border-t border-border-subtle/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/60 -mx-5 -mb-5 p-4 rounded-b-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rank-gold/10 border border-rank-gold/30 flex items-center justify-center text-rank-gold">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                  {locale === "ar" ? "تصنيف القوة الإجمالي" : "Overall Strength Rank"}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border ${getTierColor(
                      overallRank.overallTier
                    )}`}
                  >
                    {getTierTranslation(overallRank.overallTier)}
                  </span>
                  <span className="text-xs font-mono text-text-muted">
                    ({locale === "ar" ? "متوسط" : "Avg."} {overallRank.averageRatio.toFixed(2)}x {locale === "ar" ? "من وزن الجسم" : "BW"})
                  </span>
                </div>
                <BarbellSvg
                  decorative={true}
                  tier={overallRank.overallTier}
                  className="w-28 h-6 mt-1.5"
                />
              </div>
            </div>

            <div className="text-xs font-mono text-text-muted self-start sm:self-auto">
              {locale === "ar" ? "محسوب على " : "Based on "}
              <strong className="text-on-surface">
                {overallRank.liftsCount} {locale === "ar" ? "من" : "of"} {overallRank.maxLifts}
              </strong>{" "}
              {locale === "ar" ? "رفعات أساسية مسجلة" : "canonical ranked lifts"}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-2 text-crimson-alert text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary-ink" />
          <span className="text-xs font-mono">
            {locale === "ar" ? "جاري تحميل مصفوفة القوة من السيرفر..." : "Loading strength matrices from database..."}
          </span>
        </div>
      )}

      {!loading && liftSummaries.length > 0 && (
        <>
          {/* Strength Radar Profile & Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Visual Radar Profile */}
            <div className="lg:col-span-5 bg-surface-container border border-border-subtle rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary-ink" />
                    <h3 className="text-xs font-mono uppercase tracking-wider text-on-surface font-bold">
                      {locale === "ar" ? "بروفايل القوة العضلية" : "Kinetic Power Profile"}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">
                    {locale === "ar" ? "النسبة لوزن الجسم" : "Ratio to Bodyweight"}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted">
                  {locale === "ar"
                    ? "توزيع القوة وتوازن الحركات الأساسية الـ 6."
                    : "Geometric strength balance across the 6 canonical movements."}
                </p>
              </div>

              {/* Radar Graphic */}
              <div className="h-64 sm:h-72 w-full my-3 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#E3E5F0" />
                    <PolarAngleAxis
                      dataKey="lift"
                      tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "monospace" }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 2.5]}
                      tick={{ fill: "#64748B", fontSize: 9 }}
                      axisLine={false}
                    />
                    <Radar
                      name={locale === "ar" ? "نسبتك الحالية" : "Your Ratio"}
                      dataKey="userRatio"
                      stroke="#2563EB"
                      fill="#2563EB"
                      fillOpacity={0.4}
                    />
                    <Radar
                      name={locale === "ar" ? "المستوى الذهبي" : "Gold Standard"}
                      dataKey="gold"
                      stroke="#F5B301"
                      fill="#F5B301"
                      fillOpacity={0.08}
                      strokeDasharray="3 3"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1B2025",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontFamily: "monospace",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-4 text-[10px] font-mono border-t border-border-subtle pt-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-ink" />
                  <span className="text-on-surface">{locale === "ar" ? "نسبتك الحالية" : "Your Ratio"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-rank-gold" />
                  <span className="text-text-muted">{locale === "ar" ? "المعيار الذهبي" : "Gold Benchmark"}</span>
                </div>
              </div>
            </div>

            {/* Selected Lift Focus Detail */}
            {activeLift && (
              <div className="lg:col-span-7 bg-surface-container border border-border-subtle rounded-2xl p-5 space-y-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-primary-ink font-bold">
                        {locale === "ar" ? "تفاصيل المعايير للرفعة" : "Detailed Standard Breakdown"}
                      </span>
                      <h3 className="text-lg font-bold font-mono text-on-surface">
                        {getExerciseName(activeLift.key, activeLift.name)}
                      </h3>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-3 py-1 rounded-xl border ${getTierColor(
                        activeLift.currentTier
                      )}`}
                    >
                      {getTierTranslation(activeLift.currentTier)}
                    </span>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-3 my-4">
                    <div className="bg-surface-container-high p-3 rounded-xl border border-border-subtle">
                      <span className="text-[10px] font-mono text-text-muted block">
                        {locale === "ar" ? "أعلى رفعة PR 1RM" : "CURRENT PR 1RM"}
                      </span>
                      <span className="text-base font-bold font-mono text-primary-ink">
                        {activeLift.currentPR
                          ? activeLift.key === "pull_up" && activeLift.currentPR.e1rm_kg === 0
                            ? locale === "ar" ? "وزن الجسم صافي" : "Strict BW"
                            : `${activeLift.currentPR.e1rm_kg} ${locale === "ar" ? "كجم" : "kg"}`
                          : locale === "ar" ? "غير مسجل" : "Unlogged"}
                      </span>
                    </div>
                    <div className="bg-surface-container-high p-3 rounded-xl border border-border-subtle">
                      <span className="text-[10px] font-mono text-text-muted block">
                        {locale === "ar" ? "النسبة للوزن" : "BW RATIO"}
                      </span>
                      <span className="text-base font-bold font-mono text-secondary-cyan">
                        {activeLift.ratio > 0 ? `${activeLift.ratio.toFixed(2)}x` : "0.00x"}
                      </span>
                    </div>
                    <div className="bg-surface-container-high p-3 rounded-xl border border-border-subtle">
                      <span className="text-[10px] font-mono text-text-muted block">
                        {locale === "ar" ? "هدف المستوى الجاي" : "NEXT TIER TARGET"}
                      </span>
                      <span className="text-base font-bold font-mono text-on-surface">
                        {activeLift.nextTargetKg !== undefined
                          ? `${activeLift.nextTargetKg} ${locale === "ar" ? "كجم" : "kg"}`
                          : activeLift.isUnranked
                          ? locale === "ar" ? "غير مصنف" : "Unranked"
                          : locale === "ar" ? "مستر أولمبيا (القمة)" : "Mr. Olympia (Peak)"}
                      </span>
                    </div>
                  </div>

                  {/* Next Rank Progress Bar */}
                  {activeLift.nextTier && !activeLift.isUnranked && (
                    <div className="p-3.5 bg-surface-container-low border border-border-subtle rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-text-muted">
                          {locale === "ar" ? "التقدم نحو " : "Progression to "}
                          <span className="text-on-surface font-bold">
                            {getTierTranslation(activeLift.nextTier)}
                          </span>:
                        </span>
                        <span className="text-primary-ink font-bold">
                          {activeLift.kgToGo !== undefined
                            ? locale === "ar"
                              ? `ناقصك +${activeLift.kgToGo} كجم`
                              : `+${activeLift.kgToGo} kg needed`
                            : ""}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-ink rounded-full transition-all duration-500 shadow-xs"
                          style={{ width: `${activeLift.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {activeLift.isUnranked && activeLift.unrankedReason && (
                    <div className="p-3.5 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-text-muted">
                      {locale === "ar" ? "الحالة:" : "Status:"} <span className="text-on-surface font-semibold">{activeLift.unrankedReason}</span>
                    </div>
                  )}

                  {/* 7-Tier Standards Table for this Lift */}
                  {activeLift.standards.length > 0 && (
                    <div className="pt-3">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted block mb-2">
                        {locale === "ar"
                          ? `سلم المستويات الـ 7 (${effectiveBw} كجم وزن جسم)`
                          : `Visible 7-Tier Ladder (${effectiveBw} kg BW)`}
                      </span>
                      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-mono">
                        {activeLift.standards.map((s) => {
                          const requiredKg = Math.round(s.multiplier * effectiveBw * 10) / 10;
                          const isCurrentOrPassed = activeLift.ratio >= s.multiplier;

                          return (
                            <div
                              key={s.tier}
                              className={`p-2 rounded-xl border transition-all ${
                                isCurrentOrPassed
                                  ? "bg-primary-ink/10 border-primary-ink/40 text-on-surface font-semibold"
                                  : "bg-surface-container-low border-border-subtle text-text-muted"
                              }`}
                            >
                              <span className="text-[9px] block uppercase font-bold truncate">
                                {getTierTranslation(s.tier)}
                              </span>
                              <span className="text-xs font-bold font-mono text-on-surface block mt-0.5">
                                {requiredKg} {locale === "ar" ? "كجم" : "kg"}
                              </span>
                              <span className="text-[9px] text-text-muted block">
                                {s.multiplier}x
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-text-muted pt-2 border-t border-border-subtle">
                  <Info className="w-3.5 h-3.5 text-secondary-cyan shrink-0" />
                  <span>
                    {locale === "ar"
                      ? "أقل من المستوى البرونزي بيعتبر غير مصنف. نسبة العقلة بتتحسب بالأوزان الإضافية فقط."
                      : "Below Bronze ratio shows Unranked. Pull-up ratio uses added weight only."}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 6 Canonical Lifts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liftSummaries.map((lift) => (
              <div
                key={lift.id}
                onClick={() => setSelectedLift(lift.id)}
                className={`bg-surface-container rounded-2xl p-4 border transition-all cursor-pointer space-y-3 ${
                  selectedLift === lift.id
                    ? "border-primary-ink ring-1 ring-primary-ink/30 shadow-xs"
                    : "border-border-subtle hover:border-secondary-cyan/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold font-mono text-on-surface">
                      {getExerciseName(lift.key, lift.name)}
                    </h4>
                    <span className="text-[10px] font-mono text-text-muted capitalize">
                      {getMuscleTranslation(lift.muscle)}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${getTierColor(
                      lift.currentTier
                    )}`}
                  >
                    {getTierTranslation(lift.currentTier)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-surface-container-high p-2 rounded-xl border border-border-subtle">
                    <span className="text-[10px] text-text-muted block">
                      {locale === "ar" ? "رقمك القياسي 1RM" : "1RM RECORD"}
                    </span>
                    <span className="text-xs font-bold text-primary-ink">
                      {lift.currentPR
                        ? lift.key === "pull_up" && lift.currentPR.e1rm_kg === 0
                          ? locale === "ar" ? "وزن الجسم" : "Strict BW"
                          : `${lift.currentPR.e1rm_kg} ${locale === "ar" ? "كجم" : "kg"}`
                        : "-"}
                    </span>
                  </div>
                  <div className="bg-surface-container-high p-2 rounded-xl border border-border-subtle">
                    <span className="text-[10px] text-text-muted block">
                      {locale === "ar" ? "الهدف القادم" : "NEXT GOAL"}
                    </span>
                    <span className="text-xs font-bold text-on-surface">
                      {lift.nextTargetKg !== undefined
                        ? `${lift.nextTargetKg} ${locale === "ar" ? "كجم" : "kg"}`
                        : locale === "ar" ? "القمة" : "Peak"}
                    </span>
                  </div>
                </div>

                {/* Progress to next tier */}
                {lift.nextTier && !lift.isUnranked && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-text-muted">
                      <span>
                        {locale === "ar" ? "للوصول إلى " : "To "}
                        {getTierTranslation(lift.nextTier)}
                      </span>
                      <span>
                        {lift.kgToGo !== undefined
                          ? locale === "ar"
                            ? `+${lift.kgToGo} كجم`
                            : `+${lift.kgToGo} kg`
                          : ""}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-ink rounded-full"
                        style={{ width: `${lift.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
