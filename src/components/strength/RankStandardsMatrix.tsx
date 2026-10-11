"use client";

import React, { useState, useEffect } from "react";
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
  determineTier,
  getTierColor,
} from "@/lib/strength";

interface DbStandard {
  id: string;
  exercise_id: string;
  tier: string;
  multiplier: number;
}

interface UserPR {
  exercise_id: string;
  e1rm_kg: number;
  bodyweight_kg: number;
  ratio: number;
  tier: string;
  achieved_at: string;
}

interface CanonicalLiftSummary {
  id: string;
  name: string;
  key: string;
  currentPR: UserPR | null;
  standards: { tier: string; multiplier: number }[];
  currentTier: string;
  ratio: number;
  nextTier?: string;
  nextTargetKg?: number;
  kgToGo?: number;
  progressPercent: number;
}

export function RankStandardsMatrix() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bodyweightKg, setBodyweightKg] = useState<number>(75);
  const [liftSummaries, setLiftSummaries] = useState<CanonicalLiftSummary[]>([]);
  const [selectedLift, setSelectedLift] = useState<string | null>(
    CANONICAL_EXERCISES[0].id
  );

  useEffect(() => {
    async function loadStandardsAndHistory() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch strength standards
        const { data: stdData, error: stdErr } = await supabase
          .from("strength_standards")
          .select("id, exercise_id, tier, multiplier")
          .eq("gender", "male")
          .order("multiplier", { ascending: true });

        if (stdErr) {
          throw new Error(`Failed to load standards: ${stdErr.message}`);
        }

        // 2. Fetch authenticated user's rank history
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let prMap: Record<string, UserPR> = {};

        if (user) {
          const { data: rankData, error: rankErr } = await supabase
            .from("user_rank_history")
            .select("exercise_id, e1rm_kg, bodyweight_kg, ratio, tier, achieved_at")
            .eq("user_id", user.id)
            .order("achieved_at", { ascending: false });

          if (!rankErr && rankData) {
            // Keep the best ratio PR for each exercise
            for (const r of rankData) {
              const exId = r.exercise_id;
              if (!prMap[exId] || Number(r.ratio) > Number(prMap[exId].ratio)) {
                prMap[exId] = {
                  exercise_id: exId,
                  e1rm_kg: Number(r.e1rm_kg),
                  bodyweight_kg: Number(r.bodyweight_kg),
                  ratio: Number(r.ratio),
                  tier: r.tier,
                  achieved_at: r.achieved_at,
                };
              }
            }

            // Set default bodyweight from latest PR
            if (rankData.length > 0 && rankData[0].bodyweight_kg) {
              setBodyweightKg(Number(rankData[0].bodyweight_kg));
            }
          }
        }

        // 3. Assemble summaries for the 6 canonical lifts
        const summaries: CanonicalLiftSummary[] = CANONICAL_EXERCISES.map((canonical) => {
          const exStandards = (stdData || [])
            .filter((s) => s.exercise_id === canonical.id)
            .sort((a, b) => a.multiplier - b.multiplier);

          const pr = prMap[canonical.id] || null;
          const currentE1rm = pr ? pr.e1rm_kg : 0;
          const userBw = pr ? pr.bodyweight_kg : bodyweightKg;

          const calculated = determineTier(
            canonical.id,
            currentE1rm,
            userBw,
            exStandards
          );

          let kgToGo: number | undefined;
          let progressPercent = 0;

          if (calculated.nextTargetKg && currentE1rm) {
            kgToGo = Math.max(0, Math.round((calculated.nextTargetKg - currentE1rm) * 10) / 10);
            const currentRatio = calculated.ratio;
            const nextStd = exStandards.find((s) => s.tier === calculated.nextTier);
            if (nextStd) {
              progressPercent = Math.min(100, Math.round((currentRatio / nextStd.multiplier) * 100));
            }
          }

          return {
            id: canonical.id,
            name: canonical.name,
            key: canonical.key,
            currentPR: pr,
            standards: exStandards,
            currentTier: calculated.tier,
            ratio: calculated.ratio,
            nextTier: calculated.nextTier,
            nextTargetKg: calculated.nextTargetKg,
            kgToGo,
            progressPercent,
          };
        });

        setLiftSummaries(summaries);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error loading standards";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    loadStandardsAndHistory();
  }, [bodyweightKg]);

  // Recalculate summaries when user edits bodyweight
  const handleBodyweightChange = (newBw: number) => {
    setBodyweightKg(newBw);
    setLiftSummaries((prev) =>
      prev.map((item) => {
        const currentE1rm = item.currentPR ? item.currentPR.e1rm_kg : 0;
        const calculated = determineTier(item.id, currentE1rm, newBw, item.standards);
        let kgToGo: number | undefined;
        let progressPercent = 0;

        if (calculated.nextTargetKg && currentE1rm) {
          kgToGo = Math.max(0, Math.round((calculated.nextTargetKg - currentE1rm) * 10) / 10);
          const nextStd = item.standards.find((s) => s.tier === calculated.nextTier);
          if (nextStd) {
            progressPercent = Math.min(100, Math.round((calculated.ratio / nextStd.multiplier) * 100));
          }
        }

        return {
          ...item,
          currentTier: calculated.tier,
          ratio: calculated.ratio,
          nextTier: calculated.nextTier,
          nextTargetKg: calculated.nextTargetKg,
          kgToGo,
          progressPercent,
        };
      })
    );
  };

  // Prepare radar chart data
  const radarData = liftSummaries.map((item) => {
    // Short clean name for axis
    const shortNames: Record<string, string> = {
      bench_press: "Bench",
      squat: "Squat",
      deadlift: "Deadlift",
      overhead_press: "OHP",
      pull_up: "Pull-up",
      barbell_row: "Row",
    };

    const intermediateStd = item.standards.find((s) => s.tier === "Intermediate")?.multiplier || 1.0;
    const advancedStd = item.standards.find((s) => s.tier === "Advanced")?.multiplier || 1.25;

    return {
      lift: shortNames[item.key] || item.name,
      userRatio: item.ratio,
      intermediate: intermediateStd,
      advanced: advancedStd,
    };
  });

  const activeLift = liftSummaries.find((l) => l.id === selectedLift) || liftSummaries[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rank-gold/15 border border-rank-gold/30 flex items-center justify-center text-rank-gold shadow-[0_0_20px_rgba(255,215,0,0.15)]">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono text-on-surface">
                Strength Standards & Tier Matrix
              </h2>
              <p className="text-xs text-on-surface-variant">
                Scientific bodyweight multipliers across the 6 canonical compound lifts
              </p>
            </div>
          </div>

          {/* Interactive Bodyweight Calibration */}
          <div className="flex items-center gap-2 bg-surface-container-high px-3 py-2 rounded-xl border border-border-subtle self-start sm:self-auto">
            <Weight className="w-4 h-4 text-secondary-cyan" />
            <span className="text-xs font-mono text-text-muted">Target BW:</span>
            <input
              type="number"
              value={bodyweightKg}
              onChange={(e) => handleBodyweightChange(Math.max(30, Number(e.target.value)))}
              className="w-14 text-xs font-mono font-bold text-on-surface bg-transparent focus:outline-none text-right"
            />
            <span className="text-xs font-mono text-text-muted">kg</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-2 text-crimson-alert text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary-lime" />
          <span className="text-xs font-mono">Loading strength matrices from database...</span>
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
                    <BarChart2 className="w-4 h-4 text-primary-lime" />
                    <h3 className="text-xs font-mono uppercase tracking-wider text-on-surface font-bold">
                      Kinetic Power Profile
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">
                    Ratio to Bodyweight
                  </span>
                </div>
                <p className="text-[11px] text-text-muted">
                  Geometric strength balance across the 6 canonical movements.
                </p>
              </div>

              {/* Radar Graphic */}
              <div className="h-64 sm:h-72 w-full my-3 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                    <PolarAngleAxis
                      dataKey="lift"
                      tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "monospace" }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 2]}
                      tick={{ fill: "#64748B", fontSize: 9 }}
                      axisLine={false}
                    />
                    <Radar
                      name="Your Ratio"
                      dataKey="userRatio"
                      stroke="#C6FF3D"
                      fill="#C6FF3D"
                      fillOpacity={0.4}
                    />
                    <Radar
                      name="Intermediate Standard"
                      dataKey="intermediate"
                      stroke="#5DE6FF"
                      fill="#5DE6FF"
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
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-lime" />
                  <span className="text-on-surface">Your 1RM Ratio</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-secondary-cyan" />
                  <span className="text-text-muted">Intermediate Target</span>
                </div>
              </div>
            </div>

            {/* Selected Lift Focus Detail */}
            {activeLift && (
              <div className="lg:col-span-7 bg-surface-container border border-border-subtle rounded-2xl p-5 space-y-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-primary-lime font-bold">
                        Detailed Standard Breakdown
                      </span>
                      <h3 className="text-lg font-bold font-mono text-on-surface">
                        {activeLift.name}
                      </h3>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-3 py-1 rounded-xl border ${getTierColor(
                        activeLift.currentTier
                      )}`}
                    >
                      {activeLift.currentTier}
                    </span>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-3 my-4">
                    <div className="bg-surface-container-high p-3 rounded-xl border border-border-subtle">
                      <span className="text-[10px] font-mono text-text-muted block">CURRENT PR 1RM</span>
                      <span className="text-base font-bold font-mono text-primary-lime">
                        {activeLift.currentPR ? `${activeLift.currentPR.e1rm_kg} kg` : "Unlogged"}
                      </span>
                    </div>
                    <div className="bg-surface-container-high p-3 rounded-xl border border-border-subtle">
                      <span className="text-[10px] font-mono text-text-muted block">BW RATIO</span>
                      <span className="text-base font-bold font-mono text-secondary-cyan">
                        {activeLift.ratio > 0 ? `${activeLift.ratio.toFixed(2)}x` : "0.00x"}
                      </span>
                    </div>
                    <div className="bg-surface-container-high p-3 rounded-xl border border-border-subtle">
                      <span className="text-[10px] font-mono text-text-muted block">NEXT TIER TARGET</span>
                      <span className="text-base font-bold font-mono text-on-surface">
                        {activeLift.nextTargetKg ? `${activeLift.nextTargetKg} kg` : "Max Tier"}
                      </span>
                    </div>
                  </div>

                  {/* Next Rank Progress Bar */}
                  {activeLift.nextTier && (
                    <div className="p-3.5 bg-surface-container-low border border-border-subtle rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-text-muted">
                          Progression to <span className="text-on-surface font-bold">{activeLift.nextTier}</span>:
                        </span>
                        <span className="text-primary-lime font-bold">
                          {activeLift.kgToGo !== undefined ? `+${activeLift.kgToGo} kg needed` : ""}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-lime rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(198,255,61,0.4)]"
                          style={{ width: `${activeLift.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Standards Table for this Lift */}
                  <div className="pt-3">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted block mb-2">
                      Tier Multipliers for {bodyweightKg} kg Bodyweight
                    </span>
                    <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono">
                      {activeLift.standards.map((s) => {
                        const requiredKg = Math.round(s.multiplier * bodyweightKg * 10) / 10;
                        const isCurrentOrPassed = activeLift.ratio >= s.multiplier;

                        return (
                          <div
                            key={s.tier}
                            className={`p-2.5 rounded-xl border transition-all ${
                              isCurrentOrPassed
                                ? "bg-primary-lime/10 border-primary-lime/40 text-on-surface font-semibold"
                                : "bg-surface-container-low border-border-subtle text-text-muted"
                            }`}
                          >
                            <span className="text-[10px] block uppercase font-bold truncate">
                              {s.tier}
                            </span>
                            <span className="text-xs font-bold font-mono text-on-surface block mt-1">
                              {requiredKg} kg
                            </span>
                            <span className="text-[10px] text-text-muted block">
                              {s.multiplier}x
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-text-muted pt-2 border-t border-border-subtle">
                  <Info className="w-3.5 h-3.5 text-secondary-cyan shrink-0" />
                  <span>
                    Select any lift card below to view detailed breakdown and tier milestones.
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
                    ? "border-primary-lime ring-1 ring-primary-lime/30 shadow-[0_0_20px_rgba(198,255,61,0.15)]"
                    : "border-border-subtle hover:border-secondary-cyan/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold font-mono text-on-surface">
                      {lift.name}
                    </h4>
                    <span className="text-[10px] font-mono text-text-muted capitalize">
                      Key: {lift.key}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${getTierColor(
                      lift.currentTier
                    )}`}
                  >
                    {lift.currentTier}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-surface-container-high p-2 rounded-xl border border-border-subtle">
                    <span className="text-[10px] text-text-muted block">1RM RECORD</span>
                    <span className="text-xs font-bold text-primary-lime">
                      {lift.currentPR ? `${lift.currentPR.e1rm_kg} kg` : "-"}
                    </span>
                  </div>
                  <div className="bg-surface-container-high p-2 rounded-xl border border-border-subtle">
                    <span className="text-[10px] text-text-muted block">NEXT GOAL</span>
                    <span className="text-xs font-bold text-on-surface">
                      {lift.nextTargetKg ? `${lift.nextTargetKg} kg` : "Peak"}
                    </span>
                  </div>
                </div>

                {/* Progress to next tier */}
                {lift.nextTier && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-text-muted">
                      <span>To {lift.nextTier}</span>
                      <span>{lift.kgToGo !== undefined ? `+${lift.kgToGo} kg` : ""}</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-lime rounded-full"
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
