/**
 * Nutrition, Macro Telemetry & Intake Engine
 * Obsidian Kinetic Design System - Life Web App
 */

export type GoalPhase = "cut" | "bulk" | "recomp";
export type CaloriePacing = "conservative" | "optimal" | "aggressive";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type ConfidenceTier = "high" | "medium" | "low" | "could_not_estimate";
export type FoodSource = "dictionary" | "ai" | "manual";

export interface MacroTargets {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  waterTargetMl: number;
  isEstimated: boolean;
  calorieFloorApplied: boolean;
}

export interface ParsedFoodItem {
  food_name: string;
  quantity: number;
  unit: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  confidence: ConfidenceTier;
  source: FoodSource;
  note?: string;
}

export interface MealLogEntry {
  id: string;
  user_id?: string;
  logged_date: string; // YYYY-MM-DD in local user timezone
  meal_type: MealType;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number | null;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  source: FoodSource;
  confidence: ConfidenceTier;
  raw_query?: string;
  logged_at: string; // ISO string
  created_at?: string;
  deleted_at?: string | null;
}

export interface IntakeLogEntry {
  id: string;
  user_id?: string;
  type: "water" | "caffeine";
  amount: number; // ml for water, mg for caffeine
  logged_at: string; // ISO string
  created_at?: string;
  deleted_at?: string | null;
}

/**
 * Calculates Calorie Floor based on sex
 */
export function getCalorieFloor(sex?: "male" | "female" | null): number {
  if (sex === "male") return 1500;
  if (sex === "female") return 1200;
  return 1350; // Midpoint when sex is unconfigured
}

/**
 * Calculates Goal-Aware Targets from Anthropometrics.
 * Returns null if weight, height, or birthYear is missing (NO fake defaults!).
 */
export function calculateNutritionalTargets(params: {
  weightKg: number | null;
  heightCm: number | null;
  birthYear: number | null;
  sex?: "male" | "female" | null;
  goalType?: GoalPhase | null;
  caloriePacing?: CaloriePacing | null;
  customTargets?: {
    calories?: number | null;
    proteinGrams?: number | null;
    carbsGrams?: number | null;
    fatsGrams?: number | null;
    waterTargetMl?: number | null;
  } | null;
}): { targets: MacroTargets | null; isConfigured: boolean; missingFields: string[] } {
  // If user provided manual custom targets, prioritize them
  if (
    params.customTargets &&
    params.customTargets.calories &&
    params.customTargets.proteinGrams
  ) {
    return {
      targets: {
        calories: params.customTargets.calories,
        proteinGrams: params.customTargets.proteinGrams,
        carbsGrams: params.customTargets.carbsGrams || 0,
        fatsGrams: params.customTargets.fatsGrams || 0,
        waterTargetMl: params.customTargets.waterTargetMl || 3000,
        isEstimated: false,
        calorieFloorApplied: false,
      },
      isConfigured: true,
      missingFields: [],
    };
  }

  const missing: string[] = [];
  if (!params.weightKg || params.weightKg <= 30) missing.push("weight");
  if (!params.heightCm || params.heightCm <= 100) missing.push("height");
  if (!params.birthYear || params.birthYear <= 1920) missing.push("birth year");

  if (missing.length > 0) {
    return { targets: null, isConfigured: false, missingFields: missing };
  }

  const weight = params.weightKg!;
  const height = params.heightCm!;
  const currentYear = new Date().getFullYear();
  const age = Math.max(15, currentYear - params.birthYear!);

  // BMR Calculation (Mifflin-St Jeor)
  // Male: 10*W + 6.25*H - 5*Age + 5
  // Female: 10*W + 6.25*H - 5*Age - 161
  // Neutral: average -> 10*W + 6.25*H - 5*Age - 78
  let bmr: number;
  if (params.sex === "male") {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (params.sex === "female") {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 78;
  }

  const tdee = Math.round(bmr * 1.45); // Moderate activity multiplier

  // Pacing adjustment
  let pacingDelta = 550; // Optimal default (0.5 kg/week)
  if (params.caloriePacing === "conservative") pacingDelta = 275;
  if (params.caloriePacing === "aggressive") pacingDelta = 825;

  let targetCalories = tdee;
  const goal = params.goalType || "recomp";
  if (goal === "cut") {
    targetCalories = tdee - pacingDelta;
  } else if (goal === "bulk") {
    targetCalories = tdee + pacingDelta;
  }

  // Enforce Calorie Floor
  const floor = getCalorieFloor(params.sex);
  let calorieFloorApplied = false;
  if (targetCalories < floor) {
    targetCalories = floor;
    calorieFloorApplied = true;
  }

  // Protein Rule: 2.2 g/kg on a cut, 2.0 g/kg otherwise
  const proteinMultiplier = goal === "cut" ? 2.2 : 2.0;
  const proteinGrams = Math.round(weight * proteinMultiplier);
  const proteinKcal = proteinGrams * 4;

  // Fats: 25% of target calories
  const fatsKcal = targetCalories * 0.25;
  const fatsGrams = Math.round(fatsKcal / 9);

  // Carbs: Remainder of calories
  const carbsKcal = Math.max(0, targetCalories - (proteinKcal + fatsGrams * 9));
  const carbsGrams = Math.round(carbsKcal / 4);

  // Water target: 35 ml per kg, min 2500 ml
  const waterTargetMl = Math.max(2500, Math.round(weight * 35));

  return {
    targets: {
      calories: targetCalories,
      proteinGrams,
      carbsGrams,
      fatsGrams,
      waterTargetMl,
      isEstimated: true,
      calorieFloorApplied,
    },
    isConfigured: true,
    missingFields: [],
  };
}

/**
 * Rescales item nutrients proportionally based on new quantity
 */
export function rescaleItemNutrients(
  item: { quantity: number; calories: number | null; protein_g: number | null; carbs_g: number | null; fats_g: number | null },
  newQuantity: number
): { quantity: number; calories: number | null; protein_g: number | null; carbs_g: number | null; fats_g: number | null } {
  if (item.quantity <= 0 || newQuantity <= 0) return { ...item, quantity: newQuantity };
  const ratio = newQuantity / item.quantity;

  return {
    quantity: newQuantity,
    calories: item.calories !== null ? Math.round(item.calories * ratio) : null,
    protein_g: item.protein_g !== null ? Math.round(item.protein_g * ratio * 10) / 10 : null,
    carbs_g: item.carbs_g !== null ? Math.round(item.carbs_g * ratio * 10) / 10 : null,
    fats_g: item.fats_g !== null ? Math.round(item.fats_g * ratio * 10) / 10 : null,
  };
}

/**
 * Derives local YYYY-MM-DD date from ISO timestamp and user's timezone
 */
export function getLocalDateString(isoTimestamp: string | Date, timezone: string = "UTC"): string {
  try {
    const d = new Date(isoTimestamp);
    // Format into user's timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(d); // Returns YYYY-MM-DD
  } catch {
    const d = new Date(isoTimestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

/**
 * Evaluates whether a caffeine log exceeds the user's circadian cutoff
 */
export function evaluateCaffeineCutoff(
  loggedAtIso: string,
  targetBedtime: string = "23:00",
  cutoffHoursBeforeBed: number = 10,
  timezone: string = "UTC"
): { isAfterCutoff: boolean; cutoffTimeFormatted: string } {
  const [bedH, bedM] = targetBedtime.split(":").map(Number);
  const bedTotalMins = bedH * 60 + (bedM || 0);

  let cutoffTotalMins = bedTotalMins - cutoffHoursBeforeBed * 60;
  if (cutoffTotalMins < 0) cutoffTotalMins += 1440;

  const cHour = Math.floor(cutoffTotalMins / 60);
  const cMin = cutoffTotalMins % 60;
  const ampm = cHour >= 12 ? "PM" : "AM";
  const displayH = cHour % 12 || 12;
  const displayM = cMin.toString().padStart(2, "0");
  const cutoffTimeFormatted = `${displayH}:${displayM} ${ampm}`;

  // Logged time in user's timezone
  let logHour = new Date(loggedAtIso).getHours();
  let logMin = new Date(loggedAtIso).getMinutes();

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date(loggedAtIso));
    const hPart = parts.find((p) => p.type === "hour");
    const mPart = parts.find((p) => p.type === "minute");
    if (hPart) logHour = parseInt(hPart.value);
    if (mPart) logMin = parseInt(mPart.value);
  } catch {
    // Fallback to Date methods
  }

  const logTotalMins = logHour * 60 + logMin;
  const isAfterCutoff = logTotalMins >= cutoffTotalMins && logTotalMins <= bedTotalMins;

  return { isAfterCutoff, cutoffTimeFormatted };
}

/**
 * Grounding dictionary for English, Arabic, and Franco-Arab foods
 */
export const CANONICAL_FOODS_DICTIONARY: Record<
  string,
  { name: string; calories: number; protein: number; carbs: number; fats: number; defaultUnit: string; baseQty: number }
> = {
  // Egyptian Staples
  koshari: { name: "Koshari", calories: 650, protein: 18, carbs: 110, fats: 14, defaultUnit: "plate", baseQty: 1 },
  kosharry: { name: "Koshari", calories: 650, protein: 18, carbs: 110, fats: 14, defaultUnit: "plate", baseQty: 1 },
  "كشري": { name: "Koshari", calories: 650, protein: 18, carbs: 110, fats: 14, defaultUnit: "plate", baseQty: 1 },
  ful: { name: "Ful Mudammas", calories: 280, protein: 15, carbs: 35, fats: 9, defaultUnit: "bowl", baseQty: 1 },
  fool: { name: "Ful Mudammas", calories: 280, protein: 15, carbs: 35, fats: 9, defaultUnit: "bowl", baseQty: 1 },
  foul: { name: "Ful Mudammas", calories: 280, protein: 15, carbs: 35, fats: 9, defaultUnit: "bowl", baseQty: 1 },
  "فول": { name: "Ful Mudammas", calories: 280, protein: 15, carbs: 35, fats: 9, defaultUnit: "bowl", baseQty: 1 },
  taameya: { name: "Taameya (Egyptian Falafel)", calories: 210, protein: 7, carbs: 20, fats: 11, defaultUnit: "pieces", baseQty: 3 },
  falafel: { name: "Falafel", calories: 210, protein: 7, carbs: 20, fats: 11, defaultUnit: "pieces", baseQty: 3 },
  ta3meya: { name: "Taameya", calories: 210, protein: 7, carbs: 20, fats: 11, defaultUnit: "pieces", baseQty: 3 },
  "طعمية": { name: "Taameya", calories: 210, protein: 7, carbs: 20, fats: 11, defaultUnit: "pieces", baseQty: 3 },
  "فلافل": { name: "Falafel", calories: 210, protein: 7, carbs: 20, fats: 11, defaultUnit: "pieces", baseQty: 3 },
  hawawshi: { name: "Hawawshi", calories: 520, protein: 28, carbs: 45, fats: 26, defaultUnit: "loaf", baseQty: 1 },
  "حواوشي": { name: "Hawawshi", calories: 520, protein: 28, carbs: 45, fats: 26, defaultUnit: "loaf", baseQty: 1 },
  molokhia: { name: "Molokhia", calories: 110, protein: 6, carbs: 10, fats: 5, defaultUnit: "bowl", baseQty: 1 },
  "ملوخية": { name: "Molokhia", calories: 110, protein: 6, carbs: 10, fats: 5, defaultUnit: "bowl", baseQty: 1 },

  // Common Fitness Proteins & Carbs
  egg: { name: "Whole Egg", calories: 72, protein: 6.3, carbs: 0.4, fats: 4.8, defaultUnit: "egg", baseQty: 1 },
  eggs: { name: "Whole Eggs", calories: 72, protein: 6.3, carbs: 0.4, fats: 4.8, defaultUnit: "egg", baseQty: 1 },
  "بيض": { name: "Whole Egg", calories: 72, protein: 6.3, carbs: 0.4, fats: 4.8, defaultUnit: "egg", baseQty: 1 },
  bayd: { name: "Whole Egg", calories: 72, protein: 6.3, carbs: 0.4, fats: 4.8, defaultUnit: "egg", baseQty: 1 },
  "baydat": { name: "Whole Eggs", calories: 72, protein: 6.3, carbs: 0.4, fats: 4.8, defaultUnit: "egg", baseQty: 1 },
  "chicken breast": { name: "Chicken Breast", calories: 165, protein: 31, carbs: 0, fats: 3.6, defaultUnit: "100g", baseQty: 1 },
  chicken: { name: "Chicken Breast", calories: 165, protein: 31, carbs: 0, fats: 3.6, defaultUnit: "100g", baseQty: 1 },
  "صدور دجاج": { name: "Chicken Breast", calories: 165, protein: 31, carbs: 0, fats: 3.6, defaultUnit: "100g", baseQty: 1 },
  ferakh: { name: "Chicken Breast", calories: 165, protein: 31, carbs: 0, fats: 3.6, defaultUnit: "100g", baseQty: 1 },
  rice: { name: "White Rice (Cooked)", calories: 130, protein: 2.7, carbs: 28, fats: 0.3, defaultUnit: "100g", baseQty: 1 },
  "أرز": { name: "White Rice", calories: 130, protein: 2.7, carbs: 28, fats: 0.3, defaultUnit: "100g", baseQty: 1 },
  roz: { name: "White Rice", calories: 130, protein: 2.7, carbs: 28, fats: 0.3, defaultUnit: "100g", baseQty: 1 },
  sourdough: { name: "Sourdough Toast", calories: 90, protein: 3, carbs: 17, fats: 0.7, defaultUnit: "slice", baseQty: 1 },
  toast: { name: "Toast Slice", calories: 80, protein: 2.5, carbs: 15, fats: 1, defaultUnit: "slice", baseQty: 1 },
  bread: { name: "Bread", calories: 160, protein: 5, carbs: 32, fats: 1.5, defaultUnit: "loaf", baseQty: 1 },
  "عيش": { name: "Egyptian Bread (Aish)", calories: 200, protein: 6, carbs: 42, fats: 1.2, defaultUnit: "loaf", baseQty: 1 },
  oats: { name: "Rolled Oats", calories: 190, protein: 6.5, carbs: 33, fats: 3.5, defaultUnit: "50g", baseQty: 1 },
  "شوفان": { name: "Rolled Oats", calories: 190, protein: 6.5, carbs: 33, fats: 3.5, defaultUnit: "50g", baseQty: 1 },
  butter: { name: "Butter", calories: 108, protein: 0.1, carbs: 0, fats: 12, defaultUnit: "15g", baseQty: 1 },
  "زبدة": { name: "Butter", calories: 108, protein: 0.1, carbs: 0, fats: 12, defaultUnit: "15g", baseQty: 1 },
  whey: { name: "Whey Protein Isolate", calories: 120, protein: 24, carbs: 2, fats: 1.5, defaultUnit: "scoop", baseQty: 1 },
  "بروتين": { name: "Whey Protein", calories: 120, protein: 24, carbs: 2, fats: 1.5, defaultUnit: "scoop", baseQty: 1 },
  "flat white": { name: "Flat White Coffee", calories: 120, protein: 6, carbs: 9, fats: 6, defaultUnit: "cup", baseQty: 1 },
  latte: { name: "Caffe Latte", calories: 140, protein: 7, carbs: 12, fats: 7, defaultUnit: "cup", baseQty: 1 },
  espresso: { name: "Espresso", calories: 5, protein: 0.5, carbs: 1, fats: 0, defaultUnit: "shot", baseQty: 1 },
  "قهوة": { name: "Coffee", calories: 5, protein: 0.5, carbs: 1, fats: 0, defaultUnit: "cup", baseQty: 1 },
};

/**
 * Deterministic Local Matcher for Common Foods
 */
export function matchDictionaryFood(query: string): ParsedFoodItem | null {
  const clean = query.trim().toLowerCase();

  // Try exact dictionary key match
  for (const [key, item] of Object.entries(CANONICAL_FOODS_DICTIONARY)) {
    if (clean === key || clean.includes(key)) {
      // Look for a leading number (e.g. "3 eggs" or "2 slices")
      const numMatch = clean.match(/^(\d+(?:\.\d+)?)/);
      const qty = numMatch ? parseFloat(numMatch[1]) : item.baseQty;
      const ratio = qty / item.baseQty;

      return {
        food_name: item.name,
        quantity: qty,
        unit: item.defaultUnit,
        calories: Math.round(item.calories * ratio),
        protein_g: Math.round(item.protein * ratio * 10) / 10,
        carbs_g: Math.round(item.carbs * ratio * 10) / 10,
        fats_g: Math.round(item.fats * ratio * 10) / 10,
        confidence: "high",
        source: "dictionary",
      };
    }
  }

  return null;
}
