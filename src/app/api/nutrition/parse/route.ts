import { NextRequest, NextResponse } from "next/server";
import {
  ParsedFoodItem,
  CANONICAL_FOODS_DICTIONARY,
  matchDictionaryFood,
} from "@/lib/nutrition";

// In-memory rate limiting map: ip -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 30;

  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
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

// Registered providers priority
const PROVIDERS: LLMProvider[] = [OpenAIProvider, GeminiProvider];

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a minute before re-parsing." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing 'query' field" }, { status: 400 });
    }

    // Input length limit guard
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

    // 1. Try splitting into segments by commas or conjunctions
    const segments = trimmed
      .split(/[,،\n]|(?:\s+(?:and|with|مع|و|\+)\s+)/i)
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedItems: ParsedFoodItem[] = [];
    const unparsedSegments: string[] = [];

    // Check each segment against dictionary grounding
    for (const segment of segments) {
      const match = matchDictionaryFood(segment);
      if (match) {
        parsedItems.push(match);
      } else {
        unparsedSegments.push(segment);
      }
    }

    // 2. If there are unparsed segments, try swappable LLM provider
    if (unparsedSegments.length > 0) {
      const activeProvider = PROVIDERS.find((p) => p.isAvailable());

      if (activeProvider) {
        try {
          const aiItems = await activeProvider.parse(unparsedSegments.join(", "));
          parsedItems.push(...aiItems);
        } catch (llmErr) {
          console.error("LLM Provider parsing failed:", llmErr);
          // Return real error or fallback items with could_not_estimate
          for (const unparsed of unparsedSegments) {
            parsedItems.push({
              food_name: unparsed,
              quantity: 1,
              unit: "item",
              calories: null,
              protein_g: 0,
              carbs_g: 0,
              fats_g: 0,
              confidence: "could_not_estimate",
              source: "manual",
              note: "AI service unavailable. Enter macros manually.",
            });
          }
        }
      } else {
        // No LLM provider key configured: return honest "could not estimate"
        // NEVER INVENT NUMBERS!
        for (const unparsed of unparsedSegments) {
          parsedItems.push({
            food_name: unparsed,
            quantity: 1,
            unit: "item",
            calories: null,
            protein_g: 0,
            carbs_g: 0,
            fats_g: 0,
            confidence: "could_not_estimate",
            source: "manual",
            note: "Could not estimate. Tap item to input macros manually.",
          });
        }
      }
    }

    return NextResponse.json({ items: parsedItems });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal parser error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
