"use client";

import React, { useState } from "react";
import { X, Check, Calculator, AlertTriangle, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import {
  calculateNutritionalTargets,
  getCalorieFloor,
  GoalPhase,
  CaloriePacing,
} from "@/lib/nutrition";

interface TargetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: {
    weightKg: number | null;
    heightCm: number | null;
    birthYear: number | null;
    sex: "male" | "female" | null;
    goalType: GoalPhase | null;
    caloriePacing: CaloriePacing | null;
    targetCalories: number | null;
    targetProteinG: number | null;
    targetCarbsG: number | null;
    targetFatsG: number | null;
    waterTargetMl: number | null;
  };
  onSaved: () => void;
}

export function TargetSettingsModal({
  isOpen,
  onClose,
  currentProfile,
  onSaved,
}: TargetSettingsModalProps) {
  const { isOnline, guardAction } = useOnlineGuard();

  const [mode, setMode] = useState<"calculate" | "manual">("calculate");

  // Anthropometrics state
  const [weightKg, setWeightKg] = useState<string>(
    currentProfile.weightKg ? String(currentProfile.weightKg) : ""
  );
  const [heightCm, setHeightCm] = useState<string>(
    currentProfile.heightCm ? String(currentProfile.heightCm) : ""
  );
  const [birthYear, setBirthYear] = useState<string>(
    currentProfile.birthYear ? String(currentProfile.birthYear) : ""
  );
  const [sex, setSex] = useState<"male" | "female" | "">(
    currentProfile.sex || ""
  );
  const [goalType, setGoalType] = useState<GoalPhase>(
    currentProfile.goalType || "cut"
  );
  const [caloriePacing, setCaloriePacing] = useState<CaloriePacing>(
    currentProfile.caloriePacing || "optimal"
  );

  // Manual targets state
  const [manualCalories, setManualCalories] = useState<string>(
    currentProfile.targetCalories ? String(currentProfile.targetCalories) : ""
  );
  const [manualProtein, setManualProtein] = useState<string>(
    currentProfile.targetProteinG ? String(currentProfile.targetProteinG) : ""
  );
  const [manualCarbs, setManualCarbs] = useState<string>(
    currentProfile.targetCarbsG ? String(currentProfile.targetCarbsG) : ""
  );
  const [manualFats, setManualFats] = useState<string>(
    currentProfile.targetFatsG ? String(currentProfile.targetFatsG) : ""
  );
  const [manualWater, setManualWater] = useState<string>(
    currentProfile.waterTargetMl ? String(currentProfile.waterTargetMl) : ""
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time calculation preview
  const preview = calculateNutritionalTargets({
    weightKg: weightKg ? parseFloat(weightKg) : null,
    heightCm: heightCm ? parseFloat(heightCm) : null,
    birthYear: birthYear ? parseInt(birthYear) : null,
    sex: sex === "male" || sex === "female" ? sex : null,
    goalType,
    caloriePacing,
  });

  const handleSave = async () => {
    guardAction(async () => {
      setSaving(true);
      setErrorMsg(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required");

        let updateData: Record<string, any> = {
          goal_type: goalType,
          calorie_pacing: caloriePacing,
          sex: sex || null,
          birth_year: birthYear ? parseInt(birthYear) : null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
        };

        if (weightKg) {
          updateData.current_weight_kg = parseFloat(weightKg);
        }

        if (mode === "calculate") {
          if (!preview.targets) {
            setErrorMsg(
              `Please fill in missing fields: ${preview.missingFields.join(", ")}`
            );
            setSaving(false);
            return;
          }
          updateData.target_calories = preview.targets.calories;
          updateData.target_protein_g = preview.targets.proteinGrams;
          updateData.target_carbs_g = preview.targets.carbsGrams;
          updateData.target_fats_g = preview.targets.fatsGrams;
          updateData.water_target_ml = preview.targets.waterTargetMl;
        } else {
          // Manual mode
          const cal = parseInt(manualCalories);
          const prot = parseInt(manualProtein);
          if (isNaN(cal) || cal <= 0 || isNaN(prot) || prot <= 0) {
            setErrorMsg("Calories and Protein are required in manual mode.");
            setSaving(false);
            return;
          }
          updateData.target_calories = cal;
          updateData.target_protein_g = prot;
          updateData.target_carbs_g = manualCarbs ? parseInt(manualCarbs) : 0;
          updateData.target_fats_g = manualFats ? parseInt(manualFats) : 0;
          updateData.water_target_ml = manualWater ? parseInt(manualWater) : 3000;
        }

        const { error } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", user.id);

        if (error) throw error;

        onSaved();
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to update profile targets.");
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-surface-container border border-border-subtle rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-secondary-cyan" />
            <h2 className="text-base font-bold font-mono text-on-surface">
              Nutrition & Macro Targets
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 my-4 p-1 bg-surface-container-lowest rounded-xl border border-border-subtle">
          <button
            onClick={() => setMode("calculate")}
            className={`py-2 text-xs font-mono font-semibold rounded-lg transition-all ${
              mode === "calculate"
                ? "bg-secondary-cyan text-charcoal-dark shadow-sm font-bold"
                : "text-text-muted hover:text-on-surface"
            }`}
          >
            Calculate from Stats
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`py-2 text-xs font-mono font-semibold rounded-lg transition-all ${
              mode === "manual"
                ? "bg-secondary-cyan text-charcoal-dark shadow-sm font-bold"
                : "text-text-muted hover:text-on-surface"
            }`}
          >
            Custom Manual Targets
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-[#F87171]/10 border border-[#F87171]/30 flex items-start gap-2.5 text-[#F87171] text-xs font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {mode === "calculate" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Bodyweight (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 78.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-secondary-cyan focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Height (cm) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 180"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-secondary-cyan focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Birth Year *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2002"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-secondary-cyan focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Biological Sex (optional)
                </label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-secondary-cyan focus:outline-none"
                >
                  <option value="">Neutral (Averaged)</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Goal Phase
                </label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value as GoalPhase)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-secondary-cyan focus:outline-none"
                >
                  <option value="cut">Cut (Fat Loss - 2.2g/kg Prot)</option>
                  <option value="bulk">Bulk (Hypertrophy - 2.0g/kg Prot)</option>
                  <option value="recomp">Recomp (Maintain - 2.0g/kg Prot)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Pacing Rate
                </label>
                <select
                  value={caloriePacing}
                  onChange={(e) => setCaloriePacing(e.target.value as CaloriePacing)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-secondary-cyan focus:outline-none"
                >
                  <option value="conservative">Conservative (0.25 kg/wk | ±275 kcal)</option>
                  <option value="optimal">Optimal (0.50 kg/wk | ±550 kcal)</option>
                  <option value="aggressive">Aggressive (0.75 kg/wk | ±825 kcal)</option>
                </select>
              </div>
            </div>

            {/* Live Calculation Preview Card */}
            {preview.targets ? (
              <div className="p-4 rounded-2xl bg-surface-container-high border border-secondary-cyan/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-secondary-cyan font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Estimated Target Preview
                  </span>
                  {preview.targets.calorieFloorApplied && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/30">
                      Floor Applied ({getCalorieFloor(sex || null)} kcal min)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 text-center font-mono">
                  <div className="p-2 rounded-xl bg-surface-container-lowest">
                    <div className="text-[10px] text-text-muted">Calories</div>
                    <div className="text-sm font-bold text-on-surface">
                      {preview.targets.calories}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-container-lowest">
                    <div className="text-[10px] text-text-muted">Protein</div>
                    <div className="text-sm font-bold text-primary-lime">
                      {preview.targets.proteinGrams}g
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-container-lowest">
                    <div className="text-[10px] text-text-muted">Carbs</div>
                    <div className="text-sm font-bold text-secondary-cyan">
                      {preview.targets.carbsGrams}g
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-container-lowest">
                    <div className="text-[10px] text-text-muted">Fats</div>
                    <div className="text-sm font-bold text-rank-gold">
                      {preview.targets.fatsGrams}g
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-text-muted flex justify-between pt-1">
                  <span>Water Target: {preview.targets.waterTargetMl} ml</span>
                  <span>Protein Rule: {goalType === "cut" ? "2.2 g/kg" : "2.0 g/kg"}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-border-subtle text-xs font-mono text-text-muted text-center">
                Enter weight, height, and birth year to calculate estimated targets.
              </div>
            )}
          </div>
        ) : (
          /* Manual Mode */
          <div className="space-y-4">
            <p className="text-xs font-mono text-text-muted">
              Specify your exact daily nutrition targets. These will not be overwritten by anthropometrics.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Daily Calories (kcal) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2400"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-secondary-cyan focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Daily Protein (g) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 165"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-secondary-cyan focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 260"
                  value={manualCarbs}
                  onChange={(e) => setManualCarbs(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-secondary-cyan focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Fats (g)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 65"
                  value={manualFats}
                  onChange={(e) => setManualFats(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-secondary-cyan focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Water (ml)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 3000"
                  value={manualWater}
                  onChange={(e) => setManualWater(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-secondary-cyan focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-mono text-xs text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-secondary-cyan text-charcoal-dark shadow-[0_0_15px_rgba(93,230,255,0.25)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Apply & Save Targets"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
