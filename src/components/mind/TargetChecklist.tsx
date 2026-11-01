"use client";

import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, Plus, Trash2, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

export type MilestoneStatus = "pending" | "in_progress" | "completed";

export interface TargetMilestone {
  id: string;
  title: string;
  titleAr?: string;
  status: MilestoneStatus;
  estimateMinutes?: number | null;
}

interface TargetChecklistProps {
  taskCategory?: string;
  taskIntention?: string;
}

const STORAGE_KEY = "mind_target_checklist_items";

export function TargetChecklist({ taskCategory, taskIntention }: TargetChecklistProps) {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const [items, setItems] = useState<TargetMilestone[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMinutes, setNewMinutes] = useState<string>("25");
  const hasLoadedRef = useRef(false);

  // Load from localStorage safely after mount to prevent SSR hydration mismatch
  useEffect(() => {
    const defaults: TargetMilestone[] = [
      {
        id: "m-1",
        title: "Question 1-3: Electromagnetic induction equations",
        titleAr: "مسألة 1-3: معادلات الحث الكهرومغناطيسي",
        status: "completed",
        estimateMinutes: 25,
      },
      {
        id: "m-2",
        title: "Question 4: Maxwell's displacement current derivation",
        titleAr: "مسألة 4: استنتاج تيار إزاحة ماكسويل",
        status: "in_progress",
        estimateMinutes: 30,
      },
      {
        id: "m-3",
        title: "Question 5: Boundary value conditions synthesis",
        titleAr: "مسألة 5: الشروط الحدية والتركيب",
        status: "pending",
        estimateMinutes: 20,
      },
    ];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          hasLoadedRef.current = true;
          return;
        }
      }
    } catch {}

    setItems(defaults);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    } catch {}
    hasLoadedRef.current = true;
  }, []);

  // Sync changes to localStorage only after initial load completes
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const handleToggleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextStatus: MilestoneStatus =
          item.status === "pending"
            ? "in_progress"
            : item.status === "in_progress"
            ? "completed"
            : "pending";
        return { ...item, status: nextStatus };
      })
    );
  };

  const handleToggleCompletedDirect = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          status: item.status === "completed" ? "in_progress" : "completed",
        };
      })
    );
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    const newItem: TargetMilestone = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: trimmed,
      status: "in_progress",
      estimateMinutes: newMinutes ? Number(newMinutes) : null,
    };

    setItems((prev) => [...prev, newItem]);
    setNewTitle("");
    setNewMinutes("25");
    setIsAdding(false);
  };

  return (
    <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-on-surface">
            {isAr ? "قائمة أهداف الجلسة" : "Target checklist"}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {taskCategory || "Coding"} • {taskIntention || (isAr ? "مراحل المسائل والأهداف" : "Problem set 4 milestones")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding((prev) => !prev)}
          className="w-7 h-7 rounded-lg bg-surface-container border border-border-subtle flex items-center justify-center text-on-surface hover:bg-surface-container-high cursor-pointer transition-colors shadow-xs active:scale-95"
          title={isAr ? "إضافة هدف جديد" : "Add target milestone"}
          aria-label={isAr ? "إضافة هدف جديد" : "Add target milestone"}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add New Milestone Form */}
      {isAdding && (
        <form
          onSubmit={handleAddItem}
          className="p-3 rounded-xl bg-surface-container-low border border-border-subtle space-y-2.5 animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={isAr ? "أدخل هدف الجلسة الجديد..." : "Enter session target / milestone..."}
              className="flex-1 px-3 py-1.5 rounded-lg bg-surface-container border border-border-subtle text-xs text-on-surface focus:outline-none focus:border-blue-600 transition-colors"
            />
            <input
              type="number"
              min="1"
              max="180"
              value={newMinutes}
              onChange={(e) => setNewMinutes(e.target.value)}
              placeholder="mins"
              className="w-16 px-2 py-1.5 rounded-lg bg-surface-container border border-border-subtle text-xs text-on-surface text-center focus:outline-none focus:border-blue-600 transition-colors"
              title={isAr ? "المدة بالدقائق" : "Estimate in minutes"}
            />
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewTitle("");
              }}
              className="px-2.5 py-1 rounded-md text-xs text-text-muted hover:text-on-surface transition-colors cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              <span>{isAr ? "إضافة" : "Add Target"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Checklist Items */}
      <div className="space-y-2">
        {items.map((item) => {
          if (item.status === "completed") {
            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 px-2.5 rounded-xl bg-surface-container-low/50 border border-border-subtle/50 text-xs transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleCompletedDirect(item.id)}
                    className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 cursor-pointer hover:bg-blue-700 transition-colors"
                    title={isAr ? "إلغاء الإكمال" : "Mark incomplete"}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </button>
                  <span
                    onClick={() => handleToggleStatus(item.id)}
                    className="text-on-surface font-medium line-through opacity-70 truncate cursor-pointer hover:opacity-100 transition-opacity"
                  >
                    {isAr && item.titleAr ? item.titleAr : item.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {item.estimateMinutes && (
                    <span className="text-[11px] text-text-muted shrink-0">
                      {item.estimateMinutes} {isAr ? "د" : "m"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    className="w-6 h-6 rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                    title={isAr ? "حذف الهدف" : "Delete target"}
                    aria-label={isAr ? "حذف الهدف" : "Delete target"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          }

          if (item.status === "in_progress") {
            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 px-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-xs transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleCompletedDirect(item.id)}
                    className="w-4 h-4 rounded-full border-2 border-blue-600 shrink-0 cursor-pointer hover:bg-blue-600/10 transition-colors flex items-center justify-center"
                    title={isAr ? "تحديد كمكتمل" : "Mark completed"}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 block" />
                  </button>
                  <span
                    onClick={() => handleToggleStatus(item.id)}
                    className="text-on-surface font-medium truncate cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    {isAr && item.titleAr ? item.titleAr : item.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item.id)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/30 shrink-0 hover:bg-blue-500/25 transition-colors cursor-pointer"
                    title={isAr ? "تغيير الحالة" : "Change status"}
                  >
                    {isAr ? "قيد التنفيذ" : "In progress"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    className="w-6 h-6 rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                    title={isAr ? "حذف الهدف" : "Delete target"}
                    aria-label={isAr ? "حذف الهدف" : "Delete target"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          }

          // status === "pending"
          return (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 px-2.5 rounded-xl bg-surface-container-low/30 border border-border-subtle/40 text-xs transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => handleToggleCompletedDirect(item.id)}
                  className="w-4 h-4 rounded-full border border-border-default shrink-0 cursor-pointer hover:border-blue-600 transition-colors"
                  title={isAr ? "تحديد كمكتمل" : "Mark completed"}
                />
                <span
                  onClick={() => handleToggleStatus(item.id)}
                  className="text-text-muted truncate cursor-pointer hover:text-on-surface transition-colors"
                >
                  {isAr && item.titleAr ? item.titleAr : item.title}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(item.id)}
                  className="text-[11px] text-text-muted shrink-0 hover:text-on-surface transition-colors cursor-pointer"
                  title={isAr ? "تغيير الحالة" : "Change status"}
                >
                  {isAr ? "قيد الانتظار" : "Pending"}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteItem(item.id, e)}
                  className="w-6 h-6 rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                  title={isAr ? "حذف الهدف" : "Delete target"}
                  aria-label={isAr ? "حذف الهدف" : "Delete target"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {items.length === 0 && !isAdding && (
          <div className="text-center py-4 text-xs text-text-muted">
            {isAr
              ? "لا توجد أهداف محددة للجلسة. اضغط + للإضافة."
              : "No targets set for this session. Click + to add one."}
          </div>
        )}
      </div>
    </div>
  );
}
