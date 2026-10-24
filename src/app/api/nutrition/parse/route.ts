import { NextRequest, NextResponse } from "next/server";
import {
  ParsedFoodItem,
  CANONICAL_FOODS_DICTIONARY,
  matchDictionaryFood,
} from "@/lib/nutrition";

// Persistent rate limiting & daily abuse prevention
const minuteLimitMap = new Map<string, { count: number; resetTime: number }>();
const dailyQuotaMap = new Map<string, { count: number; day: string }>();

const MAX_PER_MINUTE = 15;
const MAX_PER_DAY = 50;

function getUserLocalDate(timeZone: string = "UTC"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date()); // Formats as YYYY-MM-DD
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

function checkMemoryAbuseLimits(
  userId: string,
  localDateStr: string,
  userTimezone: string
): { allowed: boolean; reason?: string } {
  const now = Date.now();

  // 1. Daily per-user cap in user's timezone
  const dailyRecord = dailyQuotaMap.get(userId);
  if (!dailyRecord || dailyRecord.day !== localDateStr) {
    dailyQuotaMap.set(userId, { count: 1, day: localDateStr });
  } else {
    if (dailyRecord.count >= MAX_PER_DAY) {
      return {
        allowed: false,
        reason: `Daily quota of ${MAX_PER_DAY} AI food parsing requests reached for today in timezone ${userTimezone}. You can continue logging foods manually.`,
      };
    }
    dailyRecord.count += 1;
  }

  // 2. Minute per-user burst rate limit (15/min)
  const windowMs = 60 * 1000;
  const minuteRecord = minuteLimitMap.get(userId);
  if (!minuteRecord || now > minuteRecord.resetTime) {
    minuteLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
  } else {
    if (minuteRecord.count >= MAX_PER_MINUTE) {
      return {
        allowed: false,
        reason: "Too many AI food parsing requests in a short time. Please wait a minute.",
      };
    }
    minuteRecord.count += 1;
  }

  return { allowed: true };
}

async function checkPersistentAbuseLimits(
  supabase: any,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Fetch user's configured timezone from profile (fallback to UTC)
  let userTimezone = "UTC";
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", userId)
      .maybeSingle();
    if (prof?.timezone) {
      userTimezone = prof.timezone;
    }
  } catch {
    userTimezone = "UTC";
  }

  const localDateStr = getUserLocalDate(userTimezone);

  // 2. Attempt atomic check via PostgreSQL RPC function
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("check_ai_rate_limit", {
      p_route: "nutrition_parse",
    });

    if (!rpcErr && rpcRes) {
      if (rpcRes.allowed === false) {
        return {
          allowed: false,
          reason: rpcRes.reason || "Rate limit exceeded. Please wait before making more requests.",
        };
      }
      return { allowed: true };
    }
  } catch {
    // Fall back to table query or memory
  }

  // 3. Fallback to direct table query on public.ai_rate_limits
  try {
    const now = Date.now();
    const { data: rec, error: recErr } = await supabase
      .from("ai_rate_limits")
      .select("*")
      .eq("user_id", userId)
      .eq("route", "nutrition_parse")
      .maybeSingle();

    if (!recErr) {
      if (!rec) {
        await supabase.from("ai_rate_limits").insert({
          user_id: userId,
          route: "nutrition_parse",
          minute_window: new Date().toISOString(),
          minute_count: 1,
          daily_date: localDateStr,
          daily_count: 1,
        });
        return { allowed: true };
      }

      const winStart = new Date(rec.minute_window).getTime();
      const inMinute = now - winStart < 60000;
      if (inMinute && rec.minute_count >= MAX_PER_MINUTE) {
        return {
          allowed: false,
          reason: `Too many AI food parsing requests in a short time (max ${MAX_PER_MINUTE}/min). Please wait a moment.`,
        };
      }

      const isSameDay = rec.daily_date === localDateStr;
      if (isSameDay && rec.daily_count >= MAX_PER_DAY) {
        return {
          allowed: false,
          reason: `Daily quota of ${MAX_PER_DAY} AI food parsing requests reached for today in timezone ${userTimezone}. You can continue logging foods manually.`,
        };
      }

      await supabase
        .from("ai_rate_limits")
        .update({
          minute_count: inMinute ? rec.minute_count + 1 : 1,
          minute_window: inMinute ? rec.minute_window : new Date().toISOString(),
          daily_count: isSameDay ? rec.daily_count + 1 : 1,
          daily_date: localDateStr,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("route", "nutrition_parse");

      return { allowed: true };
    }
  } catch {
    // If table doesn't exist yet, fall back to in-memory map
  }

  // 4. In-memory fallback
  return checkMemoryAbuseLimits(userId, localDateStr, userTimezone);
}

/**
 * Swappable LLM Provider Interface
 */
interface LLMProvider {
  name: string;
  isAvailable: () => boolean;
  parse: (text: string) => Promise<ParsedFoodItem[]>;
}

/**
 * OpenAI / Compatible Provider
 */
const OpenAIProvider: LLMProvider = {
  name: "OpenAI",
  isAvailable: () => !!process.env.OPENAI_API_KEY,
  parse: async (text: string): Promise<ParsedFoodItem[]> => {
    const apiKey = process.env.OPENAI_API_KEY;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a nutrition telemetry parser. You parse food intake descriptions in English, Arabic, Egyptian Arabic, or Franco-Arab (Arabizi).
Return STRICT JSON array of parsed items:
[
  {
    "food_name": string (standard English or English transliteration),
    "quantity": number,
    "unit": string,
    "calories": number | null,
    "protein_g": number | null,
    "carbs_g": number | null,
    "fats_g": number | null,
    "confidence": "high" | "medium" | "low" | "could_not_estimate",
    "note": string (optional)
  }
]
IMPORTANT INSTRUCTIONS:
1. Handle Egyptian dishes accurately (koshari, ful mudammas, taameya/falafel, hawawshi, molokhia, baladi bread, etc.).
2. If an item cannot be estimated or is ambiguous, set confidence to "could_not_estimate" and calories/macros to null. NEVER invent random numbers.
3. Output JSON ONLY, no markdown fences.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI Provider error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || "[]";
    const cleanJson = rawContent.replace(/^```json\s*/, "").replace(/```$/, "");
    const parsed = JSON.parse(cleanJson);

    return (parsed || []).map((item: any) => ({
      food_name: item.food_name || "Unknown item",
      quantity: Number(item.quantity) || 1,
      unit: item.unit || "serving",
      calories: item.calories !== null ? Number(item.calories) : null,
      protein_g: item.protein_g !== null ? Number(item.protein_g) : 0,
      carbs_g: item.carbs_g !== null ? Number(item.carbs_g) : 0,
      fats_g: item.fats_g !== null ? Number(item.fats_g) : 0,
      confidence: item.confidence || "medium",
      source: "ai" as const,
      note: item.note,
    }));
  },
};

/**
 * Gemini Provider
 */
const GeminiProvider: LLMProvider = {
  name: "Gemini",
  isAvailable: () => !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
  parse: async (text: string): Promise<ParsedFoodItem[]> => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an expert nutritional parser supporting English, Arabic, and Egyptian Franco-Arab. Parse this meal: "${text}".
Return raw JSON array only:
[{"food_name": "...", "quantity": 1, "unit": "serving", "calories": 500, "protein_g": 30, "carbs_g": 40, "fats_g": 15, "confidence": "high"|"could_not_estimate"}]
If impossible to estimate, return confidence "could_not_estimate" with null calories. Do NOT hallucinate numbers.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini Provider error: ${res.status}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const cleanJson = rawText.replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleanJson);

    return (parsed || []).map((item: any) => ({
      food_name: item.food_name || "Unknown item",
      quantity: Number(item.quantity) || 1,
      unit: item.unit || "serving",
      calories: item.calories !== null ? Number(item.calories) : null,
      protein_g: item.protein_g !== null ? Number(item.protein_g) : 0,
      carbs_g: item.carbs_g !== null ? Number(item.carbs_g) : 0,
      fats_g: item.fats_g !== null ? Number(item.fats_g) : 0,
      confidence: item.confidence || "medium",
      source: "ai" as const,
      note: item.note,
    }));
  },
};

import { createClient } from "@/lib/supabase/server";

// Registered providers priority
const PROVIDERS: LLMProvider[] = [OpenAIProvider, GeminiProvider];

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check via Supabase session cookie or Bearer token
    const supabase = await createClient();
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    let user = null;
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    } else {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. You must be signed in to access the AI food parser." },
        { status: 401 }
      );
    }

    // 2. Per-user Rate Limiting & Daily Abuse Protection (Database & Timezone aware)
    const limitCheck = await checkPersistentAbuseLimits(supabase, user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.reason || "Rate limit exceeded. Please wait before making more requests." },
        { status: 429 }
      );
    }

    // 3. Request Body & Input Validation
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'query' field." }, { status: 400 });
    }

    // Input length limit guard (max 500 characters)
    if (query.length > 500) {
      return NextResponse.json(
        { error: "Query exceeds maximum limit of 500 characters." },
        { status: 400 }
      );
    }

    const trimmed = query.trim();
    if (!trimmed) {
      return NextResponse.json({ items: [] });
    }

    // 4. Grounding: Match segments against local Egyptian & common dictionary first
    const segments = trimmed
      .split(/[,،\n]|(?:\s+(?:and|with|مع|و|\+)\s+)/i)
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedItems: ParsedFoodItem[] = [];
    const unparsedSegments: string[] = [];

    for (const segment of segments) {
      const match = matchDictionaryFood(segment);
      if (match) {
        parsedItems.push(match);
      } else {
        unparsedSegments.push(segment);
      }
    }

    // 5. LLM Provider for unparsed items
    if (unparsedSegments.length > 0) {
      const activeProvider = PROVIDERS.find((p) => p.isAvailable());

      if (!activeProvider) {
        return NextResponse.json(
          {
            error: "No AI nutrition parsing provider is currently available. Please enter macros manually.",
            items: parsedItems,
          },
          { status: 503 }
        );
      }

      try {
        const aiItems = await activeProvider.parse(unparsedSegments.join(", "));
        parsedItems.push(...aiItems);
      } catch (llmErr) {
        console.error("AI Provider parsing error:", (llmErr as Error)?.message || llmErr);
        // Clean error returned to client — zero leaked keys, zero stack traces
        return NextResponse.json(
          {
            error: "AI nutrition service encountered an error. Please try again or enter macros manually.",
            items: parsedItems.length > 0 ? parsedItems : undefined,
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ items: parsedItems });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal parser error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
