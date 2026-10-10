"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { GraduationCap, BookOpen, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  color: string;
  credit_hours: number;
}

export function SchoolView() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubjects() {
      try {
        setLoading(true);
        const { data } = await supabase
          .from("subjects")
          .select("id, name, color, credit_hours")
          .is("deleted_at", null);
        if (data) {
          setSubjects(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSubjects();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface-container rounded-2xl p-6 border border-border-subtle relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-lime/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-lime/10 border border-primary-lime/30 flex items-center justify-center text-primary-lime shadow-[0_0_16px_rgba(198,255,61,0.2)]">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-on-surface">
                  Academic Matrix & GPA Engine
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary-lime/10 text-primary-lime border border-primary-lime/20">
                  PILLAR 3
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Single unified grades table schema (quizzes, midterms & finals) with RLS isolation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle text-primary-lime">
              Stage 5 Architecture
            </span>
          </div>
        </div>
      </div>

      {/* Schema Verification Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-success" />
          <h3 className="text-sm font-bold font-mono text-on-surface">
            Database Schema Rules Applied
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-surface-container-low rounded-xl border border-border-subtle text-xs space-y-1">
            <div className="font-mono text-primary-lime font-semibold">Unified Grades</div>
            <div className="text-text-muted text-[11px]">
              Type check: <code className="text-on-surface font-mono">'quiz' | 'big_exam'</code>. Single table replacing legacy assessments.
            </div>
          </div>
          <div className="p-3 bg-surface-container-low rounded-xl border border-border-subtle text-xs space-y-1">
            <div className="font-mono text-primary-lime font-semibold">Subjects RLS</div>
            <div className="text-text-muted text-[11px]">
              Every subject and grade is scoped to <code className="text-on-surface font-mono">auth.uid()</code> with zero cross-tenant visibility.
            </div>
          </div>
          <div className="p-3 bg-surface-container-low rounded-xl border border-border-subtle text-xs space-y-1">
            <div className="font-mono text-primary-lime font-semibold">Soft Deletes</div>
            <div className="text-text-muted text-[11px]">
              All academic entities support <code className="text-on-surface font-mono">deleted_at</code> timestamps for audit and recovery.
            </div>
          </div>
        </div>
      </div>

      {/* User's Current Subjects in DB */}
      <div className="p-5 bg-surface-container-low border border-border-subtle rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-secondary-cyan" />
            <h4 className="text-sm font-bold font-mono text-on-surface">
              Your Registered Subjects
            </h4>
          </div>
          <span className="text-xs font-mono text-text-muted">
            {subjects.length} Subjects Active
          </span>
        </div>

        {loading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary-lime" />
          </div>
        ) : subjects.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-text-muted bg-surface-container rounded-xl border border-border-subtle">
            No custom subjects registered yet for this account. Course creation will be fully enabled in Stage 5.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="p-3.5 bg-surface-container rounded-xl border border-border-subtle flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: sub.color || "#c6ff3d" }}
                  />
                  <span className="text-xs font-medium text-on-surface">
                    {sub.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-text-muted">
                  {sub.credit_hours} Credits
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
