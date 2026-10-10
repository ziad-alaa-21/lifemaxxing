"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  GraduationCap,
  BookOpen,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Clock,
  WifiOff,
} from "lucide-react";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  color: string;
}

const colorOptions = [
  { label: "Volt Lime", value: "#c6ff3d" },
  { label: "Cyan", value: "#5de6ff" },
  { label: "Violet", value: "#a78bfa" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Sky Blue", value: "#38bdf8" },
  { label: "Emerald", value: "#34d399" },
];

export function SchoolView() {
  const { isOnline, isBlocked, saveButtonProps } = useOnlineGuard();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Subject modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newColor, setNewColor] = useState(colorOptions[0].value);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function loadSubjects() {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("subjects")
        .select("id, name, code, color")
        .is("deleted_at", null)
        .order("name", { ascending: true });

      if (err) {
        setError(err.message);
      } else if (data) {
        setSubjects(data);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load subjects";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubjects();
  }, []);

  async function handleCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    if (isBlocked) {
      setSaveError("You are currently offline. Saving is disabled to protect database integrity.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        throw new Error("You must be logged in to create a subject");
      }

      const { error: insertErr } = await supabase
        .from("subjects")
        .insert({
          user_id: userId,
          name: newSubjectName.trim(),
          code: newSubjectCode.trim() || null,
          color: newColor,
        });

      if (insertErr) {
        throw insertErr;
      }

      setNewSubjectName("");
      setNewSubjectCode("");
      setShowAddModal(false);
      await loadSubjects();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create subject";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

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
              <h2 className="text-lg font-bold font-mono text-on-surface">
                School
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Scope: subjects, grades (quiz / big exam), exams & deadlines, topics, mistake log
              </p>
            </div>
          </div>
          <div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary-lime text-surface text-xs font-semibold uppercase tracking-wider hover:bg-primary-lime-dim shadow-[0_0_16px_rgba(198,255,61,0.25)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Subject</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-3 text-crimson-alert text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Error loading subjects: {error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary-lime" />
          <span className="text-xs font-mono">Loading subjects...</span>
        </div>
      )}

      {/* Real Empty State */}
      {!loading && subjects.length === 0 && (
        <div className="p-8 sm:p-12 bg-surface-container rounded-2xl border border-border-subtle text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-surface-container-high border border-border-medium flex items-center justify-center text-on-surface mx-auto">
            <BookOpen className="w-6 h-6 text-primary-lime" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold font-mono text-on-surface">
              Add your first subject
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              No subjects registered yet. Create your first subject to organize quizzes, big exams, deadlines, and mistake log entries.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-lime text-surface text-xs font-semibold uppercase tracking-wider hover:bg-primary-lime-dim transition-all cursor-pointer shadow-[0_0_16px_rgba(198,255,61,0.25)]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Subject</span>
          </button>
        </div>
      )}

      {/* Live Subjects Grid */}
      {!loading && subjects.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant px-1">
            <span>Your Registered Subjects</span>
            <span>{subjects.length} Total</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="p-4 bg-surface-container rounded-xl border border-border-subtle hover:border-border-medium transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color || "#c6ff3d" }}
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-on-surface truncate">
                        {sub.name}
                      </h3>
                      {sub.code && (
                        <span className="text-[11px] font-mono text-text-muted">
                          {sub.code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-text-muted truncate">
                  ID: {sub.id.slice(0, 8)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scope Details Card */}
      <div className="p-5 bg-surface-container-low border border-border-subtle rounded-2xl space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-on-surface">
          <Clock className="w-4 h-4 text-primary-lime" />
          <span>Upcoming School Features</span>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Grades (quiz & big exam), exams & deadlines calendar, study topics, and mistake log will be connected in an upcoming stage.
        </p>
      </div>

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-darkest/80 backdrop-blur-md">
          <div
            className="w-full max-w-md bg-surface-container border border-border-subtle rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <h3 className="text-base font-bold font-mono text-on-surface">
                Add Subject
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg bg-surface-container-high border border-border-subtle flex items-center justify-center text-text-muted hover:text-on-surface cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Offline warning inside modal */}
            {!isOnline && (
              <div className="p-3 bg-amber-core/15 border border-amber-core/30 rounded-xl text-amber-core text-xs flex items-center gap-2">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>You are currently offline. Saving is disabled until reconnection.</span>
              </div>
            )}

            {saveError && (
              <div className="p-3 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl text-crimson-alert text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Operating Systems"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-border-medium rounded-xl text-on-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-primary-lime focus:ring-1 focus:ring-primary-lime"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1">
                  Course Code (Optional)
                </label>
                <input
                  type="text"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  placeholder="e.g. CS 350"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-border-medium rounded-xl text-on-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-primary-lime"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Color Tag
                </label>
                <div className="flex items-center gap-2">
                  {colorOptions.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setNewColor(opt.value)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        newColor === opt.value
                          ? "scale-110 border-on-surface"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: opt.value }}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || saveButtonProps.disabled}
                  title={saveButtonProps.title}
                  className="px-4 py-2 rounded-xl bg-primary-lime text-surface text-xs font-semibold font-mono uppercase tracking-wider hover:bg-primary-lime-dim cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isOnline ? "Save Subject" : "Saving Disabled (Offline)"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
