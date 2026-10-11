/**
 * Nutrition, Macro Telemetry & Intake Engine
 * Obsidian Kinetic Design System - Life Web App
 */

export type GoalPhase = "cut" | "bulk" | "recomp";
export type CaloriePacing = "conservative" | "optimal" | "aggressive";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type ConfidenceTier = "high" | "medium" | "low" | "could_not_estimate";
export type FoodSource = "dictionary" | "ai" | "manual" | "saved";

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

// ==============================================================================
// STAGE 6b: SAVED MEALS, FREQUENT FOODS & NUTRITION ANALYTICS
// ==============================================================================

export interface SavedMealItem {
  food_name: string;
  quantity: number;
  unit: string;
  calories: number | null;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  source?: FoodSource;
}

export interface SavedMeal {
  id: string;
  user_id?: string;
  name: string;
  meal_type: MealType;
  items: SavedMealItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fats_g: number;
  is_favorite: boolean;
  created_at?: string;
  deleted_at?: string | null;
}

export interface FrequentFoodItem {
  normalized_name: string;
  display_name: string;
  frequency: number;
  typical_quantity: number;
  typical_unit: string;
  typical_calories: number;
  typical_protein_g: number;
  typical_carbs_g: number;
  typical_fats_g: number;
  source: FoodSource;
}

/**
 * Normalizes food names across whitespace, casing, and common Arabic/English spellings
 */
export function normalizeFoodName(name: string): string {
  if (!name) return "";
  let s = name.trim().toLowerCase();

  // Strip Arabic diacritics / tashkeel
  s = s.replace(/[\u064B-\u065F\u0670]/g, "");

  // Normalize Arabic letter variants
  s = s.replace(/[أإآ]/g, "ا");
  s = s.replace(/ة/g, "ه");
  s = s.replace(/ى/g, "ي");

  // Normalize common bilingual synonyms
  const SYNONYMS: Record<string, string> = {
    koshary: "koshari",
    kosharry: "koshari",
    "كشري": "koshari",
    fool: "ful",
    foul: "ful",
    "فول": "ful",
    ta3meya: "taameya",
    "طعميه": "taameya",
    "طعمية": "taameya",
    falafel: "taameya",
    "فلافل": "taameya",
    "حواوشي": "hawawshi",
    "حواوشى": "hawawshi",
    "ملوخية": "molokhia",
    "ملوخيه": "molokhia",
    eggs: "egg",
    bayd: "egg",
    baydat: "egg",
    "بيض": "egg",
    ferakh: "chicken",
    "فراخ": "chicken",
    "صدور دجاج": "chicken",
    "دجاج": "chicken",
    roz: "rice",
    "ارز": "rice",
    "رز": "rice",
    toast: "bread",
    "عيش": "bread",
    "شوفان": "oats",
  };

  return SYNONYMS[s] || s;
}

/**
 * Validates saved meal JSONB items structure and data integrity
 */
export function validateSavedMealItems(items: any[]): {
  isValid: boolean;
  error?: string;
  cleanItems: SavedMealItem[];
} {
  if (!Array.isArray(items) || items.length === 0) {
    return { isValid: false, error: "Meal must have at least one food item.", cleanItems: [] };
  }

  const cleanItems: SavedMealItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== "object") {
      return { isValid: false, error: `Invalid item at index ${i}`, cleanItems: [] };
    }

    const name = String(item.food_name || "").trim();
    if (!name) {
      return { isValid: false, error: `Item at index ${i} is missing food name`, cleanItems: [] };
    }

    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      return { isValid: false, error: `Item "${name}" has invalid quantity`, cleanItems: [] };
    }

    const unit = String(item.unit || "serving").trim();

    const cal = item.calories !== null && item.calories !== undefined ? Number(item.calories) : null;
    if (cal !== null && (isNaN(cal) || cal < 0)) {
      return { isValid: false, error: `Item "${name}" has negative calories`, cleanItems: [] };
    }

    const p = Math.max(0, Number(item.protein_g) || 0);
    const c = Math.max(0, Number(item.carbs_g) || 0);
    const f = Math.max(0, Number(item.fats_g) || 0);

    cleanItems.push({
      food_name: name,
      quantity: Math.round(qty * 100) / 100,
      unit,
      calories: cal !== null ? Math.round(cal) : null,
      protein_g: Math.round(p * 10) / 10,
      carbs_g: Math.round(c * 10) / 10,
      fats_g: Math.round(f * 10) / 10,
      source: item.source || "manual",
    });
  }

  return { isValid: true, cleanItems };
}

/**
 * Computes consistent meal totals from verified items
 */
export function computeSavedMealTotals(items: SavedMealItem[]): {
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fats_g: number;
} {
  let cals = 0;
  let p = 0;
  let c = 0;
  let f = 0;

  for (const it of items) {
    if (it.calories !== null) cals += it.calories;
    p += it.protein_g || 0;
    c += it.carbs_g || 0;
    f += it.fats_g || 0;
  }

  return {
    total_calories: Math.round(cals),
    total_protein_g: Math.round(p * 10) / 10,
    total_carbs_g: Math.round(c * 10) / 10,
    total_fats_g: Math.round(f * 10) / 10,
  };
}

/**
 * Scales saved meal items by a multiplier (e.g. 0.5x, 1x, 1.5x, 2x)
 */
export function scaleSavedMealItems(items: SavedMealItem[], multiplier: number): SavedMealItem[] {
  if (multiplier <= 0) multiplier = 1;
  return items.map((it) => ({
    ...it,
    quantity: Math.round(it.quantity * multiplier * 100) / 100,
    calories: it.calories !== null ? Math.round(it.calories * multiplier) : null,
    protein_g: Math.round(it.protein_g * multiplier * 10) / 10,
    carbs_g: Math.round(it.carbs_g * multiplier * 10) / 10,
    fats_g: Math.round(it.fats_g * multiplier * 10) / 10,
  }));
}

/**
 * Protein Per Meal guideline: 0.4 g/kg if bodyweight exists, otherwise 30g
 */
export function calculateProteinPerMealGuideline(weightKg?: number | null): number {
  if (weightKg && weightKg >= 30) {
    return Math.round(weightKg * 0.4);
  }
  return 30;
}

/**
 * Evaluates meal protein against general guideline with neutral tone (no snack shaming)
 */
export function evaluateMealProtein(
  proteinG: number,
  guidelineG: number,
  isSnack: boolean = false
): {
  isSnack: boolean;
  meetsGuideline: boolean;
  label: string;
  diffG: number;
} {
  const p = Math.round(proteinG * 10) / 10;
  const diff = Math.round((p - guidelineG) * 10) / 10;

  if (isSnack) {
    return {
      isSnack: true,
      meetsGuideline: false,
      label: `Snack: ${p}g protein`,
      diffG: diff,
    };
  }

  const meets = p >= guidelineG;
  return {
    isSnack: false,
    meetsGuideline: meets,
    label: meets
      ? `Guideline met (${p}g / ${guidelineG}g)`
      : `Below guideline (${p}g / ${guidelineG}g)`,
    diffG: diff,
  };
}

/**
 * Determines whether a day qualifies for adherence and weekly averages
 * (Day qualifies when total calories >= 800 (or >= 40% of target), or mealCount >= 3, or marked complete)
 */
export function isQualifyingDay(
  day: { totalCalories: number; mealCount: number; isMarkedComplete?: boolean },
  targetCalories?: number | null
): boolean {
  if (day.isMarkedComplete) return true;
  const minThreshold = targetCalories && targetCalories > 0 ? Math.round(targetCalories * 0.4) : 800;
  return day.totalCalories >= minThreshold || day.mealCount >= 3;
}

/**
 * EXACT Macro Adherence Formula (Item 5):
 * Calorie tolerance (40% weight): delta <= max(100, 5% of target) -> 100
 * Protein threshold (35% weight): >= target -> 100, no upper penalty
 * Carb / Fat tolerance (25% weight): 30% flexible buffer
 * Unit-testable boundaries: 100, 80, 50, 0
 */
export function calculateMacroAdherenceScore(
  dailyLog: { calories: number; proteinG: number; carbsG?: number; fatsG?: number },
  targets: { calories: number; proteinGrams: number; carbsGrams?: number; fatsGrams?: number }
): {
  totalScore: number;
  calorieScore: number;
  proteinScore: number;
  macroScore: number;
  label: string;
} {
  // 1. Calorie Component (Weight = 0.40)
  const calDelta = Math.abs(dailyLog.calories - targets.calories);
  const calTol = Math.max(100, Math.round(targets.calories * 0.05)); // 100 kcal or 5%
  const maxCalDelta = Math.max(500, Math.round(targets.calories * 0.30)); // 30% or 500 kcal

  let calScore = 100;
  if (calDelta > calTol) {
    const excess = calDelta - calTol;
    const range = maxCalDelta - calTol;
    calScore = Math.max(0, Math.round(100 * (1 - excess / range)));
  }

  // 2. Protein Component (Weight = 0.35)
  // No upper limit penalty! Hitting or exceeding target gets 100.
  let protScore = 100;
  if (dailyLog.proteinG < targets.proteinGrams) {
    const ratio = dailyLog.proteinG / targets.proteinGrams;
    if (ratio >= 0.9) {
      // 90% - 100% of target scores 90 - 100
      protScore = 90 + Math.round(((ratio - 0.9) / 0.1) * 10);
    } else {
      // Scaled down to 0 at 40% of target
      const dropRange = 0.9 - 0.4;
      const progress = Math.max(0, ratio - 0.4);
      protScore = Math.max(0, Math.round((progress / dropRange) * 90));
    }
  }

  // 3. Carb / Fat Balance (Weight = 0.25) - 30% flexible buffer
  let carbScore = 100;
  if (targets.carbsGrams && targets.carbsGrams > 0 && dailyLog.carbsG !== undefined) {
    const cDelta = Math.abs(dailyLog.carbsG - targets.carbsGrams);
    const cTol = targets.carbsGrams * 0.30; // 30% flexible buffer
    if (cDelta > cTol) {
      const excess = cDelta - cTol;
      const maxExcess = targets.carbsGrams * 0.40; // scales down across next 40%
      carbScore = Math.max(0, Math.round(100 * (1 - excess / maxExcess)));
    }
  }

  let fatScore = 100;
  if (targets.fatsGrams && targets.fatsGrams > 0 && dailyLog.fatsG !== undefined) {
    const fDelta = Math.abs(dailyLog.fatsG - targets.fatsGrams);
    const fTol = targets.fatsGrams * 0.30; // 30% flexible buffer
    if (fDelta > fTol) {
      const excess = fDelta - fTol;
      const maxExcess = targets.fatsGrams * 0.40;
      fatScore = Math.max(0, Math.round(100 * (1 - excess / maxExcess)));
    }
  }

  const macroScore = Math.round((carbScore + fatScore) / 2);

  // Total Weighted Score (0 - 100)
  const totalScore = Math.max(
    0,
    Math.min(100, Math.round(0.4 * calScore + 0.35 * protScore + 0.25 * macroScore))
  );

  // Neutral non-judgmental wording
  let label = "Target Aligned";
  if (totalScore < 65) {
    label = "Variable Intake";
  } else if (totalScore < 85) {
    label = "Moderate Alignment";
  }

  return {
    totalScore,
    calorieScore: calScore,
    proteinScore: protScore,
    macroScore,
    label,
  };
}

/**
 * Calculates 7-day Weekly Analytics, requiring min 4 qualifying days (Item 2 & 3)
 */
export function calculateWeeklyNutritionAnalytics(
  dailyLogs: Array<{
    date: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatsG: number;
    mealCount: number;
    isMarkedComplete?: boolean;
  }>,
  targets: MacroTargets | null,
  realWeightTrendKgPerWk: number | null = null
): {
  hasTargets: boolean;
  hasEnoughDays: boolean;
  message?: string;
  qualifyingDaysCount: number;
  totalDays: number;
  averageCalories: number | null;
  averageProteinG: number | null;
  averageCarbsG: number | null;
  averageFatsG: number | null;
  adherenceScore: number | null;
  adherenceLabel: string | null;
  projectedWeightChangeKgPerWk: number | null; // From 7700 kcal rule (Estimate)
  realWeightTrendKgPerWk: number | null; // From real scale weigh-ins
  headlineTrend: {
    valueFormatted: string;
    source: "weigh_in" | "caloric_estimate" | "insufficient_data";
    isDiscrepancy: boolean;
    description: string;
  };
  dailyScores: Array<{
    date: string;
    calories: number;
    proteinG: number;
    qualifying: boolean;
    score: number | null;
  }>;
} {
  // If targets are unset, show "Set your targets" and compute nothing (Item 2)
  if (!targets || !targets.calories || !targets.proteinGrams) {
    return {
      hasTargets: false,
      hasEnoughDays: false,
      message: "Set your targets",
      qualifyingDaysCount: 0,
      totalDays: dailyLogs.length,
      averageCalories: null,
      averageProteinG: null,
      averageCarbsG: null,
      averageFatsG: null,
      adherenceScore: null,
      adherenceLabel: null,
      projectedWeightChangeKgPerWk: null,
      realWeightTrendKgPerWk: null,
      headlineTrend: {
        valueFormatted: "--",
        source: "insufficient_data",
        isDiscrepancy: false,
        description: "Set your targets to enable weekly adherence and projections.",
      },
      dailyScores: [],
    };
  }

  // Filter qualifying days
  const dailyScores: Array<{
    date: string;
    calories: number;
    proteinG: number;
    qualifying: boolean;
    score: number | null;
  }> = [];

  const qualifyingLogs: typeof dailyLogs = [];

  for (const log of dailyLogs) {
    const qualifies = isQualifyingDay(
      { totalCalories: log.calories, mealCount: log.mealCount, isMarkedComplete: log.isMarkedComplete },
      targets.calories
    );

    let score: number | null = null;
    if (qualifies) {
      qualifyingLogs.push(log);
      const evalRes = calculateMacroAdherenceScore(
        { calories: log.calories, proteinG: log.proteinG, carbsG: log.carbsG, fatsG: log.fatsG },
        { calories: targets.calories, proteinGrams: targets.proteinGrams, carbsGrams: targets.carbsGrams, fatsGrams: targets.fatsGrams }
      );
      score = evalRes.totalScore;
    }

    dailyScores.push({
      date: log.date,
      calories: log.calories,
      proteinG: log.proteinG,
      qualifying: qualifies,
      score,
    });
  }

  const qCount = qualifyingLogs.length;

  // Require at least 4 qualifying days (Item 2)
  if (qCount < 4) {
    return {
      hasTargets: true,
      hasEnoughDays: false,
      message: "Not enough logged days",
      qualifyingDaysCount: qCount,
      totalDays: dailyLogs.length,
      averageCalories: null,
      averageProteinG: null,
      averageCarbsG: null,
      averageFatsG: null,
      adherenceScore: null,
      adherenceLabel: null,
      projectedWeightChangeKgPerWk: null,
      realWeightTrendKgPerWk,
      headlineTrend: {
        valueFormatted: realWeightTrendKgPerWk !== null ? `${realWeightTrendKgPerWk > 0 ? "+" : ""}${realWeightTrendKgPerWk.toFixed(2)} kg/wk` : "--",
        source: realWeightTrendKgPerWk !== null ? "weigh_in" : "insufficient_data",
        isDiscrepancy: false,
        description: `Based on ${qCount} of 7 logged days (minimum 4 qualifying days required).`,
      },
      dailyScores,
    };
  }

  // Calculate averages across qualifying days
  const avgCals = Math.round(qualifyingLogs.reduce((s, l) => s + l.calories, 0) / qCount);
  const avgProt = Math.round((qualifyingLogs.reduce((s, l) => s + l.proteinG, 0) / qCount) * 10) / 10;
  const avgCarbs = Math.round((qualifyingLogs.reduce((s, l) => s + l.carbsG, 0) / qCount) * 10) / 10;
  const avgFats = Math.round((qualifyingLogs.reduce((s, l) => s + l.fatsG, 0) / qCount) * 10) / 10;

  const validScores = dailyScores.filter((s) => s.score !== null).map((s) => s.score!);
  const avgAdherence = Math.round(validScores.reduce((s, sc) => s + sc, 0) / validScores.length);

  let adherenceLabel = "Target Aligned";
  if (avgAdherence < 65) adherenceLabel = "Variable Intake";
  else if (avgAdherence < 85) adherenceLabel = "Moderate Alignment";

  // Caloric projection from 7700 kcal rule (Item 3)
  const netWeeklyDeficit = (avgCals - targets.calories) * 7;
  const projectedWeightChange = Math.round((netWeeklyDeficit / 7700) * 100) / 100;

  // Headline rule: Real weigh-in trend is the headline if available! (Item 3)
  let headlineSource: "weigh_in" | "caloric_estimate" = "caloric_estimate";
  let headlineFormatted = `${projectedWeightChange > 0 ? "+" : ""}${projectedWeightChange.toFixed(2)} kg/wk (Estimated)`;
  let isDiscrepancy = false;
  let headlineDesc = `Based on ${qCount} of 7 logged days. Estimated from net intake (${netWeeklyDeficit > 0 ? "+" : ""}${netWeeklyDeficit} kcal/wk).`;

  if (realWeightTrendKgPerWk !== null) {
    headlineSource = "weigh_in";
    headlineFormatted = `${realWeightTrendKgPerWk > 0 ? "+" : ""}${realWeightTrendKgPerWk.toFixed(2)} kg/wk`;
    isDiscrepancy = Math.abs(realWeightTrendKgPerWk - projectedWeightChange) > 0.2;
    headlineDesc = isDiscrepancy
      ? `Real scale trend from weigh-ins takes precedence. Caloric estimate projects ${projectedWeightChange > 0 ? "+" : ""}${projectedWeightChange.toFixed(2)} kg/wk.`
      : `Real scale trend closely matches caloric projection (${projectedWeightChange > 0 ? "+" : ""}${projectedWeightChange.toFixed(2)} kg/wk estimate).`;
  }

  return {
    hasTargets: true,
    hasEnoughDays: true,
    qualifyingDaysCount: qCount,
    totalDays: dailyLogs.length,
    averageCalories: avgCals,
    averageProteinG: avgProt,
    averageCarbsG: avgCarbs,
    averageFatsG: avgFats,
    adherenceScore: avgAdherence,
    adherenceLabel,
    projectedWeightChangeKgPerWk: projectedWeightChange,
    realWeightTrendKgPerWk,
    headlineTrend: {
      valueFormatted: headlineFormatted,
      source: headlineSource,
      isDiscrepancy,
      description: headlineDesc,
    },
    dailyScores,
  };
}

