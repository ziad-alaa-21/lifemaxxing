import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createDirectClient } from "@supabase/supabase-js";

// Comprehensive list of user-owned tables to query
// Introspected from database migrations
const USER_OWNED_TABLES = [
  "profiles",
  "user_settings",
  "weight_logs",
  "sleep_logs",
  "meal_logs",
  "intake_logs",
  "saved_meals",
  "workouts",
  "workout_exercises",
  "workout_sets",
  "user_rank_history",
  "focus_sessions",
  "reading_books",
  "reading_logs",
  "screen_time_logs",
  "subjects",
  "grades",
  "mistakes",
  "deadlines",
  "math_sessions",
  "math_attempts",
  "discipline_commitments",
  "discipline_logs",
  "mind_checkins",
];

// Sensitive columns that must never be exported
const SENSITIVE_COLUMNS = new Set([
  "encrypted_password",
  "password_hash",
  "token",
  "refresh_token",
  "access_token",
  "api_key",
  "secret",
]);

function sanitizeRow(row: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!SENSITIVE_COLUMNS.has(k.toLowerCase())) {
      clean[k] = v;
    }
  }
  return clean;
}

function convertToCSV(tableName: string, rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) {
    return `# TABLE: ${tableName}\n(No records)\n\n`;
  }
  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = typeof val === "object" ? JSON.stringify(val) : String(val);
        // Escape quotes
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return `# TABLE: ${tableName}\n${headerLine}\n${dataLines.join("\n")}\n\n`;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user via cookies or Authorization header
    let supabase = await createServerSupabase();
    let authUser = (await supabase.auth.getUser()).data.user;

    const authHeader = request.headers.get("Authorization");
    if (!authUser && authHeader && authHeader.startsWith("Bearer ")) {
      const direct = createDirectClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );
      const res = await direct.auth.getUser();
      if (res.data.user) {
        supabase = direct as any;
        authUser = res.data.user;
      }
    }

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to export your data." },
        { status: 401 }
      );
    }

    const userId = authUser.id;
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "json";

    const exportData: Record<string, any[]> = {};
    const tableManifest: { table: string; count: number }[] = [];

    // 2. Fetch every user-owned table via user's own authenticated session (RLS applies)
    for (const table of USER_OWNED_TABLES) {
      try {
        let query;
        if (table === "profiles") {
          query = supabase.from("profiles").select("*").eq("id", userId);
        } else if (table === "workout_exercises" || table === "workout_sets") {
          // Child tables: RLS will return only records visible to user
          query = supabase.from(table).select("*");
        } else {
          query = supabase.from(table).select("*").eq("user_id", userId);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          const sanitized = data.map(sanitizeRow);
          exportData[table] = sanitized;
          tableManifest.push({ table, count: sanitized.length });
        } else {
          exportData[table] = [];
        }
      } catch {
        exportData[table] = [];
      }
    }

    const now = new Date().toISOString();
    const dateStamp = now.split("T")[0];

    // 3. Return JSON or CSV
    if (format === "csv") {
      let csvContent = `# LIFEMAXXING TELEMETRY EXPORT\n`;
      csvContent += `# Exported: ${now}\n`;
      csvContent += `# User ID: ${userId}\n`;
      csvContent += `# User Email: ${authUser.email || "N/A"}\n`;
      csvContent += `# Includes Soft-Deleted Rows: YES (identified by non-null deleted_at)\n\n`;

      for (const [table, rows] of Object.entries(exportData)) {
        csvContent += convertToCSV(table, rows);
      }

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="lifemaxxing_export_${dateStamp}.csv"`,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    // Default: JSON format
    const payload = {
      meta: {
        application: "LifeMaxxing",
        version: "1.0.0-stage9",
        exported_at: now,
        user_id: userId,
        email: authUser.email,
        includes_soft_deleted_records: true,
        tables_exported: tableManifest,
      },
      data: exportData,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="lifemaxxing_export_${dateStamp}.json"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process export" },
      { status: 500 }
    );
  }
}
