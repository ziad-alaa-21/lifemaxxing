"use client";

import React, { useState, useEffect } from "react";
import {
  SubjectItem,
  SUBJECT_PALETTE,
  PROHIBITED_COLOR,
  validateSubjectInput,
} from "@/lib/school";
import { useI18n } from "@/lib/i18n/I18nContext";
import { X, Loader2, AlertCircle, Bookmark } from "lucide-react";

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: {
    name: string;
    code: string | null;
    color: string;
    target_grade: number | null;
  }) => Promise<void>;
  initialSubject?: SubjectItem | null;
  existingNames?: string[];
  isBlocked?: boolean;
}

export function SubjectModal({
  isOpen,
  onClose,
  onSave,
  initialSubject,
  existingNames = [],
  isBlocked = false,
}: SubjectModalProps) {
  const { locale } = useI18n();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState(SUBJECT_PALETTE[0].value);
  const [targetGrade, setTargetGrade] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSubject) {
      setName(initialSubject.name || "");
      setCode(initialSubject.code || "");
      setColor(
        initialSubject.color?.toLowerCase() === PROHIBITED_COLOR
          ? SUBJECT_PALETTE[0].value
          : initialSubject.color || SUBJECT_PALETTE[0].value
      );
      setTargetGrade(
        initialSubject.target_grade !== null &&
          initialSubject.target_grade !== undefined
          ? String(initialSubject.target_grade)
          : ""
      );
    } else {
      setName("");
      setCode("");
      setColor(SUBJECT_PALETTE[0].value);
      setTargetGrade("");
    }
    setError(null);
  }, [initialSubject, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isBlocked) {
      setError("Offline: saving disabled to protect sync integrity.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Subject name is required.");
      return;
    }

    // Check case-insensitive uniqueness among other subjects
    const lowerName = trimmedName.toLowerCase();
    const isDuplicate = existingNames.some(
      (n) =>
        n.toLowerCase() === lowerName &&
        (!initialSubject || initialSubject.name.toLowerCase() !== lowerName)
    );

    if (isDuplicate) {
      setError(`A subject named "${trimmedName}" already exists.`);
      return;
    }

    const parsedTarget =
      targetGrade.trim() !== "" ? parseFloat(targetGrade) : null;

    const validation = validateSubjectInput({
      name: trimmedName,
      color,
      target_grade: parsedTarget,
    });

    if (!validation.valid) {
      setError(validation.error || "Invalid subject input.");
      return;
    }

    try {
      setSaving(true);
      await onSave({
        name: trimmedName,
        code: code.trim() || null,
        color,
        target_grade: parsedTarget,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save subject";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className="w-full max-w-md bg-surface-container border border-border-subtle rounded-2xl p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold font-mono text-on-surface">
              {locale === "ar"
                ? initialSubject ? "تعديل بيانات المادة" : "إضافة مادة جديدة"
                : initialSubject ? "Edit Subject" : "New Subject"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-2 text-crimson-alert text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input with dir="auto" for Arabic support */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant flex items-center justify-between">
              <span>{locale === "ar" ? "اسم المادة *" : "Subject Name *"}</span>
              <span className="text-[10px] text-text-muted">
                {locale === "ar" ? "فريد" : "Unique"}
              </span>
            </label>
            <input
              type="text"
              dir="auto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={locale === "ar" ? "مثال: فيزياء، تفاضل وتكامل، تاريخ" : "e.g. Physics, Advanced Math, تاريخ"}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-border-medium text-sm text-on-surface focus:outline-none focus:border-amber-400 placeholder:text-text-muted transition-colors font-sans"
            />
          </div>

          {/* Code Input (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant">
              {locale === "ar" ? "كود المادة (اختياري)" : "Course Code (Optional)"}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. PHYS-101, MATH-202"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-border-medium text-sm text-on-surface font-mono uppercase focus:outline-none focus:border-amber-400 placeholder:text-text-muted transition-colors"
            />
          </div>

          {/* Target Grade (%) */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant flex items-center justify-between">
              <span>{locale === "ar" ? "النسبة المستهدفة % (اختياري)" : "Target Grade % (Optional)"}</span>
              <span className="text-[10px] text-text-muted">0 – 100%</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value)}
              placeholder="e.g. 90"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-border-medium text-sm text-on-surface font-mono focus:outline-none focus:border-amber-400 placeholder:text-text-muted transition-colors"
            />
          </div>

          {/* Color Palette Picker (Never Lime #C6FF3D) */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-on-surface-variant">
              {locale === "ar" ? "لون المادة المميز" : "Subject Color Palette"}
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {SUBJECT_PALETTE.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-mono transition-all ${
                    color === opt.value
                      ? "border-amber-400 bg-surface-container-high shadow-md"
                      : "border-border-subtle bg-surface-container-low hover:border-border-medium"
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: opt.value }}
                  />
                  <span className="truncate text-[11px] text-on-surface">
                    {opt.label.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-mono text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={saving || isBlocked}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 text-on-primary text-xs font-mono font-semibold uppercase tracking-wider hover:bg-amber-400 disabled:opacity-50 shadow-xs transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{locale === "ar" ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <span>
                  {locale === "ar"
                    ? initialSubject ? "تحديث المادة" : "إنشاء المادة"
                    : initialSubject ? "Update Subject" : "Create Subject"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
