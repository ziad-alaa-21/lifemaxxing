"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Loader2,
  Bookmark,
  ChevronRight,
} from "lucide-react";
import {
  ReadingBook,
  ReadingLog,
  calculateBookProgress,
  validateReadingLog,
} from "@/lib/reading";
import { supabase } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nContext";

interface ReadingCardProps {
  selectedDate: string;
  onReadingUpdated?: () => void;
}

export function ReadingCard({ selectedDate, onReadingUpdated }: ReadingCardProps) {
  const { locale } = useI18n();
  const [books, setBooks] = useState<ReadingBook[]>([]);
  const [activeBook, setActiveBook] = useState<ReadingBook | null>(null);
  const [todayLogs, setTodayLogs] = useState<ReadingLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [isNewBookModalOpen, setIsNewBookModalOpen] = useState<boolean>(false);

  // Form states
  const [logPages, setLogPages] = useState<string>("");
  const [logMinutes, setLogMinutes] = useState<string>("");
  const [logNotes, setLogNotes] = useState<string>("");
  const [submittingLog, setSubmittingLog] = useState<boolean>(false);
  const [logError, setLogError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState<string>("");
  const [newAuthor, setNewAuthor] = useState<string>("");
  const [newTotalPages, setNewTotalPages] = useState<string>("");
  const [newStartPage, setNewStartPage] = useState<string>("0");
  const [submittingBook, setSubmittingBook] = useState<boolean>(false);

  // Load books & today's logs
  useEffect(() => {
    async function loadData() {
      if (!selectedDate) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch user books
        const { data: booksData } = await supabase
          .from("reading_books")
          .select("*")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        const userBooks = (booksData || []) as ReadingBook[];
        setBooks(userBooks);

        // Pick active reading book
        const reading = userBooks.find((b) => b.status === "reading") || userBooks[0] || null;
        setActiveBook(reading);

        // 2. Fetch logs for selectedDate
        const { data: logsData } = await supabase
          .from("reading_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("logged_date", selectedDate)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        setTodayLogs((logsData || []) as ReadingLog[]);
      } catch (err) {
        console.warn("Reading data load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedDate]);

  // Submit reading session log
  const handleSaveLog = async () => {
    setLogError(null);
    const pages = Number(logPages);
    const mins = logMinutes.trim() ? Number(logMinutes) : null;

    const validation = validateReadingLog(pages, mins);
    if (!validation.valid) {
      setLogError(validation.error || "Invalid input");
      return;
    }

    setSubmittingLog(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        user_id: user.id,
        book_id: activeBook?.id || null,
        logged_date: selectedDate,
        pages_read: pages,
        duration_minutes: mins,
        notes: logNotes.trim() || null,
      };

      const { data, error } = await supabase
        .from("reading_logs")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Update active book current_page
      if (activeBook) {
        const nextCurrent = activeBook.current_page + pages;
        const nextStatus =
          activeBook.total_pages && nextCurrent >= activeBook.total_pages
            ? "completed"
            : activeBook.status;

        await supabase
          .from("reading_books")
          .update({ current_page: nextCurrent, status: nextStatus })
          .eq("id", activeBook.id);

        setActiveBook({ ...activeBook, current_page: nextCurrent, status: nextStatus });
      }

      setTodayLogs([data as ReadingLog, ...todayLogs]);
      setIsLogModalOpen(false);
      setLogPages("");
      setLogMinutes("");
      setLogNotes("");
      if (onReadingUpdated) onReadingUpdated();
    } catch (err: any) {
      setLogError(err.message || "Failed to save reading session");
    } finally {
      setSubmittingLog(false);
    }
  };

  // Create new book
  const handleCreateBook = async () => {
    if (!newTitle.trim()) return;
    setSubmittingBook(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        user_id: user.id,
        title: newTitle.trim(),
        author: newAuthor.trim() || null,
        total_pages: newTotalPages.trim() ? Number(newTotalPages) : null,
        current_page: newStartPage.trim() ? Number(newStartPage) : 0,
        status: "reading",
      };

      const { data, error } = await supabase
        .from("reading_books")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const created = data as ReadingBook;
      setBooks([created, ...books]);
      setActiveBook(created);
      setIsNewBookModalOpen(false);
      setNewTitle("");
      setNewAuthor("");
      setNewTotalPages("");
      setNewStartPage("0");
      if (onReadingUpdated) onReadingUpdated();
    } catch (err) {
      console.warn("Failed to create book:", err);
    } finally {
      setSubmittingBook(false);
    }
  };

  const totalPagesToday = todayLogs.reduce((acc, l) => acc + l.pages_read, 0);
  const totalMinutesToday = todayLogs.reduce((acc, l) => acc + (l.duration_minutes || 0), 0);
  const progress = activeBook ? calculateBookProgress(activeBook) : null;

  return (
    <div className="space-y-6 font-mono">
      {/* 12-Column Grid matching Stitch Screenshot 4 (Mind - Reading Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Current Active Reading & Recent Entries */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Book Card */}
          <div className="bg-surface-container-lowest rounded-[20px] p-6 lg:p-8 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium">
                {locale === "ar" ? "الكتاب الحالي قيد القراءة" : "Current active reading"}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600">
                {progress ? `${progress.percentComplete}% complete` : "27% complete"}
              </span>
            </div>

            {loading ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-on-surface tracking-tight">
                    {activeBook ? activeBook.title : "Deep Work"}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {activeBook?.author ? activeBook.author : "Cal Newport"}
                  </p>
                </div>

                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-3xl font-extrabold text-on-surface">
                    {activeBook ? `Page ${activeBook.current_page}` : "Page 127"}
                  </span>
                  <span className="text-xs text-text-muted">
                    {activeBook ? `of ${activeBook.total_pages}` : "of 340"}
                  </span>
                  <span className="text-xs text-text-muted ml-auto font-medium">
                    {activeBook && activeBook.total_pages
                      ? `${Math.max(0, activeBook.total_pages - activeBook.current_page)} pages remaining`
                      : "213 pages remaining"}
                  </span>
                </div>

                {/* Flat Progress Bar */}
                <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${progress ? progress.percentComplete : 37}%`,
                    }}
                  />
                </div>

                <p className="text-xs text-text-muted">
                  {locale === "ar"
                    ? "بمعدل ١٢ صفحة يوميًا، هتخلصه تقريبًا يوم ٣ نوفمبر"
                    : "About 12 pages a day, finish around Nov 3"}
                </p>

                {/* Actions Row */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setIsLogModalOpen(true)}
                    className="px-5 py-2 rounded-xl bg-primary-ink text-on-primary font-bold text-xs hover:brightness-110 cursor-pointer transition-all shadow-xs"
                  >
                    {locale === "ar" ? "تسجيل صفحات" : "Log pages"}
                  </button>
                  <button
                    onClick={() => setIsNewBookModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface font-semibold text-xs hover:bg-surface-container cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <span>{locale === "ar" ? "تغيير / إضافة كتاب" : "View notes"}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recent Reading Entries Card */}
          <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>{locale === "ar" ? "جلسات القراءة الأخيرة" : "Recent reading entries"}</span>
              </h4>
              <span className="text-[11px] text-text-muted">
                {locale === "ar" ? "آخر 7 أيام" : "Past 7 days"}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {todayLogs.length > 0 ? (
                todayLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-container-low border border-border-subtle text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                      <div>
                        <span className="font-semibold text-on-surface block">
                          {locale === "ar" ? "النهاردة" : "Today"}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {log.notes || (locale === "ar" ? "جلسة قراءة مركزة" : "Session finished reading")}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-on-surface">
                      {log.pages_read} {locale === "ar" ? "صفحة" : "pages"}
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-container-low border border-border-subtle text-xs">
                    <div className="flex items-center gap-2.5">
                      <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                      <div>
                        <span className="font-semibold text-on-surface block">
                          {locale === "ar" ? "النهاردة" : "Today"}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {locale === "ar" ? "جلسة صباحية 8:40 ص" : "Session finished at 8:40 AM"}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-on-surface">15 pages</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-container-low/60 border border-border-subtle/60 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Bookmark className="w-3.5 h-3.5 text-text-muted" />
                      <div>
                        <span className="font-semibold text-on-surface block">
                          {locale === "ar" ? "إمبارح" : "Yesterday"}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {locale === "ar" ? "فترة تركيز مسائية" : "Evening focus block"}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-on-surface">20 pages</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-container-low/40 border border-border-subtle/40 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Bookmark className="w-3.5 h-3.5 text-text-muted" />
                      <div>
                        <span className="font-semibold text-on-surface block">Oct 22</span>
                        <span className="text-[10px] text-text-muted">
                          {locale === "ar" ? "قراءة في المواصلات" : "Commute morning"}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-on-surface">12 pages</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-container-low/30 border border-border-subtle/30 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Bookmark className="w-3.5 h-3.5 text-text-muted" />
                      <div>
                        <span className="font-semibold text-on-surface block">Oct 21</span>
                        <span className="text-[10px] text-text-muted">
                          {locale === "ar" ? "جلسة بعد الظهر" : "Afternoon session"}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-on-surface">18 pages</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Activity Heatmap & Queue */}
        <div className="lg:col-span-4 space-y-6">
          {/* Activity Heatmap Card */}
          <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  {locale === "ar" ? "خريطة النشاط" : "Activity heatmap"}
                </h4>
                <p className="text-[10px] text-text-muted">
                  {locale === "ar" ? "الصفحات اليومية لآخر 5 أسابيع" : "Daily pages over the last 5 weeks"}
                </p>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            </div>

            {/* Top stats row */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border-subtle">
              <div>
                <span className="text-xl font-bold text-on-surface block">14 days</span>
                <span className="text-[10px] text-text-muted">
                  {locale === "ar" ? "استمرارية حالية" : "Current streak"}
                </span>
              </div>
              <div>
                <span className="text-xl font-bold text-on-surface block">14 pages/day</span>
                <span className="text-[10px] text-text-muted">
                  {locale === "ar" ? "متوسط السرعة" : "Average pace"}
                </span>
              </div>
            </div>

            {/* 7 rows x 5 cols Heatmap Grid */}
            <div className="space-y-1 pt-2">
              <div className="grid grid-cols-5 gap-1.5 text-center text-[9px] text-text-muted mb-1">
                <span>W1</span>
                <span>W2</span>
                <span>W3</span>
                <span>W4</span>
                <span>W5</span>
              </div>
              {[
                [1, 2, 3, 2, 4],
                [0, 1, 3, 3, 4],
                [2, 2, 4, 3, 4],
                [1, 0, 2, 4, 3],
                [3, 3, 3, 4, 4],
                [2, 4, 4, 4, 4],
                [0, 2, 3, 3, 2],
              ].map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-5 gap-1.5">
                  {row.map((val, cIdx) => {
                    const bgClass =
                      val === 4
                        ? "bg-blue-600"
                        : val === 3
                        ? "bg-blue-500"
                        : val === 2
                        ? "bg-blue-400"
                        : val === 1
                        ? "bg-blue-300/60"
                        : "bg-surface-container-high";
                    return (
                      <div
                        key={cIdx}
                        className={`h-4 rounded-xs transition-colors ${bgClass}`}
                        title={`Activity level: ${val}`}
                      />
                    );
                  })}
                </div>
              ))}
              <div className="flex items-center justify-between text-[10px] text-text-muted pt-2">
                <span>{locale === "ar" ? "أقل" : "Less"}</span>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-xs bg-surface-container-high" />
                  <div className="w-2.5 h-2.5 rounded-xs bg-blue-300/60" />
                  <div className="w-2.5 h-2.5 rounded-xs bg-blue-400" />
                  <div className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
                </div>
                <span>{locale === "ar" ? "أكثر" : "More"}</span>
              </div>
            </div>
          </div>

          {/* Queue Card */}
          <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                {locale === "ar" ? "قائمة الانتظار" : "Queue"}
              </h4>
              <button
                onClick={() => setIsNewBookModalOpen(true)}
                className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{locale === "ar" ? "إضافة" : "Add"}</span>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between py-2 border-b border-border-subtle/50 text-xs">
                <div>
                  <span className="font-semibold text-on-surface block">Four Thousand Weeks</span>
                  <span className="text-[10px] text-text-muted">Oliver Burkeman</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container text-text-muted font-medium">
                  Next
                </span>
              </div>
              <div className="flex items-center justify-between py-2 text-xs">
                <div>
                  <span className="font-semibold text-on-surface block">Thinking, Fast and Slow</span>
                  <span className="text-[10px] text-text-muted">Daniel Kahneman</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container text-text-muted font-medium">
                  Later
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LOG READING SESSION MODAL */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60">
          <div className="w-full max-w-md bg-surface-container rounded-3xl border border-border-subtle shadow-2xl p-6 space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-tertiary-purple" />
                <h3 className="text-sm font-bold text-on-surface">
                  {locale === "ar" ? "تسجيل جلسة قراءة" : "Log Reading Session"}
                </h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-on-surface cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {logError && (
              <div className="p-3 rounded-xl bg-crimson-alert/10 border border-crimson-alert/30 text-crimson-alert text-xs">
                {logError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "عدد الصفحات المقروءة النهاردة" : "Pages Read Today"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={logPages}
                  onChange={(e) => setLogPages(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: 25" : "e.g. 25"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple text-start"
                />
              </div>

              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "المدة بالدقائق (اختياري)" : "Duration (Minutes - Optional)"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={logMinutes}
                  onChange={(e) => setLogMinutes(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: 35" : "e.g. 35"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple text-start"
                />
              </div>

              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "ملاحظة أو أهم فكرة طلعت بيها (اختياري)" : "Key Takeaway / Notes (Optional)"}
                </label>
                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder={locale === "ar" ? "اكتب ملاحظة أو اقتباس عجبك..." : "Notes, quote, or reflection..."}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple resize-none text-start"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="px-4 py-2 rounded-xl text-text-muted hover:text-on-surface cursor-pointer"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSaveLog}
                disabled={submittingLog || !logPages.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold bg-tertiary-purple text-on-primary hover:brightness-110 cursor-pointer disabled:opacity-50"
              >
                {submittingLog ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{locale === "ar" ? "حفظ القراءة" : "Save Reading"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW BOOK MODAL */}
      {isNewBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60">
          <div className="w-full max-w-md bg-surface-container rounded-3xl border border-border-subtle shadow-2xl p-6 space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-tertiary-purple" />
                <h3 className="text-sm font-bold text-on-surface">
                  {locale === "ar" ? "إضافة كتاب لقائمة القراءة" : "Add Book to Reading List"}
                </h3>
              </div>
              <button
                onClick={() => setIsNewBookModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-on-surface cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "اسم الكتاب" : "Book Title"}
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: العادات الذرية" : "e.g. Deep Work"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple text-start"
                />
              </div>

              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "اسم الكاتب / المؤلف (اختياري)" : "Author (Optional)"}
                </label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: جيمس كلير" : "e.g. Cal Newport"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple text-start"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                    {locale === "ar" ? "إجمالي الصفحات" : "Total Pages"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newTotalPages}
                    onChange={(e) => setNewTotalPages(e.target.value)}
                    placeholder={locale === "ar" ? "300" : "e.g. 300"}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple text-start"
                  />
                </div>
                <div>
                  <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                    {locale === "ar" ? "صفحة البداية" : "Starting Page"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newStartPage}
                    onChange={(e) => setNewStartPage(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple text-start"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
              <button
                onClick={() => setIsNewBookModalOpen(false)}
                className="px-4 py-2 rounded-xl text-text-muted hover:text-on-surface cursor-pointer"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleCreateBook}
                disabled={submittingBook || !newTitle.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold bg-tertiary-purple text-on-primary hover:brightness-110 cursor-pointer disabled:opacity-50"
              >
                {submittingBook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>{locale === "ar" ? "إضافة الكتاب" : "Add Book"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
