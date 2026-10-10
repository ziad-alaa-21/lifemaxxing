"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Dumbbell, Loader2, Award, Zap, Layers, AlertCircle } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  is_compound: boolean;
  is_ranked: boolean;
  ranked_key: string | null;
}

export function BodyView() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExercises() {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from("exercises")
          .select("id, name, muscle_group, equipment, is_compound, is_ranked, ranked_key")
          .order("name", { ascending: true });

        if (err) {
          setError(err.message);
        } else if (data) {
          setExercises(data);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load exercises";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    loadExercises();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface-container rounded-2xl p-6 border border-border-subtle relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-cyan/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary-cyan/10 border border-secondary-cyan/30 flex items-center justify-center text-secondary-cyan shadow-[0_0_16px_rgba(93,230,255,0.2)]">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-on-surface">
                  Canonical Strength Engine
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary-cyan/10 text-secondary-cyan border border-secondary-cyan/20">
                  LIVE SUPABASE DATA
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Deterministic UUID canonical lifts seeded in the fresh database
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle text-on-surface">
              {exercises.length} Exercises Loaded
            </span>
          </div>
        </div>
      </div>

      {/* Stage 3 Notice */}
      <div className="p-4 bg-surface-container-low border border-border-subtle rounded-xl flex items-start gap-3">
        <Zap className="w-4 h-4 text-amber-core shrink-0 mt-0.5" />
        <div className="text-xs text-on-surface-variant">
          <span className="font-semibold text-on-surface">
            Stage 3 Protocol Pipeline:
          </span>{" "}
          Active workout logger, set logging with RPE/reps, and Epley 1RM coefficient rankings will be wired in Stage 3. This view currently validates real live Supabase query isolation.
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-3 text-crimson-alert text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Error loading canonical lifts: {error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-secondary-cyan" />
          <span className="text-xs font-mono">Querying Supabase canonical tables...</span>
        </div>
      )}

      {/* Exercises Grid */}
      {!loading && exercises.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {exercises.map((ex) => (
            <div
              key={ex.id}
              className="bg-surface-container border border-border-subtle hover:border-secondary-cyan/30 rounded-xl p-4 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-on-surface tracking-tight">
                    {ex.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono text-text-muted capitalize">
                      {ex.muscle_group}
                    </span>
                    <span className="text-[11px] text-text-muted">•</span>
                    <span className="text-[11px] font-mono text-text-muted capitalize">
                      {ex.equipment}
                    </span>
                  </div>
                </div>
                {ex.is_ranked && (
                  <span className="px-2 py-0.5 rounded-md bg-primary-lime/10 border border-primary-lime/30 text-[10px] font-mono text-primary-lime font-bold uppercase shrink-0">
                    Ranked
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-border-subtle/50 flex items-center justify-between text-[10px] font-mono text-text-muted">
                <span>Key: {ex.ranked_key || "custom"}</span>
                <span className="truncate max-w-[120px]">
                  ID: {ex.id.slice(0, 8)}...
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
